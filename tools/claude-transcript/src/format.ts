import type { Message, ContentBlock } from "../../claude-jsonl/types.ts";
import type { TranscriptOptions } from "./types.ts";

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function clean(text: string): string {
  return text
    .replace(/\n\n+/g, "\n")
    .replace(/^\n+|\n+$/g, "")
    .replace(/\n/g, " ↵ ");
}

export function formatToolUse(block: ContentBlock, expandSubagents: boolean): string {
  const name = block.name || "Unknown";
  const input = (block.input as Record<string, unknown>) || {};

  let detail: string;
  switch (name) {
    case "Bash":
      detail = truncate(clean(String(input["command"] || "")), 100);
      break;
    case "Read":
      detail = String(input["file_path"] || "").split("/").pop() || "";
      break;
    case "Edit":
      detail = (String(input["file_path"] || "").split("/").pop() || "") + " (edit)";
      break;
    case "Write":
      detail = (String(input["file_path"] || "").split("/").pop() || "") + " (write)";
      break;
    case "Glob":
      detail = String(input["pattern"] || "");
      break;
    case "Grep":
      detail = String(input["pattern"] || "") + " in " + (String(input["path"] || ".").split("/").pop() || ".");
      break;
    case "Task":
    case "Agent":
      if (expandSubagents) {
        detail = `__SUBAGENT_USE:${String(input["subagent_type"] || "agent")}__`;
      } else {
        detail = "spawn " + String(input["subagent_type"] || "agent");
      }
      break;
    case "WebFetch":
      detail = truncate(String(input["url"] || ""), 60);
      break;
    case "WebSearch":
      detail = String(input["query"] || "");
      break;
    default:
      detail = Object.keys(input).join(", ");
  }

  return `A[${name}]: ${detail}`;
}

export function formatToolResult(
  block: ContentBlock,
  opts: TranscriptOptions,
): string | null {
  const content = block.content;
  const errorPrefix = block.is_error ? "ERROR: " : "";

  if (typeof content === "string") {
    if (opts.includeToolOutput) {
      return `  → ${errorPrefix}${truncate(clean(content), opts.maxToolOutputChars)}`;
    }
    const suffix = block.is_error ? ", error" : "";
    return `  → (${content.length} chars${suffix})`;
  }

  if (Array.isArray(content)) {
    const agentLine = (content as ContentBlock[]).find(
      (b) => b.type === "text" && b.text && /^agentId: [a-f0-9]+/.test(b.text as string),
    );
    if (agentLine?.text && opts.expandSubagents) {
      const match = (agentLine.text as string).match(/agentId: ([a-f0-9]+)/);
      if (match) return `__SUBAGENT_RESULT:${match[1]}__`;
    }

    const text = (content as ContentBlock[])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text as string)
      .join("\n");

    if (opts.includeToolOutput) {
      return `  → ${errorPrefix}${truncate(clean(text), opts.maxToolOutputChars)}`;
    }
    const suffix = block.is_error ? ", error" : "";
    return `  → (${text.length} chars${suffix})`;
  }

  return null;
}

export function formatMessage(message: Message, opts: TranscriptOptions): string[] {
  const lines: string[] = [];

  if (message.type === "user") {
    const content = message.message.content;

    if (typeof content === "string") {
      lines.push(`U: ${clean(content)}`);
    } else if (Array.isArray(content)) {
      for (const block of content as ContentBlock[]) {
        if (block.type === "text" && block.text) {
          lines.push(`U: ${clean(block.text as string)}`);
        } else if (block.type === "tool_result") {
          const result = formatToolResult(block, opts);
          if (result) lines.push(result);
        }
      }
    }
    return lines;
  }

  if (message.type === "assistant") {
    const content = message.message.content;

    if (typeof content === "string") {
      lines.push(`A: ${clean(content)}`);
      return lines;
    }

    if (!Array.isArray(content)) return lines;

    for (const block of content as ContentBlock[]) {
      switch (block.type) {
        case "text":
          if (block.text) lines.push(`A: ${clean(block.text as string)}`);
          break;
        case "tool_use":
          lines.push(formatToolUse(block, opts.expandSubagents));
          break;
        case "thinking":
          if (opts.includeThinking && block.thinking) {
            const text = opts.fullThinking
              ? clean(block.thinking as string)
              : truncate(clean(block.thinking as string), opts.maxThinkingChars);
            lines.push(`A[think]: ${text}`);
          }
          break;
      }
    }
  }

  return lines;
}
