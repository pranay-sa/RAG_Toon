import { encode, decode } from '@toon-format/toon';

// Encode context data to TOON format before sending to LLM
export function encodeContextToToon(data: {
  results: Array<{
    text: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
}): string {
  return encode(data);
}

// Decode TOON response back to JSON if needed
export function decodeToonToJson<T>(toonString: string): T {
  return decode(toonString) as T;
}

// Format retrieval results as TOON for LLM prompt
export function formatRetrievalContext(
  results: Array<{
    text: string;
    score: number;
    metadata?: Record<string, any>;
  }>
): string {
  const contextData = {
    chunks: results.map((r, i) => ({
      id: i + 1,
      text: r.text,
      score: Math.round(r.score * 100) / 100,
    })),
  };
  
  return encode(contextData);
}