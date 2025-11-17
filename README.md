RAG System with PDF Support

An implementation of a Retrieval-Augmented Generation (RAG) system used in production ready, TypeScript, with PDF reader support, Gecko embeddings, and Gemini LLM known as integrations.

Features

PDF Processing: Automatically upload and remove text in PDF files.
Semantic Chunking: The Semantic Chunking divides the documents into intelligently sized chunks which overlap.
Gecko Embeddings: Embeddings high-quality text into Google Gecko.
FAISS Vector Store: Fast similarity search with FAISS library of Facebook.
Document Reranking:reranks are the ones that are better ranked.
Gemini LLM: Does text-based answers based on the Gemini model of Google.
TOON Serialization: Token Oriented Object Notation achieves 40-60% token efficiency in prompts to LLM.
Minimal Frontend: Web based user-friendly file upload and Q&A.
Modular Architecture: Well defined utilities that are easy to use, maintain and test.


Setup
cd RAG
npm install

Configure environment
cp .env.example .env
Make a change in env and insert GEMINIAPIKEY.


Usage

Development Mode
npm run dev

Production Mode
npm run build
npm start

The server will be initiated at localhost port 3000.

API Endpoints

POST /api/upload-pdf
Post a document in PDF format and search it.
Content-Type: multipart/form-data
Form Field: pdf (file input)
Response:
{
  "success": true,
  "filename": "document.pdf",
  "pages": 10,
  "documentsCreated": 25
}

POST /api/query
A query on the indexed documents.
Content-Type: application/json
Body:
{
  "query": "What is the main topic?"
}
Response (TSON serialized):
{
  "success": true,
  "data": {
    question: What is the major subject?
    "answer": "The main topic is...",
    "sources": [
      {
        "id": "doc-chunk-0",
        "content": "...",
        "metadata": {...}
      }
    ],
    "timestamp": "2025-11-17T..."
  }
}

GET /api/documents
Count of documents that have been indexed.
Response:
{
  "success": true,
  "documentCount": 25,
  data: In the indexing process, 25 document(s) were found.
}

POST /api/clear
Clear all indexed documents
Response:
{
  "success": true,
  "message": "All documents cleared"
}

POST /api/save
Save vector store to disk
Response:
{
  "success": true,
  message: Vector store saved to...
}

POST /api/load
Load vector store from disk
Response:
{
  "success": true,
  data: "texts: Vector store loaded from...
  "documentCount": 25
}

 How It Works

PDF Upload User uploads a PDF and it is processed to extract text.
Chunking: The text is divided into overlapping chunks (the size of the chunks 1000 chars and 200 char overlap).
Embedding: The chunks are transformed to Gecko embedding vectors.
Indexing: FAISS is used to store embeddings and search similarities.
Input: Question posed by the user which is turned into an embedding.
Retrieval: The top 10 similar chunks are retrieved in FAISS.
Reranking: Cosine similarity is used to rank back the retrieved chunks.
Generation: The 3 best chunks become context to Gemini LLM.
Answer: LLM produces a situational result that contains reference to sources.

 Utility Modules

chunking.ts
chunkText(): Divide the text into overlapping chunks.
chunkBySentences(): Chunk without breaking sentence boundaries.
chunkByParagraphs(): Chunk with paragraph structure.
chunkWithMetadata(): Metadata preservation chunk.

embeddings.ts
EmbeddingGenerator: Generating embedding.
cosineSimilarity(): Embding similarity.
euclideanDistance(): Distance based on embeddings.

vectorStore.ts
FAISSVectorStore: FAISS-based vector annexing and searching.
AddDocuments, search, save index, load index;

reranker.ts
Reranker: Reranker by relevancy.
Functions: rerank, scoreDocument, getTopDocuments.

pdfProcessor.ts
extractTextFrom PDF: Read PDF buffer text.
pdfToDocuments(): PDF file to Document objects conversion.
pdfBufferToDocuments: Use PDF buffer as Document objects.
processPDFFiles(): Process many PDFs.

ragSystem.ts
RAGSystem: Central RAG coordinator.
Methods: index Documents, query, save- Vector store, load- Vector store.

 Configuration

Make changes to the RAG system in src/server.ts:

const ragSystem = RAGSystem(new RAGSystem,{
  geminiApiKey: apiKey,
  embeddingModel: 'text-embedding-004',  // Gecko model
  llmModel: 'gemini-2.0-flash-exp',  // Gemini model
  topK: 10,                               // Number of initial retrievals.
  rerankTopK: 3,                          // Reranked results
});

 Customization

Adjust Chunk Size
On src/server.ts, make changes to the pdfBufferToDocuments call:
const documents = await pdfbufferToDocuments(
  req.file.buffer,
  req.file.originalname,
  2000,  // chunk size (chars)
  400    // overlap (chars)
);

Change Reranking Count
Change rerankTopK in src/server.ts:
rerankTopK: 5,  // Return top 5 rather than 3



