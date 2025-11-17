/**
 * Express Server with TOON Serialization
 * API endpoints for RAG system with PDF support
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { RAGSystem } from './utils/ragSystem.js';
import { pdfBufferToDocuments } from './utils/pdfProcessor.js';
import { Document, RAGResponse, PDFUploadResponse } from './types.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 3000;

// Create uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Middleware
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Custom middleware for TSON parsing
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Initialize RAG system
let ragSystem: RAGSystem;

try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  ragSystem = new RAGSystem({
    geminiApiKey: apiKey,
    embeddingModel: 'text-embedding-004',
    llmModel: 'gemini-2.0-flash-exp',
    topK: 10,
    rerankTopK: 3,
  });

  console.log('✓ RAG System initialized successfully');
} catch (error) {
  console.error('✗ Failed to initialize RAG System:', error);
  process.exit(1);
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    documentCount: ragSystem.getDocumentCount(),
  });
});

/**
 * Upload PDF and index it
 */
app.post('/api/upload-pdf', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file provided',
      });
    }

    console.log(`\nUploading PDF: ${req.file.originalname}`);

    // Convert PDF to documents
    const documents = await pdfBufferToDocuments(
      req.file.buffer,
      req.file.originalname,
      1000, // chunk size
      200   // overlap
    );

    console.log(`Created ${documents.length} chunks from PDF`);

    // Index documents
    await ragSystem.indexDocuments(documents);

    const response: PDFUploadResponse = {
      filename: req.file.originalname,
      pages: documents[0]?.metadata?.pages || 0,
      documentsCreated: documents.length,
      success: true,
    };

    res.json(response);
  } catch (error: any) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process PDF',
    });
  }
});

/**
 * Query endpoint using TSON serialization
 */
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a non-empty string',
      });
    }

    if (ragSystem.getDocumentCount() === 0) {
      return res.status(400).json({
        success: false,
        error: 'No documents indexed. Please upload a PDF first.',
      });
    }

    console.log(`\nQuery received: "${query}"`);

    // Process query through RAG system
    const ragResponse = await ragSystem.query(query);

    res.json({
      success: true,
      data: ragResponse,
      // Note: TOON encoding available on frontend if needed
    });
  } catch (error: any) {
    console.error('Query error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process query',
    });
  }
});

/**
 * Get indexed documents metadata
 */
app.get('/api/documents', (req: Request, res: Response) => {
  try {
    const count = ragSystem.getDocumentCount();
    res.json({
      success: true,
      documentCount: count,
      message: `${count} document(s) currently indexed`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve documents',
    });
  }
});

/**
 * Clear all indexed documents
 */
app.post('/api/clear', (req: Request, res: Response) => {
  try {
    ragSystem.clear();
    res.json({
      success: true,
      message: 'All documents cleared',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear documents',
    });
  }
});

/**
 * Save vector store to disk
 */
app.post('/api/save', (req: Request, res: Response) => {
  try {
    const filepath = path.join(__dirname, '..', 'faiss_index');
    ragSystem.saveVectorStore(filepath);
    res.json({
      success: true,
      message: `Vector store saved to ${filepath}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save vector store',
    });
  }
});

/**
 * Load vector store from disk
 */
app.post('/api/load', (req: Request, res: Response) => {
  try {
    const filepath = path.join(__dirname, '..', 'faiss_index');
    ragSystem.loadVectorStore(filepath);
    res.json({
      success: true,
      message: `Vector store loaded from ${filepath}`,
      documentCount: ragSystem.getDocumentCount(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load vector store',
    });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(port, () => {
  console.log('\n' + '='.repeat(80));
  console.log(`✓ RAG Server is running at http://localhost:${port}`);
  console.log(`✓ Frontend available at http://localhost:${port}`);
  console.log('='.repeat(80) + '\n');
});

export default app;
