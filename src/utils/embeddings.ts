/**
 * Embedding Generation using Gecko Model
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export class EmbeddingGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string = 'text-embedding-004';
  private dimension: number = 768;

  constructor(apiKey: string, modelName?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: modelName || this.modelName 
    });
    if (modelName) {
      this.modelName = modelName;
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const result = await this.model.embedContent(text.trim());
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('Invalid embedding response format');
      }

      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    try {
      const embeddings = await Promise.all(
        texts.map(text => this.generateEmbedding(text))
      );
      return embeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Get model dimension
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Validate embedding dimension
   */
  validateEmbedding(embedding: number[]): boolean {
    return Array.isArray(embedding) && embedding.length === this.dimension;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate Euclidean distance between two embeddings
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  const sumSquaredDiff = a.reduce((sum, val, i) => {
    const diff = val - b[i];
    return sum + diff * diff;
  }, 0);

  return Math.sqrt(sumSquaredDiff);
}
