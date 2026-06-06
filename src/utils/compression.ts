import LZString from 'lz-string';

/**
 * Compresses any JSON-serializable object into a URI-safe compressed string.
 */
export function compressBundle(data: unknown): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decompresses a URI-safe compressed string back into its original object style.
 */
export function decompressBundle<T>(compressed: string): T | null {
  if (!compressed || compressed.trim() === '') return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed.trim());
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to decompress bundle:', error);
    return null;
  }
}
