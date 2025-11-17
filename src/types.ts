/**
 * Type definitions for RAG System
 */

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  document: Document;
  score: number;
}

export interface RAGResponse {
  question: string;
  answer: string;
  sources: Document[];
  timestamp: string;
}

export interface EmbeddingRequest {
  texts: string[];
}

export interface EmbeddingResponse {
  embeddings: number[][];
}

export interface IndexRequest {
  documents: Document[];
}

export interface QueryRequest {
  query: string;
}

export interface PDFUploadResponse {
  filename: string;
  pages: number;
  documentsCreated: number;
  success: boolean;
}
