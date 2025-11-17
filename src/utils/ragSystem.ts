/**
 * Core RAG System Implementation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { FAISSVectorStore } from './vectorStore.js';
import { Reranker } from './reranker.js';
import { EmbeddingGenerator } from './embeddings.js';
import { Document, RAGResponse } from '../types.js';

interface RAGConfig {
  geminiApiKey: string;
  embeddingModel?: string;
  llmModel?: string;
  topK?: number;
  rerankTopK?: number;
}

export class RAGSystem {
  private vectorStore: FAISSVectorStore;
  private reranker: Reranker;
  private embeddingGenerator: EmbeddingGenerator;
  private llmClient: GoogleGenerativeAI;
  private llmModel: any;
  private config: Required<RAGConfig>;

  constructor(config: RAGConfig) {
    const defaultConfig = {
      embeddingModel: 'text-embedding-004',
      llmModel: 'gemini-2.0-flash-exp',
      topK: 10,
      rerankTopK: 3,
    };

    this.config = { ...defaultConfig, ...config };

    // Initialize Gemini client
    this.llmClient = new GoogleGenerativeAI(this.config.geminiApiKey);
    this.llmModel = this.llmClient.getGenerativeModel({ 
      model: this.config.llmModel 
    });

    // Initialize embedding generator
    this.embeddingGenerator = new EmbeddingGenerator(
      this.config.geminiApiKey,
      this.config.embeddingModel
    );

    // Initialize vector store
    this.vectorStore = new FAISSVectorStore(
      768, // Gecko embedding dimension
      this.embeddingGenerator
    );

    // Initialize reranker
    this.reranker = new Reranker(this.embeddingGenerator);
  }

  /**
   * Index documents into the system
   */
  async indexDocuments(documents: Document[]): Promise<void> {
    if (!documents || documents.length === 0) {
      throw new Error('No documents provided');
    }
    await this.vectorStore.addDocuments(documents);
  }

  /**
   * Query the RAG system
   */
  async query(question: string): Promise<RAGResponse> {
    console.log('\n' + '='.repeat(80));
    console.log('PROCESSING QUERY:', question);
    console.log('='.repeat(80));

    try {
      // Step 1: Retrieve top K documents
      console.log('\n[1] Retrieving documents from vector store...');
      const retrievedDocs = await this.vectorStore.search(
        question,
        this.config.topK
      );
      console.log(`Retrieved ${retrievedDocs.length} documents`);

      if (retrievedDocs.length === 0) {
        throw new Error('No documents found in vector store');
      }

      // Step 2: Rerank documents
      console.log('\n[2] Reranking documents...');
      const rerankedDocs = await this.reranker.rerank(
        question,
        retrievedDocs,
        this.config.rerankTopK
      );

      // Step 3: Build context from reranked documents
      console.log('\n[3] Building context...');
      const context = rerankedDocs
        .map((doc, idx) => `[Document ${idx + 1}]\n${doc.content}`)
        .join('\n\n');

      // Step 4: Create prompt for LLM
      console.log('\n[4] Generating response with Gemini...');
      const prompt = this.buildPrompt(question, context);

      // Step 5: Generate response
      const response = await this.llmModel.generateContent(prompt);
      const textResponse = await response.response;
      const answer = textResponse.text();

      console.log('\n[5] Response generated successfully!');
      console.log('='.repeat(80) + '\n');

      return {
        question,
        answer,
        sources: rerankedDocs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  /**
   * Build prompt for the LLM
   */
  private buildPrompt(question: string, context: string): string {
    return `You are a helpful assistant that answers questions based on the provided context.

CONTEXT:
${context}

QUESTION: ${question}

INSTRUCTIONS:
- Answer the question based only on the information provided in the context above
- If the context doesn't contain enough information to answer the question, say so
- Be concise and accurate
- Cite which document(s) you used if relevant

ANSWER:`;
  }

  /**
   * Save the vector store to disk
   */
  saveVectorStore(filepath: string): void {
    this.vectorStore.saveIndex(filepath);
  }

  /**
   * Load the vector store from disk
   */
  loadVectorStore(filepath: string): void {
    this.vectorStore.loadIndex(filepath);
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.vectorStore.getDocumentCount();
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.vectorStore.clear();
  }
}
