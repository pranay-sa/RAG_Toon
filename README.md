# 🤖 RAG System with PDF Support

A production-ready Retrieval-Augmented Generation (RAG) system built with TypeScript, featuring PDF support, Gecko embeddings, and Gemini LLM integration.

## 🚀 Features

- **PDF Processing**: Upload and extract text from PDF documents automatically
- **Semantic Chunking**: Breaks down documents into intelligently-sized chunks with overlap
- **Gecko Embeddings**: Uses Google's Gecko model for high-quality text embeddings
- **FAISS Vector Store**: Efficient similarity search using Facebook's FAISS library
- **Document Reranking**: Reranks retrieved documents for better relevance
- **Gemini LLM**: Generates contextual answers using Google's Gemini model
- **TOON Serialization**: Uses Token-Oriented Object Notation for 40-60% token efficiency in LLM prompts
- **Minimal Frontend**: User-friendly web interface for file uploads and Q&A
- **Modular Architecture**: Cleanly separated utilities for easy maintenance and testing

## 📁 Project Structure

```
src/
├── index.ts                 # Main entry point and exports
├── server.ts                # Express server with TSON API
├── types.ts                 # TypeScript type definitions
└── utils/
    ├── chunking.ts          # Text chunking utilities
    ├── embeddings.ts        # Embedding generation with Gecko
    ├── vectorStore.ts       # FAISS vector store implementation
    ├── reranker.ts          # Document reranking logic
    ├── ragSystem.ts         # Core RAG system orchestration
    └── pdfProcessor.ts      # PDF extraction and processing

public/
└── index.html               # Web frontend

dist/                        # Compiled JavaScript (generated)
```

## 🛠️ Installation

