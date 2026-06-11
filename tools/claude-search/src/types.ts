export type { ExtractOptions as SearchOptions } from "../../claude-jsonl/types.ts";

export interface SearchMatch {
  role: "U" | "A";
  text: string;
  timestamp: string;
}

export interface SessionResult {
  filePath: string;
  matchCount: number;
  latestTimestamp: string;
  matches: SearchMatch[];
  title?: string;
}
