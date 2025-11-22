import { createTool } from '@mastra/core/tools';
import { MongoDBVector } from '@mastra/mongodb';
import { z } from 'zod';

const store = new MongoDBVector({
  uri: process.env.MONGODB_URI!,
  dbName: process.env.MONGODB_DATABASE!,
});

export const vectorStoreTool = createTool({
  id: 'vector-store',
  description: 'Store embeddings in MongoDB vector database',
  inputSchema: z.object({
    indexName: z.string().describe('Name of the collection/index'),
    embeddings: z.array(z.object({
      text: z.string(),
      embedding: z.array(z.number()),
      metadata: z.record(z.any()).optional(),
    })).describe('Embeddings to store'),
    dimension: z.number().optional().default(1024).describe('Vector dimension'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    storedCount: z.number(),
  }),
  execute: async ({ context }) => {
    await store.createIndex({
      indexName: context.indexName,
      dimension: context.dimension,
    });

    await store.upsert({
      indexName: context.indexName,
      vectors: context.embeddings.map(e => e.embedding),
      metadata: context.embeddings.map(e => ({ 
        text: e.text, 
        ...e.metadata 
      })),
    });

    return {
      success: true,
      storedCount: context.embeddings.length,
    };
  },
});
