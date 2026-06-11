import { extractText } from "../../claude-jsonl/parse.ts";
import type { Message, ExtractOptions } from "../../claude-jsonl/types.ts";
import type { SearchMatch } from "./types.ts";

export function matchesPattern(
  text: string,
  pattern: string,
  caseSensitive: boolean
): boolean {
  if (!text || !pattern) return false;
  if (caseSensitive) return text.includes(pattern);
  return text.toLowerCase().includes(pattern.toLowerCase());
}

export function extractSnippet(
  text: string,
  pattern: string,
  maxLength = 200
): string {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  const idx = lowerText.indexOf(lowerPattern);

  if (idx === -1) return text.slice(0, maxLength);

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + pattern.length + (maxLength - 80));
  let snippet = text.slice(start, end).replace(/\n/g, " ");

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

export function messageToMatch(
  message: Message,
  pattern: string,
  options: Partial<ExtractOptions> = {}
): SearchMatch | null {
  const text = extractText(message, options);
  const caseSensitive = options.caseSensitive ?? false;

  if (!matchesPattern(text, pattern, caseSensitive)) return null;

  const role: "U" | "A" = message.type === "user" ? "U" : "A";
  const timestamp = message.timestamp ?? "";

  return {
    role,
    text: extractSnippet(text, pattern),
    timestamp,
  };
}
