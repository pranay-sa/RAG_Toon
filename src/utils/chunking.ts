/**
 * Document Chunking Utilities
 * Breaks down text into smaller, manageable chunks
 */

interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 200;

/**
 * Split text into overlapping chunks
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap || DEFAULT_OVERLAP;

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Split text by sentences while respecting chunk size limits
 */
export function chunkBySentences(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap || DEFAULT_OVERLAP;

  // Split by common sentence terminators
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= chunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Split text by paragraphs first, then apply chunking
 */
export function chunkByParagraphs(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap || DEFAULT_OVERLAP;

  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + '\n\n' + paragraph).length <= chunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Chunk with metadata preservation (for PDFs)
 */
export function chunkWithMetadata(
  text: string,
  metadata: Record<string, any>,
  options: ChunkOptions = {}
): Array<{ text: string; metadata: Record<string, any> }> {
  const chunks = chunkByParagraphs(text, options);
  
  return chunks.map((chunk, index) => ({
    text: chunk,
    metadata: {
      ...metadata,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }));
}
