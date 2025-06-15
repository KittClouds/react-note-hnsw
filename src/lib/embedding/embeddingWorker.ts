
import { pipeline } from '@huggingface/transformers';

let extractor: any = null;
let isInitialized = false;

// Initialize the model
async function initModel() {
  if (isInitialized) return;
  
  try {
    extractor = await pipeline(
      'feature-extraction',
      'Snowflake/snowflake-arctic-embed-s',
      { 
        dtype: 'fp32',
        device: 'webgpu'
      }
    );
    isInitialized = true;
    self.postMessage({ type: 'initialized', success: true });
  } catch (error) {
    console.warn('WebGPU failed, falling back to CPU:', error);
    try {
      extractor = await pipeline(
        'feature-extraction',
        'Snowflake/snowflake-arctic-embed-s',
        { dtype: 'fp32' }
      );
      isInitialized = true;
      self.postMessage({ type: 'initialized', success: true });
    } catch (cpuError) {
      self.postMessage({ type: 'initialized', success: false, error: cpuError.message });
    }
  }
}

// L2 normalize function
function l2Normalize(v: Float32Array): Float32Array {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = 1 / Math.sqrt(norm || 1e-9);
  return v.map(x => x * norm) as Float32Array;
}

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, id, texts } = event.data;

  if (type === 'init') {
    await initModel();
    return;
  }

  if (type === 'embed') {
    if (!isInitialized) {
      self.postMessage({ 
        type: 'embed-result', 
        id, 
        success: false, 
        error: 'Model not initialized' 
      });
      return;
    }

    try {
      const tensor = await extractor(texts, { pooling: 'mean', normalize: true });
      let arr = Float32Array.from(tensor.data as Float32Array);
      tensor.dispose();

      // Apply L2 normalization
      if (texts.length === 1) {
        arr = l2Normalize(arr);
      } else {
        const dimension = arr.length / texts.length;
        const normalized = new Float32Array(arr.length);
        for (let i = 0; i < texts.length; i++) {
          const start = i * dimension;
          const end = start + dimension;
          const vector = arr.slice(start, end);
          const normalizedVector = l2Normalize(vector);
          normalized.set(normalizedVector, start);
        }
        arr = normalized;
      }

      self.postMessage({
        type: 'embed-result',
        id,
        success: true,
        embeddings: Array.from(arr),
        dimension: arr.length / texts.length
      });
    } catch (error) {
      self.postMessage({
        type: 'embed-result',
        id,
        success: false,
        error: error.message
      });
    }
  }
};
