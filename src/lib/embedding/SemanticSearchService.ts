import { Note } from '@/types/note';
import { embeddingService } from './EmbeddingService';
import { HNSW } from './hnsw';

export interface SearchResult {
  noteId: string;
  title: string;
  content: string;
  score: number;
}

interface EmbeddingData {
  id: string;
  vector: Float32Array;
  title: string;
  content: string;
  updatedAt: number;
}

class SemanticSearchService {
  private embeddings = new Map<string, EmbeddingData>();
  private hnswIndex: HNSW | null = null;
  private isInitialized = false;
  private indexNeedsRebuild = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await embeddingService.ready();
      this.loadEmbeddingsFromStorage();
      await this.loadHNSWIndexFromStorage();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize semantic search:', error);
      throw error;
    }
  }

  private loadEmbeddingsFromStorage() {
    const stored = localStorage.getItem('note-embeddings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([id, data]: [string, any]) => {
          this.embeddings.set(id, {
            ...data,
            vector: new Float32Array(data.vector)
          });
        });
      } catch (error) {
        console.warn('Failed to load embeddings from storage:', error);
      }
    }
  }

  private saveEmbeddingsToStorage() {
    const serializable: Record<string, any> = {};
    this.embeddings.forEach((value, key) => {
      serializable[key] = {
        ...value,
        vector: Array.from(value.vector)
      };
    });
    localStorage.setItem('note-embeddings', JSON.stringify(serializable));
  }

  private async loadHNSWIndexFromStorage() {
    const stored = localStorage.getItem('hnsw-index');
    if (stored && this.embeddings.size > 0) {
      try {
        const parsed = JSON.parse(stored);
        this.hnswIndex = HNSW.fromJSON(parsed);
        
        // Verify index is still valid (same number of nodes as embeddings)
        if (this.hnswIndex.nodes.size !== this.embeddings.size) {
          console.log('HNSW index size mismatch, will rebuild');
          this.indexNeedsRebuild = true;
          this.hnswIndex = null;
        }
      } catch (error) {
        console.warn('Failed to load HNSW index from storage:', error);
        this.indexNeedsRebuild = true;
      }
    } else if (this.embeddings.size > 0) {
      this.indexNeedsRebuild = true;
    }
  }

  private async saveHNSWIndexToStorage() {
    if (this.hnswIndex) {
      try {
        const serialized = this.hnswIndex.toJSON();
        localStorage.setItem('hnsw-index', JSON.stringify(serialized));
      } catch (error) {
        console.warn('Failed to save HNSW index to storage:', error);
      }
    }
  }

  private async buildHNSWIndex() {
    if (this.embeddings.size === 0) return;

    console.log('Building HNSW index for', this.embeddings.size, 'embeddings');
    
    this.hnswIndex = new HNSW(16, 200, 'cosine');
    
    const indexData: { id: number; vector: Float32Array }[] = [];
    let idCounter = 0;
    const idMapping = new Map<number, string>();
    
    this.embeddings.forEach((embedding, noteId) => {
      idMapping.set(idCounter, noteId);
      indexData.push({ id: idCounter, vector: embedding.vector });
      idCounter++;
    });
    
    await this.hnswIndex.buildIndex(indexData);
    this.indexNeedsRebuild = false;
    
    // Store the ID mapping for search results
    (this.hnswIndex as any).idMapping = idMapping;
    
    await this.saveHNSWIndexToStorage();
    console.log('HNSW index built successfully');
  }

  async syncAllNotes(notes: Note[]): Promise<number> {
    await this.initialize();
    
    const textNotes = notes.filter(note => note.type === 'note');
    const syncPromises = textNotes.map(note => this.syncNote(note));
    
    await Promise.all(syncPromises);
    this.saveEmbeddingsToStorage();
    
    // Rebuild HNSW index after bulk sync
    this.indexNeedsRebuild = true;
    await this.ensureHNSWIndex();
    
    return this.embeddings.size;
  }

  async syncNote(note: Note | { id: string; title: string; content: string; type: 'note'; updatedAt: Date }) {
    await this.initialize();
    
    const existing = this.embeddings.get(note.id);
    const noteUpdatedAt = note.updatedAt.getTime();
    
    // Skip if embedding is up to date
    if (existing && existing.updatedAt >= noteUpdatedAt) {
      return;
    }

    try {
      const text = `${note.title}\n${this.extractTextFromContent(note.content)}`;
      const result = await embeddingService.embed([text]);
      
      this.embeddings.set(note.id, {
        id: note.id,
        vector: result.embeddings,
        title: note.title,
        content: this.extractTextFromContent(note.content),
        updatedAt: noteUpdatedAt
      });

      // Mark that HNSW index needs rebuilding
      this.indexNeedsRebuild = true;

      // Save to storage immediately for single note updates
      this.saveEmbeddingsToStorage();
    } catch (error) {
      console.error(`Failed to generate embedding for note ${note.id}:`, error);
    }
  }

  private extractTextFromContent(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return this.extractTextFromTiptapDoc(parsed);
    } catch {
      return content;
    }
  }

  private extractTextFromTiptapDoc(doc: any): string {
    if (!doc.content) return '';
    
    let text = '';
    for (const node of doc.content) {
      if (node.type === 'paragraph' || node.type === 'heading') {
        if (node.content) {
          for (const textNode of node.content) {
            if (textNode.type === 'text') {
              text += textNode.text + ' ';
            }
          }
        }
      }
    }
    return text.trim();
  }

  private async ensureHNSWIndex() {
    if (!this.hnswIndex || this.indexNeedsRebuild) {
      await this.buildHNSWIndex();
    }
  }

  private fallbackLinearSearch(query: string, queryVector: Float32Array, limit: number): SearchResult[] {
    console.log('Using fallback linear search');
    const similarities: { noteId: string; score: number; title: string; content: string }[] = [];
    
    this.embeddings.forEach((embedding) => {
      const similarity = this.cosineSimilarity(queryVector, embedding.vector);
      similarities.push({
        noteId: embedding.id,
        score: similarity,
        title: embedding.title,
        content: embedding.content
      });
    });
    
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        noteId: item.noteId,
        title: item.title,
        content: item.content,
        score: item.score
      }));
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.embeddings.size === 0) {
      return [];
    }

    try {
      const result = await embeddingService.embed([query]);
      const queryVector = result.embeddings;
      
      // Ensure HNSW index is built
      await this.ensureHNSWIndex();
      
      // Use HNSW for fast search if available
      if (this.hnswIndex && this.embeddings.size > 5) {
        try {
          const idMapping = (this.hnswIndex as any).idMapping as Map<number, string>;
          const hnswResults = this.hnswIndex.searchKNN(queryVector, limit);
          
          return hnswResults.map(result => {
            const noteId = idMapping.get(result.id);
            const embedding = this.embeddings.get(noteId!);
            return {
              noteId: noteId!,
              title: embedding!.title,
              content: embedding!.content,
              score: result.score
            };
          }).filter(result => result.noteId); // Filter out any invalid results
        } catch (hnswError) {
          console.warn('HNSW search failed, falling back to linear search:', hnswError);
          return this.fallbackLinearSearch(query, queryVector, limit);
        }
      } else {
        // Use linear search for small datasets or if HNSW is not available
        return this.fallbackLinearSearch(query, queryVector, limit);
      }
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getEmbeddingCount(): number {
    return this.embeddings.size;
  }

  getIndexStatus(): { hasIndex: boolean; indexSize: number; needsRebuild: boolean } {
    return {
      hasIndex: this.hnswIndex !== null,
      indexSize: this.hnswIndex?.nodes.size || 0,
      needsRebuild: this.indexNeedsRebuild
    };
  }
}

export const semanticSearchService = new SemanticSearchService();
