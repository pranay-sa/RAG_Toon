/**
 * Vector Store Implementation with FAISS
 */

import * as FaissModule from 'faiss-node';
import * as fs from 'fs';
import { Document } from '../types.js';
import { EmbeddingGenerator } from './embeddings.js';

const FaissStore = (FaissModule as any).default || FaissModule;

export class FAISSVectorStore {
  private index: any;
  private documents: Document[] = [];
  private dimension: number;
  private embeddingGenerator: EmbeddingGenerator;

  constructor(dimension: number, embeddingGenerator: EmbeddingGenerator) {
    this.dimension = dimension;
    this.embeddingGenerator = embeddingGenerator;
    // Initialize FAISS index with IndexFlatL2 (L2 distance)
    this.index = new FaissStore.IndexFlatL2(dimension);
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!documents || documents.length === 0) {
      throw new Error('Documents array cannot be empty');
    }

    console.log(`Adding ${documents.length} documents to vector store...`);
    
    try {
      // Generate embeddings for all documents
      const texts = documents.map(doc => doc.content);
      const embeddings = await this.embeddingGenerator.generateEmbeddings(texts);

      // Add embeddings to FAISS index
      for (let i = 0; i < embeddings.length; i++) {
        if (!this.embeddingGenerator.validateEmbedding(embeddings[i])) {
          throw new Error(`Invalid embedding dimension at index ${i}`);
        }
        this.index.add(embeddings[i]);
        this.documents.push(documents[i]);
      }

      console.log(`Successfully added ${documents.length} documents`);
    } catch (error) {
      console.error('Error adding documents to vector store:', error);
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async search(query: string, topK: number): Promise<Document[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (this.documents.length === 0) {
      throw new Error('Vector store is empty');
    }

    console.log(`Searching for: "${query}"`);
    
    try {
      // Generate embedding for query
      const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query);

      // Ensure topK doesn't exceed document count
      const k = Math.min(topK, this.documents.length);

      // Search in FAISS index
      const results = this.index.search(queryEmbedding, k);
      
      // Return matched documents
      return results.labels.map((idx: number) => this.documents[idx]);
    } catch (error) {
      console.error('Error searching vector store:', error);
      throw error;
    }
  }

  /**
   * Save index to disk
   */
  saveIndex(filepath: string): void {
    try {
      this.index.write(filepath);
      fs.writeFileSync(
        filepath + '.docs.json',
        JSON.stringify(this.documents, null, 2)
      );
      console.log(`Index saved to ${filepath}`);
    } catch (error) {
      console.error('Error saving index:', error);
      throw error;
    }
  }

  /**
   * Load index from disk
   */
  loadIndex(filepath: string): void {
    try {
      this.index = FaissStore.read(filepath);
      this.documents = JSON.parse(
        fs.readFileSync(filepath + '.docs.json', 'utf-8')
      );
      console.log(`Index loaded from ${filepath}`);
    } catch (error) {
      console.error('Error loading index:', error);
      throw error;
    }
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documents.length;
  }

  /**
   * Clear the store
   */
  clear(): void {
    this.index = new FaissStore.IndexFlatL2(this.dimension);
    this.documents = [];
  }

  /**
   * Get all documents
   */
  getAllDocuments(): Document[] {
    return [...this.documents];
  }
}
