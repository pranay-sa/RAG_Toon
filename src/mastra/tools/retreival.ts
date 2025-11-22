import { createTool } from '@mastra/core/tools';
import { ModelRouterEmbeddingModel } from '@mastra/core';
import { MongoDBVector } from '@mastra/mongodb';
import { embed } from 'ai';
import { z } from 'zod';
import { encode } from '@toon-format/toon';

const embeddingModel = new ModelRouterEmbeddingModel('mistral/mistral-embed');

const store = new MongoDBVector({
  uri: process.env.MONGODB_URI!,
  dbName: process.env.MONGODB_DATABASE!,
});

export const retrievalTool = createTool({
  id: 'retrieval',
  description: 'Retrieve relevant chunks from vector DB based on a query',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    indexName: z.string().describe('Name of the collection/index'),
    topK: z.number().optional().default(5).describe('Number of results'),
    filter: z.record(z.any()).optional().describe('Metadata filter'),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      text: z.string(),
      score: z.number(),
      metadata: z.record(z.any()).optional(),
    })),
    context: z.string().describe('TOON-formatted context for LLM'),
  }),
  execute: async ({ context }) => {
    const { embedding } = await embed({
      model: embeddingModel,
      value: context.query,
    });

    const results = await store.query({
      indexName: context.indexName,
      queryVector: embedding,
      topK: context.topK,
      filter: context.filter,
    });

    const formattedResults = results.map(r => ({
      text: r.metadata?.text || '',
      score: r.score,
      metadata: r.metadata,
    }));

    // Encode context as TOON for token efficiency
    const toonContext = encode({
      chunks: formattedResults.map((r, i) => ({
        id: i + 1,
        text: r.text,
        score: Math.round(r.score * 100) / 100,
      })),
    });

    return {
      results: formattedResults,
      context: toonContext,
    };
  },
});