import { Mastra } from '@mastra/core';

import { ragAgent } from './agents/ragAgent';
import { ingestionWorkflow, queryWorkflow } from './workflows/rag-workflow';

export const mastra = new Mastra({
  agents: {
    ragAgent,
  },
  workflows: {
    ingestionWorkflow,
    queryWorkflow,
  },
  // Increase body size limit to handle larger PDF files (50MB)
  // Note: This may need to be configured at the server level depending on Mastra version
  server: {
    bodySizeLimit: 50 * 1024 * 1024, // 50MB
  },
});