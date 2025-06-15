
import { useState, useEffect } from 'react';

interface EmbeddingData {
  id: string;
  vector: Float32Array;
  title: string;
  content: string;
  updatedAt: number;
}

export function useEmbeddings() {
  const [embeddings, setEmbeddings] = useState<Map<string, EmbeddingData>>(new Map());

  useEffect(() => {
    // Load embeddings from localStorage
    const stored = localStorage.getItem('note-embeddings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const embeddingMap = new Map();
        Object.entries(parsed).forEach(([id, data]: [string, any]) => {
          embeddingMap.set(id, {
            ...data,
            vector: new Float32Array(data.vector)
          });
        });
        setEmbeddings(embeddingMap);
      } catch (error) {
        console.warn('Failed to load embeddings:', error);
      }
    }
  }, []);

  const saveEmbeddings = (newEmbeddings: Map<string, EmbeddingData>) => {
    const serializable: Record<string, any> = {};
    newEmbeddings.forEach((value, key) => {
      serializable[key] = {
        ...value,
        vector: Array.from(value.vector)
      };
    });
    localStorage.setItem('note-embeddings', JSON.stringify(serializable));
    setEmbeddings(new Map(newEmbeddings));
  };

  return { embeddings, saveEmbeddings };
}

export function useEmbeddingCount() {
  const { embeddings } = useEmbeddings();
  return embeddings.size;
}
