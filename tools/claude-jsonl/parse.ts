import type { JsonlRecord, Message, ContentBlock, ExtractOptions } from "./types.ts";

const DEFAULT_OPTIONS: ExtractOptions = {
  includeToolOutput: false,
  includeThinking: false,
  userOnly: false,
  assistantOnly: false,
  caseSensitive: false,
};

export function parseLine(line: string): JsonlRecord | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line) as JsonlRecord;
  } catch {
    return null;
  }
}

export function extractText(
  message: Message,
  options: Partial<ExtractOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (message.type === "user") {
    if (opts.assistantOnly) return "";
    const content = message.message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text as string)
        .join("\n");
    }
    return "";
  }

  if (message.type === "assistant") {
    if (opts.userOnly) return "";
    const blocks = message.message.content;
    if (!Array.isArray(blocks)) return typeof blocks === "string" ? blocks : "";

    const parts: string[] = [];
    for (const block of blocks as ContentBlock[]) {
      if (block.type === "text" && block.text) {
        parts.push(block.text);
      } else if (block.type === "thinking" && opts.includeThinking && block.thinking) {
        parts.push(block.thinking);
      } else if (block.type === "tool_result" && opts.includeToolOutput) {
        parts.push(extractToolResultText(block));
      }
    }
    return parts.join("\n");
  }

  return "";
}

function extractToolResultText(block: ContentBlock): string {
  if (typeof block.content === "string") return block.content;
  if (Array.isArray(block.content)) {
    return (block.content as ContentBlock[])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text as string)
      .join("\n");
  }
  return "";
}
