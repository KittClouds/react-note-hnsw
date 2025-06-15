
class EmbeddingService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();

  private async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('./embeddingWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event) => {
          const { type, id, success, embeddings, dimension, error } = event.data;

          if (type === 'initialized') {
            if (success) {
              this.isInitialized = true;
              resolve();
            } else {
              reject(new Error(error || 'Failed to initialize embedding model'));
            }
            return;
          }

          if (type === 'embed-result') {
            const request = this.pendingRequests.get(id);
            if (request) {
              this.pendingRequests.delete(id);
              if (success) {
                request.resolve({ embeddings: new Float32Array(embeddings), dimension });
              } else {
                request.reject(new Error(error));
              }
            }
          }
        };

        this.worker.onerror = (error) => {
          reject(error);
        };

        this.worker.postMessage({ type: 'init' });

      } catch (error) {
        reject(error);
      }
    });

    return this.initPromise;
  }

  async ready() {
    await this.init();
  }

  async embed(texts: string[]): Promise<{ embeddings: Float32Array; dimension: number }> {
    await this.ready();
    
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });
      
      this.worker.postMessage({
        type: 'embed',
        id,
        texts
      });
    });
  }

  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.initPromise = null;
    this.pendingRequests.clear();
  }
}

export const embeddingService = new EmbeddingService();
