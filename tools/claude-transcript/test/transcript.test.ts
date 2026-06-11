import { describe, test, expect } from "bun:test";
import { transcribeLines } from "../src/transcript.ts";
import { DEFAULT_OPTIONS, type TranscriptOptions } from "../src/types.ts";

const opts: TranscriptOptions = { ...DEFAULT_OPTIONS, expandSubagents: false };

function userLine(content: string | object[], ts = "2026-02-20T14:00:00Z") {
  return JSON.stringify({
    type: "user",
    message: { role: "user", content },
    timestamp: ts,
    sessionId: "test",
    uuid: "u1",
    cwd: "/home/user/Work/test",
    gitBranch: "main",
  });
}

function assistantLine(blocks: object[], ts = "2026-02-20T14:00:01Z") {
  return JSON.stringify({
    type: "assistant",
    message: { role: "assistant", content: blocks },
    timestamp: ts,
    sessionId: "test",
    uuid: "a1",
  });
}

function systemLine(subtype: string, content: string) {
  return JSON.stringify({ type: "system", subtype, content, timestamp: "2026-02-20T14:00:00Z" });
}

describe("transcribeLines", () => {
  test("basic user+assistant exchange", () => {
    const lines = [
      userLine("Hello"),
      assistantLine([{ type: "text", text: "Hi there!" }]),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result).toEqual(["U: Hello", "A: Hi there!"]);
  });

  test("skips non-conversation message types", () => {
    const lines = [
      JSON.stringify({ type: "queue-operation" }),
      JSON.stringify({ type: "file-history-snapshot" }),
      JSON.stringify({ type: "summary" }),
      userLine("Real message"),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result).toEqual(["U: Real message"]);
  });

  test("skips empty and malformed lines", () => {
    const lines = [
      "",
      "  ",
      "{broken json",
      userLine("Valid"),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result).toEqual(["U: Valid"]);
  });

  test("handles tool_use and tool_result flow", () => {
    const lines = [
      userLine("Check the file"),
      assistantLine([{ type: "tool_use", name: "Read", input: { file_path: "/src/app.ts" } }]),
      JSON.stringify({
        type: "user",
        message: {
          role: "user",
          content: [{ type: "tool_result", content: "file contents", tool_use_id: "t1" }],
        },
        timestamp: "2026-02-20T14:00:02Z",
      }),
      assistantLine([{ type: "text", text: "I see the issue." }]),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result[0]).toBe("U: Check the file");
    expect(result[1]).toBe("A[Read]: app.ts");
    expect(result[2]).toContain("chars");
    expect(result[3]).toBe("A: I see the issue.");
  });

  test("multi-turn conversation", () => {
    const lines = [
      userLine("What is 2+2?"),
      assistantLine([{ type: "text", text: "4" }]),
      userLine("And 3+3?"),
      assistantLine([{ type: "text", text: "6" }]),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result).toEqual(["U: What is 2+2?", "A: 4", "U: And 3+3?", "A: 6"]);
  });

  test("empty input returns empty output", () => {
    expect(transcribeLines([], null, opts)).toEqual([]);
  });

  test("thinking included when opted in", () => {
    const lines = [
      assistantLine([
        { type: "thinking", thinking: "Let me consider this carefully." },
        { type: "text", text: "Here's my answer." },
      ]),
    ];
    const result = transcribeLines(lines, null, { ...opts, includeThinking: true });
    expect(result[0]).toContain("A[think]:");
    expect(result[1]).toBe("A: Here's my answer.");
  });

  test("renders away_summary system records", () => {
    const lines = [
      userLine("What next?"),
      systemLine("away_summary", "User stepped away. Ran deploy script. Next: verify output."),
      assistantLine([{ type: "text", text: "Deploy completed." }]),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result[0]).toBe("U: What next?");
    expect(result[1]).toContain("[recap]");
    expect(result[1]).toContain("verify output");
    expect(result[2]).toBe("A: Deploy completed.");
  });

  test("away_summary strips trailing footer suffix", () => {
    const lines = [
      systemLine("away_summary", "Ran deploy. Next: check output. (disable recaps in /config)"),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result[0]).toBe("[recap] Ran deploy. Next: check output.");
    expect(result[0]).not.toContain("disable recaps");
  });

  test("away_summary footer strip does not affect mid-sentence mention", () => {
    const lines = [
      systemLine("away_summary", "Mentioned (disable recaps in /config) mid-sentence. Done."),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result[0]).toContain("disable recaps in /config");
  });

  test("away_summary with multiline content collapses to single line", () => {
    const lines = [
      systemLine("away_summary", "First line.\nSecond line.\nThird line."),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toContain("\n");
    expect(result[0]).toContain("[recap]");
  });

  test("ignores non-away_summary system records", () => {
    const lines = [
      systemLine("turn_duration", "123"),
      userLine("Hello"),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result).toEqual(["U: Hello"]);
  });

  test("marks compacted sessions", () => {
    const compactLine = JSON.stringify({
      type: "user",
      message: { role: "user", content: "Summary of prior conversation..." },
      isCompactSummary: true,
      timestamp: "2026-02-20T14:00:00Z",
      sessionId: "test",
      uuid: "compact1",
    });
    const result = transcribeLines([compactLine, userLine("After compact")], null, opts);
    expect(result[0]).toBe("[compacted: earlier turns discarded]");
    expect(result[1]).toContain("Summary of prior");
    expect(result[2]).toBe("U: After compact");
  });

  test("marks forked sessions", () => {
    const forkedLine = JSON.stringify({
      type: "user",
      message: { role: "user", content: "First message in fork" },
      forkedFrom: "original-session-id",
      timestamp: "2026-02-20T14:00:00Z",
      sessionId: "test",
      uuid: "fork1",
    });
    const result = transcribeLines([forkedLine], null, opts);
    expect(result[0]).toBe("[forked session]");
    expect(result[1]).toContain("First message in fork");
  });

  test("marks bridge-session records", () => {
    const bridgeLine = JSON.stringify({
      type: "bridge-session",
      bridgeSessionId: "abc123",
      lastSequenceNum: 5,
    });
    const result = transcribeLines([userLine("Before bridge"), bridgeLine, userLine("After bridge")], null, opts);
    expect(result[0]).toBe("U: Before bridge");
    expect(result[1]).toBe("[forked session]");
    expect(result[2]).toBe("U: After bridge");
  });

  test("header not shown by default", () => {
    const lines = [userLine("Hello"), assistantLine([{ type: "text", text: "Hi" }])];
    const result = transcribeLines(lines, "/fake/path.jsonl", opts);
    expect(result[0]).toBe("U: Hello");
    expect(result.every((l) => !l.startsWith("Session:"))).toBe(true);
  });

  test("header shown when --header is set", () => {
    const lines = [userLine("Hello"), assistantLine([{ type: "text", text: "Hi" }])];
    const result = transcribeLines(lines, "/fake/path.jsonl", { ...opts, showHeader: true });
    expect(result[0]).toContain("Session:");
    expect(result[0]).toContain("Branch: main");
    expect(result[1]).toBe("---");
    expect(result[2]).toBe("U: Hello");
  });

  test("agent mode suppresses header even when showHeader is true", () => {
    const lines = [userLine("Hello")];
    const result = transcribeLines(lines, "/fake/path.jsonl", { ...opts, showHeader: true, agentMode: true });
    expect(result[0]).toBe("U: Hello");
    expect(result.every((l) => !l.startsWith("Session:"))).toBe(true);
  });

  test("handles array-content user messages", () => {
    const lines = [
      userLine([{ type: "text", text: "Text block content" }]),
    ];
    const result = transcribeLines(lines, null, opts);
    expect(result).toEqual(["U: Text block content"]);
  });
});
