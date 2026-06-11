import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseLine, extractText } from "./parse.ts";
import type { UserMessage, AssistantMessage, SystemRecord, UnknownRecord } from "./types.ts";

const fixturesDir = join(import.meta.dir, "fixtures");

function loadFixture(name: string): string[] {
  return readFileSync(join(fixturesDir, name), "utf-8")
    .split("\n")
    .filter((l) => l.trim());
}

test("parseLine: blank line returns null", () => {
  expect(parseLine("")).toBeNull();
  expect(parseLine("   ")).toBeNull();
  expect(parseLine("\t")).toBeNull();
});

test("parseLine: malformed JSON returns null", () => {
  expect(parseLine("{not valid json")).toBeNull();
  expect(parseLine("just text")).toBeNull();
  expect(parseLine("{")).toBeNull();
});

test("parseLine: valid user message", () => {
  const line = JSON.stringify({
    type: "user",
    message: { role: "user", content: "hello" },
    sessionId: "abc",
    uuid: "1",
    timestamp: "2026-01-01T00:00:00Z",
  });
  const result = parseLine(line);
  expect(result).not.toBeNull();
  expect(result!.type).toBe("user");
});

test("parseLine: ai-title record returns non-null", () => {
  const line = JSON.stringify({ type: "ai-title", aiTitle: "My Title", sessionId: "abc" });
  const result = parseLine(line);
  expect(result).not.toBeNull();
  expect(result!.type).toBe("ai-title");
});

test("parseLine: away_summary system record returns non-null with fields", () => {
  const lines = loadFixture("away-summary.jsonl");
  const result = parseLine(lines[0]!);
  expect(result).not.toBeNull();
  expect(result!.type).toBe("system");
  const sys = result as SystemRecord;
  expect(sys.subtype).toBe("away_summary");
  expect(typeof sys.content).toBe("string");
  expect(sys.content).toContain("away");
});

test("parseLine: compacted record returns non-null with fields preserved", () => {
  const lines = loadFixture("compacted.jsonl");
  const result = parseLine(lines[0]!);
  expect(result).not.toBeNull();
  expect(result!.type).toBe("user");
  const rec = result as Record<string, unknown>;
  expect(rec["isCompactSummary"]).toBe(true);
  expect(rec["compactMetadata"]).toBeDefined();
});

test("parseLine: unknown record type returns non-null with fields intact", () => {
  const lines = loadFixture("unknown-record-type.jsonl");
  const result = parseLine(lines[0]!);
  expect(result).not.toBeNull();
  const rec = result as UnknownRecord;
  expect(rec.type).toBe("queue-operation");
  const r = rec as Record<string, unknown>;
  expect(r["operationId"]).toBe("op-123");
  expect(r["payload"]).toBeDefined();
});

test("extractText: user message with string content", () => {
  const msg: UserMessage = {
    type: "user",
    message: { role: "user", content: "hello world" },
  };
  expect(extractText(msg)).toBe("hello world");
});

test("extractText: user message with ContentBlock[] content", () => {
  const lines = loadFixture("array-content-user.jsonl");
  const record = parseLine(lines[0]!) as UserMessage;
  expect(record).not.toBeNull();
  const text = extractText(record);
  expect(text).toBe("Hello\nWorld");
});

test("extractText: assistant message with text blocks", () => {
  const msg: AssistantMessage = {
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        { type: "text", text: "part one" },
        { type: "text", text: "part two" },
      ],
    },
  };
  expect(extractText(msg)).toBe("part one\npart two");
});

test("extractText: assistant thinking excluded by default", () => {
  const msg: AssistantMessage = {
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        { type: "thinking", thinking: "internal thoughts" },
        { type: "text", text: "visible" },
      ],
    },
  };
  expect(extractText(msg)).toBe("visible");
  expect(extractText(msg, { includeThinking: true })).toBe("internal thoughts\nvisible");
});

test("extractText: tool_result excluded by default, included with flag", () => {
  const msg: AssistantMessage = {
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        { type: "tool_result", tool_use_id: "t1", content: "tool output" },
        { type: "text", text: "answer" },
      ],
    },
  };
  expect(extractText(msg)).toBe("answer");
  expect(extractText(msg, { includeToolOutput: true })).toBe("tool output\nanswer");
});

test("extractText: assistantOnly skips user messages", () => {
  const msg: UserMessage = {
    type: "user",
    message: { role: "user", content: "hello" },
  };
  expect(extractText(msg, { assistantOnly: true })).toBe("");
});

test("extractText: userOnly skips assistant messages", () => {
  const msg: AssistantMessage = {
    type: "assistant",
    message: {
      role: "assistant",
      content: [{ type: "text", text: "hello" }],
    },
  };
  expect(extractText(msg, { userOnly: true })).toBe("");
});
