import { parseLine, extractText } from "../claude-jsonl/parse.ts";
import type { UserMessage } from "../claude-jsonl/types.ts";

export interface SessionMeta {
  sessionId: string;
  project: string;
  date: string;
  lastTimestamp: string;
  turns: number;
  userMessages: number;
}

export function projectFromDir(dirName: string): string {
  const stripped = dirName.startsWith("-") ? dirName.slice(1) : dirName;
  return "/" + stripped.replace(/-/g, "/").replace(/\/\//g, "/.");
}

export function parseSessionMeta(
  filePath: string,
  lines: string[]
): SessionMeta | null {
  const parts = filePath.split("/");
  const filename = parts[parts.length - 1]!;
  const dirName = parts[parts.length - 2]!;
  const sessionId = filename.replace(/\.jsonl$/, "");
  const project = projectFromDir(dirName);

  let firstTimestamp = "";
  let lastTimestamp = "";
  let turns = 0;
  let userMessages = 0;

  for (const line of lines) {
    const record = parseLine(line);
    if (!record) continue;

    if (record.type === "user" || record.type === "assistant") {
      turns++;
      const ts = typeof record.timestamp === "string" ? record.timestamp : undefined;
      if (ts) {
        if (!firstTimestamp) firstTimestamp = ts;
        lastTimestamp = ts;
      }
      if (record.type === "user") {
        const text = extractText(record as UserMessage).trim();
        if (text.length > 0) {
          userMessages++;
        }
      }
    }
  }

  if (!firstTimestamp || userMessages < 1) return null;

  const date = firstTimestamp.slice(0, 10);

  return { sessionId, project, date, lastTimestamp, turns, userMessages };
}

export function outputFilename(date: string, sessionId: string): string {
  return `${date}_${sessionId.slice(0, 8)}.md`;
}

export function readFrontmatterField(content: string, field: string): string | null {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match ? match[1]!.trim() : null;
}
