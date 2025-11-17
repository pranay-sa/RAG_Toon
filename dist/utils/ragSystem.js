"use strict";
/**
 * Core RAG System Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGSystem = void 0;
const generative_ai_1 = require("@google/generative-ai");
const vectorStore_1 = require("./vectorStore");
const reranker_1 = require("./reranker");
const embeddings_1 = require("./embeddings");
class RAGSystem {
    constructor(config) {
        const defaultConfig = {
            embeddingModel: 'text-embedding-004',
            llmModel: 'gemini-2.0-flash-exp',
            topK: 10,
            rerankTopK: 3,
        };
        this.config = { ...defaultConfig, ...config };
        // Initialize Gemini client
        this.llmClient = new generative_ai_1.GoogleGenerativeAI(this.config.geminiApiKey);
        this.llmModel = this.llmClient.getGenerativeModel({
            model: this.config.llmModel
        });
        // Initialize embedding generator
        this.embeddingGenerator = new embeddings_1.EmbeddingGenerator(this.config.geminiApiKey, this.config.embeddingModel);
        // Initialize vector store
        this.vectorStore = new vectorStore_1.FAISSVectorStore(768, // Gecko embedding dimension
        this.embeddingGenerator);
        // Initialize reranker
        this.reranker = new reranker_1.Reranker(this.embeddingGenerator);
    }
    /**
     * Index documents into the system
     */
    async indexDocuments(documents) {
        if (!documents || documents.length === 0) {
            throw new Error('No documents provided');
        }
        await this.vectorStore.addDocuments(documents);
    }
    /**
     * Query the RAG system
     */
    async query(question) {
        console.log('\n' + '='.repeat(80));
        console.log('PROCESSING QUERY:', question);
        console.log('='.repeat(80));
        try {
            // Step 1: Retrieve top K documents
            console.log('\n[1] Retrieving documents from vector store...');
            const retrievedDocs = await this.vectorStore.search(question, this.config.topK);
            console.log(`Retrieved ${retrievedDocs.length} documents`);
            if (retrievedDocs.length === 0) {
                throw new Error('No documents found in vector store');
            }
            // Step 2: Rerank documents
            console.log('\n[2] Reranking documents...');
            const rerankedDocs = await this.reranker.rerank(question, retrievedDocs, this.config.rerankTopK);
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
        }
        catch (error) {
            console.error('Error processing query:', error);
            throw error;
        }
    }
    /**
     * Build prompt for the LLM
     */
    buildPrompt(question, context) {
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
    saveVectorStore(filepath) {
        this.vectorStore.saveIndex(filepath);
    }
    /**
     * Load the vector store from disk
     */
    loadVectorStore(filepath) {
        this.vectorStore.loadIndex(filepath);
    }
    /**
     * Get document count
     */
    getDocumentCount() {
        return this.vectorStore.getDocumentCount();
    }
    /**
     * Clear all documents
     */
    clear() {
        this.vectorStore.clear();
    }
}
exports.RAGSystem = RAGSystem;
