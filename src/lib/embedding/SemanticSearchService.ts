
import { Note } from '@/types/note';
import { embeddingService } from './EmbeddingService';
import { HNSW } from './hnsw';
import { vecToBlob, blobToVec } from './binaryUtils';

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

// L2 normalize a vector to unit length for vector hygiene
function l2Normalize(v: Float32Array): Float32Array {
  let norm = 0; 
  for (const x of v) norm += x * x;
  norm = 1 / Math.sqrt(norm || 1e-9);
  return v.map(x => x * norm) as Float32Array;
}

class SemanticSearchService {
  private embeddings = new Map<string, EmbeddingData>();
  private hnswIndex: HNSW | null = null;
  private isInitialized = false;
  private indexNeedsRebuild = false;
  
  // Enhanced functionality
  private noteIdToHnswId = new Map<string, number>();
  private hnswIdToNoteId = new Map<number, string>();
  private nextHnswId = 0;
  private tombstones = new Set<number>();
  private queryCache = new Map<string, Float32Array>();
  private resultsCache = new Map<string, SearchResult[]>();
  private config = {
    efSearch: 50,
    efConstruction: 200,
    cacheSize: 128
  };

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
        
        // Rebuild mappings from stored data
        this.rebuildMappings();
        
        // Verify index is still valid
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

  private rebuildMappings() {
    this.noteIdToHnswId.clear();
    this.hnswIdToNoteId.clear();
    this.nextHnswId = 0;
    
    let idCounter = 0;
    this.embeddings.forEach((_, noteId) => {
      this.noteIdToHnswId.set(noteId, idCounter);
      this.hnswIdToNoteId.set(idCounter, noteId);
      idCounter++;
    });
    this.nextHnswId = idCounter;
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
    
    this.hnswIndex = new HNSW(16, this.config.efConstruction, 'cosine');
    
    const indexData: { id: number; vector: Float32Array }[] = [];
    this.noteIdToHnswId.clear();
    this.hnswIdToNoteId.clear();
    this.nextHnswId = 0;
    
    let idCounter = 0;
    this.embeddings.forEach((embedding, noteId) => {
      this.noteIdToHnswId.set(noteId, idCounter);
      this.hnswIdToNoteId.set(idCounter, noteId);
      indexData.push({ id: idCounter, vector: l2Normalize(embedding.vector) });
      idCounter++;
    });
    this.nextHnswId = idCounter;
    
    await this.hnswIndex.buildIndex(indexData);
    this.indexNeedsRebuild = false;
    this.tombstones.clear(); // Clear tombstones after rebuild
    
    await this.saveHNSWIndexToStorage();
    console.log('HNSW index built successfully');
  }

  // Enhanced point management with tombstones
  private async addPoint(noteId: string, vector: Float32Array, title: string, content: string) {
    const existingHnswId = this.noteIdToHnswId.get(noteId);
    if (existingHnswId !== undefined) {
      // Mark old point as deleted using tombstones
      this.tombstones.add(existingHnswId);
    }

    const normalizedVector = l2Normalize(vector);
    const newHnswId = this.nextHnswId++;

    if (this.hnswIndex) {
      await this.hnswIndex.addPoint(newHnswId, normalizedVector);
    }
    
    this.noteIdToHnswId.set(noteId, newHnswId);
    this.hnswIdToNoteId.set(newHnswId, noteId);
  }

  private removePoint(noteId: string) {
    const hnswId = this.noteIdToHnswId.get(noteId);
    if (hnswId !== undefined) {
      this.tombstones.add(hnswId);
      console.log(`Added tombstone for HNSW ID ${hnswId} (Note: ${noteId})`);
    }
  }

  // Adaptive search with dynamic efSearch
  private adaptiveSearch(queryVector: Float32Array, limit: number) {
    if (!this.hnswIndex) return [];
    
    let efSearch = this.config.efSearch;
    let results = this.hnswIndex.searchKNN(queryVector, limit, efSearch);

    // Filter out tombstoned results
    results = results.filter(result => !this.tombstones.has(result.id));

    // If recall looks low, double ef and retry once
    if (results.length > 0 && (results[0].score < 0.65 || results.length < limit)) {
      efSearch *= 2;
      const retryResults = this.hnswIndex.searchKNN(queryVector, limit * 2, efSearch);
      results = retryResults.filter(result => !this.tombstones.has(result.id));
    }
    
    return results;
  }

  // Exact cosine similarity for reranking
  private exactCosine(v1: Float32Array, v2: Float32Array): number {
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
    }
    return dotProduct; // Assumes vectors are pre-normalized
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
      
      // Apply L2 normalization for vector hygiene
      const normalizedVector = l2Normalize(result.embeddings);
      
      this.embeddings.set(note.id, {
        id: note.id,
        vector: normalizedVector,
        title: note.title,
        content: this.extractTextFromContent(note.content),
        updatedAt: noteUpdatedAt
      });

      // Add to HNSW index if it exists
      if (this.hnswIndex) {
        await this.addPoint(note.id, normalizedVector, note.title, this.extractTextFromContent(note.content));
      } else {
        this.indexNeedsRebuild = true;
      }

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
      const similarity = this.exactCosine(queryVector, embedding.vector);
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

    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    try {
      // 1. Check results cache
      if (this.resultsCache.has(trimmedQuery)) {
        return this.resultsCache.get(trimmedQuery)!.slice(0, limit);
      }

      // 2. Get query vector (from cache or by embedding)
      let queryVector = this.queryCache.get(trimmedQuery);
      if (!queryVector) {
        const result = await embeddingService.embed([trimmedQuery]);
        queryVector = l2Normalize(result.embeddings);
        this.queryCache.set(trimmedQuery, queryVector);
        
        // Simple LRU cache eviction
        if (this.queryCache.size > this.config.cacheSize) {
          const firstKey = this.queryCache.keys().next().value;
          this.queryCache.delete(firstKey);
        }
      }
      
      // Ensure HNSW index is built
      await this.ensureHNSWIndex();
      
      // Use enhanced HNSW search if available
      if (this.hnswIndex && this.embeddings.size > 5) {
        try {
          // 3. Adaptive HNSW search
          const kForRerank = limit * 3; // Get more candidates for reranking
          const hnswResults = this.adaptiveSearch(queryVector, kForRerank);
          
          // 4. Exact reranking for better precision
          const rerankedResults = hnswResults.map(result => {
            const noteId = this.hnswIdToNoteId.get(result.id);
            const embedding = this.embeddings.get(noteId!);
            if (!embedding) return null;
            
            const exactScore = this.exactCosine(queryVector!, embedding.vector);
            return {
              noteId: noteId!,
              title: embedding.title,
              content: embedding.content,
              score: exactScore
            };
          }).filter(result => result !== null) as SearchResult[];
          
          // Sort by exact scores and take top results
          const finalResults = rerankedResults
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
          
          // 5. Cache results
          this.resultsCache.set(trimmedQuery, finalResults);
          if (this.resultsCache.size > this.config.cacheSize) {
            const firstKey = this.resultsCache.keys().next().value;
            this.resultsCache.delete(firstKey);
          }
          
          return finalResults;
        } catch (hnswError) {
          console.warn('HNSW search failed, falling back to linear search:', hnswError);
          return this.fallbackLinearSearch(query, queryVector, limit);
        }
      } else {
        // Use linear search for small datasets
        return this.fallbackLinearSearch(query, queryVector, limit);
      }
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
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
