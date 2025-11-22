import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { retrievalTool } from '../tools/retreival';


const memory = new Memory({
  storage: new LibSQLStore({
    url: 'file:memory.db',
  }),
  options: {
    lastMessages: 10,
    semanticRecall: false,
  },
});

export const ragAgent = new Agent({
  name: 'Rag agent with ocr',
  instructions: `You are a RAG agent.

CONTEXT FORMAT:
Retrieved context is in TOON format (Token-Oriented Object Notation) for efficiency.
Example TOON:
chunks[2]{id,text,score}:
  1,Some relevant text here,0.89
  2,Another chunk of text,0.76

This means: array of 2 chunks with fields id, text, score.

INSTRUCTIONS:
- Use the retrieval tool to search for relevant context.
- Parse the TOON-formatted context to understand the retrieved chunks.
- Answer using retrieved context.
- If context doesn't contain the answer, say "No relevant information found".
- Keep responses concise.
- do not answer on your own, answer only from the retreival tool : else reply "Not found"`,
  model: 'mistral/mistral-large-latest',
  tools: {
    retrievalTool,
  },
  memory,
});