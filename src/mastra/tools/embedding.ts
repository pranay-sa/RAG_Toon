import { createTool } from '@mastra/core/tools';
import { ModelRouterEmbeddingModel } from '@mastra/core';
import { embedMany } from 'ai';
import { z } from 'zod';

const embeddingModel = new ModelRouterEmbeddingModel('mistral/mistral-embed');

export const embeddingTool = createTool({
  id: 'text-embedder',
  description: 'Generate embeddings for text chunks',
  inputSchema: z.object({
    chunks: z.array(z.object({
      text: z.string(),
      metadata: z.record(z.any()).optional(),
    })).describe('Text chunks to embed'),
  }),
  outputSchema: z.object({
    embeddings: z.array(z.object({
      text: z.string(),
      embedding: z.array(z.number()),
      metadata: z.record(z.any()).optional(),
    })),
    totalEmbeddings: z.number(),
  }),
  execute: async ({ context }) => {
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: context.chunks.map(chunk => chunk.text),
    });

    const result = context.chunks.map((chunk, i) => ({
      text: chunk.text,
      embedding: embeddings[i],
      metadata: chunk.metadata,
    }));

    return {
      embeddings: result,
      totalEmbeddings: result.length,
    };
  },
});