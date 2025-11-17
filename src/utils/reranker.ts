/**
 * Document Reranking Utility
 * Uses embedding similarity to rerank retrieved documents
 */

import { Document } from '../types.js';
import { EmbeddingGenerator, cosineSimilarity } from './embeddings.js';

export class Reranker {
  private embeddingGenerator: EmbeddingGenerator;

  constructor(embeddingGenerator: EmbeddingGenerator) {
    this.embeddingGenerator = embeddingGenerator;
  }

  /**
   * Rerank documents based on relevance to query
   */
  async rerank(
    query: string,
    documents: Document[],
    topK: number
  ): Promise<Document[]> {
    if (!documents || documents.length === 0) {
      return [];
    }

    if (topK >= documents.length) {
      return documents;
    }

    console.log(`Reranking ${documents.length} documents...`);

    try {
      // Generate query embedding once
      const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query);

      // Score all documents
      const scoredDocs = await Promise.all(
        documents.map(async (doc, idx) => {
          const docEmbedding = await this.embeddingGenerator.generateEmbedding(doc.content);
          const score = cosineSimilarity(queryEmbedding, docEmbedding);
          
          return { doc, score, originalIndex: idx };
        })
      );

      // Sort by score descending and take top K
      const reranked = scoredDocs
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map(item => item.doc);

      console.log(`Reranked to top ${topK} documents`);
      return reranked;
    } catch (error) {
      console.error('Error reranking documents:', error);
      throw error;
    }
  }

  /**
   * Score a single document against a query
   */
  async scoreDocument(query: string, document: Document): Promise<number> {
    try {
      const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query);
      const docEmbedding = await this.embeddingGenerator.generateEmbedding(document.content);
      return cosineSimilarity(queryEmbedding, docEmbedding);
    } catch (error) {
      console.error('Error scoring document:', error);
      throw error;
    }
  }

  /**
   * Get top K documents by score
   */
  async getTopDocuments(
    query: string,
    documents: Document[],
    topK: number
  ): Promise<Array<{ document: Document; score: number }>> {
    if (!documents || documents.length === 0) {
      return [];
    }

    try {
      const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query);

      const scoredDocs = await Promise.all(
        documents.map(async (doc) => {
          const docEmbedding = await this.embeddingGenerator.generateEmbedding(doc.content);
          const score = cosineSimilarity(queryEmbedding, docEmbedding);
          return { document: doc, score };
        })
      );

      return scoredDocs
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      console.error('Error getting top documents:', error);
      throw error;
    }
  }
}
