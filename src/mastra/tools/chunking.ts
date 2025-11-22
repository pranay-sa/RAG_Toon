import { createTool } from '@mastra/core/tools';
import { MDocument } from '@mastra/rag';
import { z } from 'zod';

export const chunkingTool = createTool({
  id: 'text-chunker',
  description: 'Split text into overlapping chunks for RAG processing',
  inputSchema: z.object({
    text: z.string().describe('The text to chunk'),
    maxSize: z.number().optional().default(512).describe('Max chunk size'),
    overlap: z.number().optional().default(50).describe('Overlap between chunks'),
  }),
  outputSchema: z.object({
    chunks: z.array(z.object({
      text: z.string(),
      metadata: z.record(z.any()).optional(),
    })),
    totalChunks: z.number(),
  }),
  execute: async ({ context }) => {
    const doc = MDocument.fromText(context.text);

    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: context.maxSize,
      overlap: context.overlap,
      separators: ['\n\n', '\n', '. ', ' '],
      extract: {
        metadata: true,
      },
    });

    return {
      chunks,
      totalChunks: chunks.length,
    };
  },
});