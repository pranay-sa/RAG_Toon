"use strict";
/**
 * Vector Store Implementation with FAISS
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAISSVectorStore = void 0;
const FaissModule = __importStar(require("faiss-node"));
const fs = __importStar(require("fs"));
const FaissStore = FaissModule.default || FaissModule;
class FAISSVectorStore {
    constructor(dimension, embeddingGenerator) {
        this.documents = [];
        this.dimension = dimension;
        this.embeddingGenerator = embeddingGenerator;
        // Initialize FAISS index with IndexFlatL2 (L2 distance)
        this.index = new FaissStore.IndexFlatL2(dimension);
    }
    /**
     * Add documents to the vector store
     */
    async addDocuments(documents) {
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
        }
        catch (error) {
            console.error('Error adding documents to vector store:', error);
            throw error;
        }
    }
    /**
     * Search for similar documents
     */
    async search(query, topK) {
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
            return results.labels.map((idx) => this.documents[idx]);
        }
        catch (error) {
            console.error('Error searching vector store:', error);
            throw error;
        }
    }
    /**
     * Save index to disk
     */
    saveIndex(filepath) {
        try {
            this.index.write(filepath);
            fs.writeFileSync(filepath + '.docs.json', JSON.stringify(this.documents, null, 2));
            console.log(`Index saved to ${filepath}`);
        }
        catch (error) {
            console.error('Error saving index:', error);
            throw error;
        }
    }
    /**
     * Load index from disk
     */
    loadIndex(filepath) {
        try {
            this.index = FaissStore.read(filepath);
            this.documents = JSON.parse(fs.readFileSync(filepath + '.docs.json', 'utf-8'));
            console.log(`Index loaded from ${filepath}`);
        }
        catch (error) {
            console.error('Error loading index:', error);
            throw error;
        }
    }
    /**
     * Get document count
     */
    getDocumentCount() {
        return this.documents.length;
    }
    /**
     * Clear the store
     */
    clear() {
        this.index = new FaissStore.IndexFlatL2(this.dimension);
        this.documents = [];
    }
    /**
     * Get all documents
     */
    getAllDocuments() {
        return [...this.documents];
    }
}
exports.FAISSVectorStore = FAISSVectorStore;
