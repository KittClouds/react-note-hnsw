
import { Note } from '@/types/note';
import { embeddingService } from './EmbeddingService';

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
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await embeddingService.ready();
      this.loadEmbeddingsFromStorage();
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

  async syncAllNotes(notes: Note[]): Promise<number> {
    await this.initialize();
    
    const textNotes = notes.filter(note => note.type === 'note');
    const syncPromises = textNotes.map(note => this.syncNote(note));
    
    await Promise.all(syncPromises);
    this.saveEmbeddingsToStorage();
    
    return this.embeddings.size;
  }

  private async syncNote(note: Note) {
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
}

export const semanticSearchService = new SemanticSearchService();
