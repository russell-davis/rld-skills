import { describe, test, expect } from "bun:test";
import { formatMessage, formatToolUse, formatToolResult } from "../src/format.ts";
import { DEFAULT_OPTIONS, type TranscriptOptions } from "../src/types.ts";
import type { UserMessage, AssistantMessage, ContentBlock } from "../src/types.ts";

const opts: TranscriptOptions = { ...DEFAULT_OPTIONS, expandSubagents: false };

const userMsg: UserMessage = {
  type: "user",
  message: { role: "user", content: "how do we handle authentication" },
  timestamp: "2026-02-20T14:32:00Z",
};

const assistantTextMsg: AssistantMessage = {
  type: "assistant",
  message: {
    role: "assistant",
    content: [{ type: "text", text: "Use OAuth2 with a client ID." }],
  },
  timestamp: "2026-02-20T14:33:00Z",
};

const assistantWithThinking: AssistantMessage = {
  type: "assistant",
  message: {
    role: "assistant",
    content: [
      { type: "thinking", thinking: "The user wants to debug a failing test. Common causes include wrong mock data." },
      { type: "text", text: "Let me look at the test output." },
    ],
  },
  timestamp: "2026-02-20T14:34:00Z",
};

const assistantWithToolUse: AssistantMessage = {
  type: "assistant",
  message: {
    role: "assistant",
    content: [
      { type: "tool_use", name: "Bash", input: { command: "ls -la" } },
      { type: "tool_use", name: "Read", input: { file_path: "/home/user/Work/foo/bar.ts" } },
      { type: "tool_use", name: "Edit", input: { file_path: "/src/index.ts" } },
      { type: "tool_use", name: "Glob", input: { pattern: "**/*.ts" } },
      { type: "tool_use", name: "Grep", input: { pattern: "TODO", path: "/src/utils" } },
      { type: "tool_use", name: "WebSearch", input: { query: "bun test runner" } },
    ],
  },
  timestamp: "2026-02-20T14:35:00Z",
};

describe("formatMessage", () => {
  test("formats user string content", () => {
    const lines = formatMessage(userMsg, opts);
    expect(lines).toEqual(["U: how do we handle authentication"]);
  });

  test("formats assistant text", () => {
    const lines = formatMessage(assistantTextMsg, opts);
    expect(lines).toEqual(["A: Use OAuth2 with a client ID."]);
  });

  test("skips thinking by default", () => {
    const lines = formatMessage(assistantWithThinking, opts);
    expect(lines).toEqual(["A: Let me look at the test output."]);
  });

  test("includes thinking when opted in", () => {
    const lines = formatMessage(assistantWithThinking, { ...opts, includeThinking: true });
    expect(lines[0]).toContain("A[think]:");
    expect(lines[0]).toContain("wrong mock data");
    expect(lines[1]).toBe("A: Let me look at the test output.");
  });

  test("truncates thinking by default", () => {
    const longThinking = "x".repeat(500);
    const msg: AssistantMessage = {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "thinking", thinking: longThinking }],
      },
    };
    const lines = formatMessage(msg, { ...opts, includeThinking: true });
    expect(lines[0]!.length).toBeLessThan(500);
    expect(lines[0]).toContain("...");
  });

  test("shows full thinking when opted in", () => {
    const longThinking = "x".repeat(500);
    const msg: AssistantMessage = {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "thinking", thinking: longThinking }],
      },
    };
    const lines = formatMessage(msg, { ...opts, includeThinking: true, fullThinking: true });
    expect(lines[0]).toContain("x".repeat(500));
  });

  test("formats tool_use with correct summaries", () => {
    const lines = formatMessage(assistantWithToolUse, opts);
    expect(lines[0]).toBe("A[Bash]: ls -la");
    expect(lines[1]).toBe("A[Read]: bar.ts");
    expect(lines[2]).toBe("A[Edit]: index.ts (edit)");
    expect(lines[3]).toBe("A[Glob]: **/*.ts");
    expect(lines[4]).toBe("A[Grep]: TODO in utils");
    expect(lines[5]).toBe("A[WebSearch]: bun test runner");
  });

  test("formats Agent tool_use as spawn when subagents disabled", () => {
    const msg: AssistantMessage = {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "tool_use", name: "Agent", input: { subagent_type: "Explore" } }],
      },
    };
    const lines = formatMessage(msg, { ...opts, expandSubagents: false });
    expect(lines[0]).toBe("A[Agent]: spawn Explore");
  });

  test("formats user tool_result with char count", () => {
    const msg: UserMessage = {
      type: "user",
      message: {
        role: "user",
        content: [{ type: "tool_result", content: "file content here", tool_use_id: "t1" } as ContentBlock],
      },
    };
    const lines = formatMessage(msg, opts);
    expect(lines[0]).toContain("17 chars");
  });

  test("formats user tool_result with content when opted in", () => {
    const msg: UserMessage = {
      type: "user",
      message: {
        role: "user",
        content: [{ type: "tool_result", content: "file content here", tool_use_id: "t1" } as ContentBlock],
      },
    };
    const lines = formatMessage(msg, { ...opts, includeToolOutput: true });
    expect(lines[0]).toContain("file content here");
  });

  test("shows error flag on tool_result", () => {
    const msg: UserMessage = {
      type: "user",
      message: {
        role: "user",
        content: [{ type: "tool_result", content: "not found", is_error: true, tool_use_id: "t1" } as ContentBlock],
      },
    };
    const lines = formatMessage(msg, opts);
    expect(lines[0]).toContain("error");
  });

  test("cleans newlines in output", () => {
    const msg: UserMessage = {
      type: "user",
      message: { role: "user", content: "line1\n\n\nline2\nline3" },
    };
    const lines = formatMessage(msg, opts);
    expect(lines[0]).not.toContain("\n");
    expect(lines[0]).toContain("↵");
  });

  test("handles assistant with string content", () => {
    const msg: AssistantMessage = {
      type: "assistant",
      message: { role: "assistant", content: "simple string response" },
    };
    const lines = formatMessage(msg, opts);
    expect(lines).toEqual(["A: simple string response"]);
  });

  test("formats user array content with text blocks", () => {
    const msg: UserMessage = {
      type: "user",
      message: {
        role: "user",
        content: [
          { type: "text", text: "First block" } as ContentBlock,
          { type: "text", text: "Second block" } as ContentBlock,
        ],
      },
    };
    const lines = formatMessage(msg, opts);
    expect(lines).toEqual(["U: First block", "U: Second block"]);
  });
});