### Prerequisites
- Node.js 16+ and npm
- Google API Key (get one from https://aistudio.google.com/app/apikeys)

### Setup

1. **Clone or navigate to the project directory**
```bash
cd RAG
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

4. **Build the project**
```bash
npm run build
```

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start at `http://localhost:3000`

## 📡 API Endpoints

### POST `/api/upload-pdf`
Upload a PDF file and index its content
- **Content-Type**: `multipart/form-data`
- **Form Field**: `pdf` (file input)
- **Response**:
```json
{
  "success": true,
  "filename": "document.pdf",
  "pages": 10,
  "documentsCreated": 25
}
```

### POST `/api/query`
Ask a question about the indexed documents
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "query": "What is the main topic?"
}
```
- **Response** (TSON serialized):
```json
{
  "success": true,
  "data": {
    "question": "What is the main topic?",
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
```

### GET `/api/documents`
Get count of indexed documents
- **Response**:
```json
{
  "success": true,
  "documentCount": 25,
  "message": "25 document(s) currently indexed"
}
```

### POST `/api/clear`
Clear all indexed documents
- **Response**:
```json
{
  "success": true,
  "message": "All documents cleared"
}
```

### POST `/api/save`
Save vector store to disk
- **Response**:
```json
{
  "success": true,
  "message": "Vector store saved to..."
}
```

### POST `/api/load`
Load vector store from disk
- **Response**:
```json
{
  "success": true,
  "message": "Vector store loaded from...",
  "documentCount": 25
}
```

## 🎯 How It Works

1. **PDF Upload**: User uploads a PDF which is processed to extract text
2. **Chunking**: Text is split into overlapping chunks (~1000 chars with 200 char overlap)
3. **Embedding**: Each chunk is converted to a Gecko embedding vector
4. **Indexing**: Embeddings are stored in FAISS for fast similarity search
5. **Query**: User asks a question which is converted to an embedding
6. **Retrieval**: Top 10 similar chunks are retrieved from FAISS
7. **Reranking**: Retrieved chunks are reranked using cosine similarity
8. **Generation**: Top 3 chunks are passed as context to Gemini LLM
9. **Answer**: LLM generates a contextual answer with source citations

## 📚 Utility Modules

### `chunking.ts`
- `chunkText()`: Split text into overlapping chunks
- `chunkBySentences()`: Chunk while preserving sentence boundaries
- `chunkByParagraphs()`: Chunk while preserving paragraph structure
- `chunkWithMetadata()`: Chunk with metadata preservation

### `embeddings.ts`
- `EmbeddingGenerator`: Class for generating embeddings
- `cosineSimilarity()`: Calculate similarity between embeddings
- `euclideanDistance()`: Calculate distance between embeddings

### `vectorStore.ts`
- `FAISSVectorStore`: FAISS-based vector storage and retrieval
- Methods: `addDocuments()`, `search()`, `saveIndex()`, `loadIndex()`

### `reranker.ts`
- `Reranker`: Rerank documents by relevance
- Methods: `rerank()`, `scoreDocument()`, `getTopDocuments()`

### `pdfProcessor.ts`
- `extractTextFromPDF()`: Extract text from PDF buffer
- `pdfToDocuments()`: Convert PDF file to Document objects
- `pdfBufferToDocuments()`: Convert PDF buffer to Document objects
- `processPDFFiles()`: Batch process multiple PDFs

### `ragSystem.ts`
- `RAGSystem`: Main RAG orchestrator
- Methods: `indexDocuments()`, `query()`, `saveVectorStore()`, `loadVectorStore()`

## 🧪 Configuration

Edit the RAG system configuration in `src/server.ts`:

```typescript
const ragSystem = new RAGSystem({
  geminiApiKey: apiKey,
  embeddingModel: 'text-embedding-004',  // Gecko model
  llmModel: 'gemini-2.0-flash-exp',      // Gemini model
  topK: 10,                               // Initial retrieval count
  rerankTopK: 3,                          // Reranked results
});
```

## 🔧 Customization

### Adjust Chunk Size
In `src/server.ts`, modify the `pdfBufferToDocuments` call:
```typescript
const documents = await pdfBufferToDocuments(
  req.file.buffer,
  req.file.originalname,
  2000,  // chunk size (chars)
  400    // overlap (chars)
);
```

### Change Reranking Count
Modify `rerankTopK` in `src/server.ts`:
```typescript
rerankTopK: 5,  // Return top 5 instead of 3
```

### Use Different LLM Model
Update `llmModel` in `src/server.ts`:
```typescript
llmModel: 'gemini-1.5-pro',  // Use Pro model instead
```

## 📝 Example Workflow

1. Open `http://localhost:3000` in your browser
2. Click "Choose PDF File" and select a PDF
3. Wait for processing to complete
4. Enter a question in the "Ask Questions" section
5. Click "Ask" or press Enter
6. View the answer and source documents

## 🤝 Data Format

All API responses use TSON serialization for type safety. The frontend automatically handles serialization/deserialization.

## 🐛 Troubleshooting

### "GEMINI_API_KEY not found"
- Ensure `.env` file exists and contains a valid `GEMINI_API_KEY`
- Restart the server after modifying `.env`

### "No documents indexed"
- Upload a PDF first using the web interface
- Check upload status for errors

### "Query processing slow"
- Reduce `topK` value for faster initial retrieval
- Use smaller PDF files for testing

### Build errors with dependencies
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Run `npm run build`

## 📦 Dependencies

- `@google/generative-ai`: Google's Generative AI SDK
- `faiss-node`: Facebook's FAISS for vector search
- `express`: Web framework
- `multer`: File upload handling
- `pdf-parse`: PDF text extraction
- `@toon-format/toon`: Token-Oriented Object Notation (TOON) for LLM optimization

## 📄 License

ISC

## 🎓 Learn More

- [Gemini API Documentation](https://ai.google.dev/)
- [FAISS Documentation](https://github.com/facebookresearch/faiss)
- [Express.js Guide](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## 🚀 Next Steps

- Add support for other file formats (DOCX, TXT)
- Implement conversation history
- Add document filtering by metadata
- Implement hybrid search (BM25 + semantic)
- Add streaming responses
- Deploy to production (Vercel, Render, etc.)
