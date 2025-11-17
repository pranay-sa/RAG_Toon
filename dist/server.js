"use strict";
/**
 * Express Server with TSON Serialization
 * API endpoints for RAG system with PDF support
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const toon_1 = require("@toon-format/toon");
const dotenv_1 = __importDefault(require("dotenv"));
const ragSystem_1 = require("./utils/ragSystem");
const pdfProcessor_1 = require("./utils/pdfProcessor");
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Create uploads directory
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});
// Middleware
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.use(express_1.default.json());
// Custom middleware for TSON parsing
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});
// Initialize RAG system
let ragSystem;
try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    ragSystem = new ragSystem_1.RAGSystem({
        geminiApiKey: apiKey,
        embeddingModel: 'text-embedding-004',
        llmModel: 'gemini-2.0-flash-exp',
        topK: 10,
        rerankTopK: 3,
    });
    console.log('✓ RAG System initialized successfully');
}
catch (error) {
    console.error('✗ Failed to initialize RAG System:', error);
    process.exit(1);
}
// ============================================================================
// ROUTES
// ============================================================================
/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        documentCount: ragSystem.getDocumentCount(),
    });
});
/**
 * Upload PDF and index it
 */
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file provided',
            });
        }
        console.log(`\nUploading PDF: ${req.file.originalname}`);
        // Convert PDF to documents
        const documents = await (0, pdfProcessor_1.pdfBufferToDocuments)(req.file.buffer, req.file.originalname, 1000, // chunk size
        200 // overlap
        );
        console.log(`Created ${documents.length} chunks from PDF`);
        // Index documents
        await ragSystem.indexDocuments(documents);
        const response = {
            filename: req.file.originalname,
            pages: documents[0]?.metadata?.pages || 0,
            documentsCreated: documents.length,
            success: true,
        };
        res.json(response);
    }
    catch (error) {
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
app.post('/api/query', async (req, res) => {
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
        // Encode response with TOON for LLM token optimization
        const toonEncoded = (0, toon_1.encode)(ragResponse);
        res.json({
            success: true,
            data: ragResponse,
            toon: toonEncoded, // TOON format for LLM token efficiency (40-60% reduction)
        });
    }
    catch (error) {
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
app.get('/api/documents', (req, res) => {
    try {
        const count = ragSystem.getDocumentCount();
        res.json({
            success: true,
            documentCount: count,
            message: `${count} document(s) currently indexed`,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to retrieve documents',
        });
    }
});
/**
 * Clear all indexed documents
 */
app.post('/api/clear', (req, res) => {
    try {
        ragSystem.clear();
        res.json({
            success: true,
            message: 'All documents cleared',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to clear documents',
        });
    }
});
/**
 * Save vector store to disk
 */
app.post('/api/save', (req, res) => {
    try {
        const filepath = path_1.default.join(__dirname, '..', 'faiss_index');
        ragSystem.saveVectorStore(filepath);
        res.json({
            success: true,
            message: `Vector store saved to ${filepath}`,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to save vector store',
        });
    }
});
/**
 * Load vector store from disk
 */
app.post('/api/load', (req, res) => {
    try {
        const filepath = path_1.default.join(__dirname, '..', 'faiss_index');
        ragSystem.loadVectorStore(filepath);
        res.json({
            success: true,
            message: `Vector store loaded from ${filepath}`,
            documentCount: ragSystem.getDocumentCount(),
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to load vector store',
        });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});
// 404 handler
app.use((req, res) => {
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
exports.default = app;
