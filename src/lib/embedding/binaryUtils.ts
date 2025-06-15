
// Simple vector serialization utilities for localStorage persistence

export function vecToBlob(vector: Float32Array): Uint8Array {
  return new Uint8Array(vector.buffer);
}

export function blobToVec(blob: Uint8Array, dimension: number): Float32Array {
  return new Float32Array(blob.buffer);
}
