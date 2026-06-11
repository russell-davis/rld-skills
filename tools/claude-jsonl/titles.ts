import { basename, dirname } from "node:path";
import type { JsonlRecord, AiTitleRecord } from "./types.ts";

export function lastAiTitle(records: JsonlRecord[]): string | null {
  let last: string | null = null;
  for (const record of records) {
    if (record.type === "ai-title") {
      last = (record as AiTitleRecord).aiTitle;
    }
  }
  return last;
}

export function fallbackTitle(filePath: string): string {
  const projectDir = basename(dirname(filePath));

  let readable = projectDir
    .replace(/^-home-rld-Work-/, "")
    .replace(/^-home-rld-/, "")
    .replace(/-/g, "/");

  if (!readable || readable === "/") {
    readable = basename(filePath).replace(/\.jsonl$/, "") || projectDir || "session";
  }

  return readable;
}

export function titleForFile(filePath: string, records: JsonlRecord[]): string {
  return lastAiTitle(records) ?? fallbackTitle(filePath);
}
