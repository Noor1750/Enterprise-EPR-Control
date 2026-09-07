/**
 * Safe JSON parse utility to prevent "SyntaxError: Unexpected EOF" or "Unexpected token" errors
 * across client and server environments.
 */

export function safeJsonParse<T>(input: unknown, fallback: T): T {
  if (input === null || input === undefined) {
    return fallback;
  }

  if (typeof input === 'object') {
    return input as T;
  }

  if (typeof input !== 'string') {
    return fallback;
  }

  const trimmed = input.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return fallback;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely extract and parse JSON from a Response object (fetch)
 * avoiding SyntaxError on empty, truncated, or non-JSON payloads.
 */
export async function safeResponseJson<T>(response: Response, fallback: T): Promise<T> {
  try {
    if (!response) return fallback;
    const text = await response.text();
    return safeJsonParse<T>(text, fallback);
  } catch {
    return fallback;
  }
}
