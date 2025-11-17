/**
 * PDF Processing Utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { Document } from '../types.js';
import { chunkWithMetadata } from './chunking.js';

let pdfParse: any = null;

// Dynamically import pdf-parse
async function getPdfParse() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  }
  return pdfParse;
}

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<{
  text: string;
  pages: number;
  metadata: Record<string, any>;
}> {
  try {
    const pdfParseModule = await getPdfParse();
    const data = await pdfParseModule(pdfBuffer);
    
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
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Convert PDF file to documents
 */
export async function pdfToDocuments(
  filePath: string,
  chunkSize: number = 1000,
  overlap: number = 200
): Promise<Document[]> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { text, pages, metadata } = await extractTextFromPDF(fileBuffer);
    
    const filename = path.basename(filePath);
    
    // Clean up the text
    const cleanedText = text
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Chunk the text with metadata
    const chunks = chunkWithMetadata(cleanedText, {
      source: filename,
      filePath: filePath,
      pages: pages,
      ...metadata,
    }, { chunkSize, overlap });

    // Convert chunks to documents
    const documents: Document[] = chunks.map((chunk, index) => ({
      id: `${filename}-chunk-${index}`,
      content: chunk.text,
      metadata: chunk.metadata,
    }));

    return documents;
  } catch (error) {
    console.error('Error converting PDF to documents:', error);
    throw error;
  }
}

/**
 * Convert PDF buffer to documents
 */
export async function pdfBufferToDocuments(
  buffer: Buffer,
  filename: string,
  chunkSize: number = 1000,
  overlap: number = 200
): Promise<Document[]> {
  try {
    const { text, pages, metadata } = await extractTextFromPDF(buffer);

    // Clean up the text
    const cleanedText = text
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Chunk the text with metadata
    const chunks = chunkWithMetadata(cleanedText, {
      source: filename,
      pages: pages,
      ...metadata,
    }, { chunkSize, overlap });

    // Convert chunks to documents
    const documents: Document[] = chunks.map((chunk, index) => ({
      id: `${filename}-chunk-${index}`,
      content: chunk.text,
      metadata: chunk.metadata,
    }));

    return documents;
  } catch (error) {
    console.error('Error converting PDF buffer to documents:', error);
    throw error;
  }
}

/**
 * Process multiple PDF files
 */
export async function processPDFFiles(
  filePaths: string[],
  chunkSize: number = 1000,
  overlap: number = 200
): Promise<Document[]> {
  const allDocuments: Document[] = [];

  for (const filePath of filePaths) {
    try {
      console.log(`Processing: ${filePath}`);
      const documents = await pdfToDocuments(filePath, chunkSize, overlap);
      allDocuments.push(...documents);
      console.log(`✓ Processed ${documents.length} chunks from ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`✗ Failed to process ${filePath}:`, error);
    }
  }

  return allDocuments;
}
