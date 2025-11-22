// rag-workflow.ts
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { pdfTextExtractorTool } from '../tools/documentParsing';
import { chunkingTool } from '../tools/chunking';
import { embeddingTool } from '../tools/embedding';
import { vectorStoreTool } from '../tools/vectorDB';
import { retrievalTool } from '../tools/retreival';
import { ragAgent } from '../agents/ragAgent';

// === INGESTION STEPS ===

// Step 1: Extract text from PDF 
const pdfExtractStep = createStep({
  id: 'pdfExtractStep',
  inputSchema: z.object({
    pdfBase64: z.string(),
    indexName: z.string(),
    chunkSize: z.number().default(512),
    chunkOverlap: z.number().default(50),
  }),
  outputSchema: z.object({
    extractedText: z.string(),
    pagesCount: z.number(),
    indexName: z.string(),
    chunkSize: z.number(),
    chunkOverlap: z.number(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const result = await pdfTextExtractorTool.execute({
      context: { pdfBase64: inputData.pdfBase64 },
      runtimeContext,
    });
    
    return {
      extractedText: result.extractedText,
      pagesCount: result.pagesCount,
      indexName: inputData.indexName,
      chunkSize: inputData.chunkSize,
      chunkOverlap: inputData.chunkOverlap,
    };
  },
});

// Step 2: Chunk the text
const chunkStep = createStep({
  id: 'chunkStep',
  inputSchema: z.object({
    extractedText: z.string(),
    pagesCount: z.number(),
    indexName: z.string(),
    chunkSize: z.number(),
    chunkOverlap: z.number(),
  }),
  outputSchema: z.object({
    chunks: z.array(z.object({
      text: z.string(),
      metadata: z.record(z.string(), z.any()).optional(),
    })),
    totalChunks: z.number(),
    indexName: z.string(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const result = await chunkingTool.execute({
      context: {
        text: inputData.extractedText,
        maxSize: inputData.chunkSize,
        overlap: inputData.chunkOverlap,
      },
      runtimeContext,
    });
    
    return {
      ...result,
      indexName: inputData.indexName,
    };
  },
});

// Step 3: Generate embeddings
const embedStep = createStep({
  id: 'embedStep',
  inputSchema: z.object({
    chunks: z.array(z.object({
      text: z.string(),
      metadata: z.record(z.string(), z.any()).optional(),
    })),
    totalChunks: z.number(),
    indexName: z.string(),
  }),
  outputSchema: z.object({
    embeddings: z.array(z.object({
      text: z.string(),
      embedding: z.array(z.number()),
      metadata: z.record(z.string(), z.any()).optional(),
    })),
    totalEmbeddings: z.number(),
    indexName: z.string(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const result = await embeddingTool.execute({
      context: { chunks: inputData.chunks },
      runtimeContext,
    });
    
    return {
      ...result,
      indexName: inputData.indexName,
    };
  },
});

// Step 4: Store embeddings in vector DB
const storeStep = createStep({
  id: 'storeStep',
  inputSchema: z.object({
    embeddings: z.array(z.object({
      text: z.string(),
      embedding: z.array(z.number()),
      metadata: z.record(z.string(), z.any()).optional(),
    })),
    totalEmbeddings: z.number(),
    indexName: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    storedCount: z.number(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    return await vectorStoreTool.execute({
      context: {
        indexName: inputData.indexName,
        embeddings: inputData.embeddings,
        dimension: 1024, // Mistral embed dimension
      },
      runtimeContext,
    });
  },
});

// === QUERY STEPS ===

// Step 5: Retrieve relevant chunks
const retrieveStep = createStep({
  id: 'retrieveStep',
  inputSchema: z.object({
    query: z.string(),
    indexName: z.string(),
    topK: z.number().default(5),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      text: z.string(),
      score: z.number(),
      metadata: z.record(z.string(), z.any()).optional(),
    })),
    context: z.string(),
    query: z.string(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const result = await retrievalTool.execute({
      context: {
        query: inputData.query,
        indexName: inputData.indexName,
        topK: inputData.topK,
      },
      runtimeContext,
    });
    
    return {
      ...result,
      query: inputData.query,
    };
  },
});

// Step 6: Generate answer using RAG agent
const generateStep = createStep({
  id: 'generateStep',
  inputSchema: z.object({
    results: z.array(z.object({
      text: z.string(),
      score: z.number(),
      metadata: z.record(z.string(), z.any()).optional(),
    })),
    context: z.string(),
    query: z.string(),
  }),
  outputSchema: z.object({
    answer: z.string(),
  }),
  execute: async ({ inputData }) => {
    const response = await ragAgent.generate(
      `Context (TOON format):\n${inputData.context}\n\nQuestion: ${inputData.query}\n\nAnswer based on the context above.`
    );
    
    return { answer: response.text };
  },
});

// === WORKFLOWS ===

// Ingestion Workflow: PDF → Text → Chunks → Embeddings → Vector DB
export const ingestionWorkflow = createWorkflow({
  id: 'rag-ingestion',
  inputSchema: z.object({
    pdfBase64: z.string().describe('Base64 encoded PDF file'),
    indexName: z.string().describe('Name of the vector index to store embeddings'),
    chunkSize: z.number().default(512).describe('Size of text chunks'),
    chunkOverlap: z.number().default(50).describe('Overlap between chunks'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    storedCount: z.number(),
  }),
})
  .then(pdfExtractStep)  // Changed from ocrStep
  .then(chunkStep)
  .then(embedStep)
  .then(storeStep)
  .commit();

// Query Workflow: Query → Retrieve → Generate Answer
export const queryWorkflow = createWorkflow({
  id: 'rag-query',
  inputSchema: z.object({
    query: z.string().describe('Question to answer'),
    indexName: z.string().describe('Name of the vector index to query'),
    topK: z.number().default(5).describe('Number of relevant chunks to retrieve'),
  }),
  outputSchema: z.object({
    answer: z.string(),
  }),
})
  .then(retrieveStep)
  .then(generateStep)
  .commit();

// === HELPER FUNCTIONS ===

// Helper: Fetch PDF from URL, convert to base64, and ingest
export async function ingestPDFFromUrl(
  pdfUrl: string,
  indexName: string = 'general',
  chunkSize: number = 512,
  chunkOverlap: number = 50
) {
  // Fetch PDF
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }

  // Convert to base64
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const pdfBase64 = buffer.toString('base64');

  // Run ingestion workflow
  const result = await ingestionWorkflow.execute({
    pdfBase64,
    indexName,
    chunkSize,
    chunkOverlap,
  });

  return result;
}

// Helper: Complete RAG pipeline (ingest + query)
export async function processAndQueryPDF(
  pdfUrl: string,
  query: string,
  indexName: string = 'general'
) {
  // Step 1: Ingest PDF
  console.log('Ingesting PDF...');
  await ingestPDFFromUrl(pdfUrl, indexName);

  // Step 2: Query
  console.log('Querying...');
  const result = await queryWorkflow.execute({
    query,
    indexName,
    topK: 5,
  });

  return result;
}
