"use strict";
/**
 * PDF Processing Utilities
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
exports.extractTextFromPDF = extractTextFromPDF;
exports.pdfToDocuments = pdfToDocuments;
exports.pdfBufferToDocuments = pdfBufferToDocuments;
exports.processPDFFiles = processPDFFiles;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdfParse = require('pdf-parse');
const chunking_1 = require("./chunking");
/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(pdfBuffer) {
    try {
        const data = await pdfParse(pdfBuffer);
        return {
            text: data.text,
            pages: data.numpages,
            metadata: {
                creator: data.info?.Creator || 'Unknown',
                producer: data.info?.Producer || 'Unknown',
                creationDate: data.info?.CreationDate || null,
                title: data.info?.Title || 'Untitled',
            },
        };
    }
    catch (error) {
        console.error('Error extracting PDF text:', error);
        throw new Error('Failed to extract text from PDF');
    }
}
/**
 * Convert PDF file to documents
 */
async function pdfToDocuments(filePath, chunkSize = 1000, overlap = 200) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const { text, pages, metadata } = await extractTextFromPDF(fileBuffer);
        const filename = path.basename(filePath);
        // Clean up the text
        const cleanedText = text
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        // Chunk the text with metadata
        const chunks = (0, chunking_1.chunkWithMetadata)(cleanedText, {
            source: filename,
            filePath: filePath,
            pages: pages,
            ...metadata,
        }, { chunkSize, overlap });
        // Convert chunks to documents
        const documents = chunks.map((chunk, index) => ({
            id: `${filename}-chunk-${index}`,
            content: chunk.text,
            metadata: chunk.metadata,
        }));
        return documents;
    }
    catch (error) {
        console.error('Error converting PDF to documents:', error);
        throw error;
    }
}
/**
 * Convert PDF buffer to documents
 */
async function pdfBufferToDocuments(buffer, filename, chunkSize = 1000, overlap = 200) {
    try {
        const { text, pages, metadata } = await extractTextFromPDF(buffer);
        // Clean up the text
        const cleanedText = text
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        // Chunk the text with metadata
        const chunks = (0, chunking_1.chunkWithMetadata)(cleanedText, {
            source: filename,
            pages: pages,
            ...metadata,
        }, { chunkSize, overlap });
        // Convert chunks to documents
        const documents = chunks.map((chunk, index) => ({
            id: `${filename}-chunk-${index}`,
            content: chunk.text,
            metadata: chunk.metadata,
        }));
        return documents;
    }
    catch (error) {
        console.error('Error converting PDF buffer to documents:', error);
        throw error;
    }
}
/**
 * Process multiple PDF files
 */
async function processPDFFiles(filePaths, chunkSize = 1000, overlap = 200) {
    const allDocuments = [];
    for (const filePath of filePaths) {
        try {
            console.log(`Processing: ${filePath}`);
            const documents = await pdfToDocuments(filePath, chunkSize, overlap);
            allDocuments.push(...documents);
            console.log(`✓ Processed ${documents.length} chunks from ${path.basename(filePath)}`);
        }
        catch (error) {
            console.error(`✗ Failed to process ${filePath}:`, error);
        }
    }
    return allDocuments;
}
