import { describe, it, expect } from "bun:test";
import { parseSessionMeta, projectFromDir, outputFilename, readFrontmatterField } from "./parse.ts";
import { buildMarkdown } from "./write.ts";

const FAKE_PATH_PREFIX = "/home/user/.claude/projects/-home-user-Work-myproject/abc123.jsonl";

function fakePath(dirName: string, sessionId = "abc123def456") {
  return `/home/user/.claude/projects/${dirName}/${sessionId}.jsonl`;
}

describe("projectFromDir", () => {
  it("converts leading-hyphen dir to path", () => {
    expect(projectFromDir("-home-user-Work-myproject")).toBe("/home/user/Work/myproject");
  });

  it("handles dirs without leading hyphen", () => {
    expect(projectFromDir("home-user")).toBe("/home/user");
  });

  it("converts double-hyphen (hidden dir) to /.", () => {
    expect(projectFromDir("-home-user--dotconfig")).toBe("/home/user/.dotconfig");
  });
});

describe("outputFilename", () => {
  it("produces date_first8.md", () => {
    expect(outputFilename("2026-06-11", "abc123def456xyz")).toBe("2026-06-11_abc123de.md");
  });

  it("handles short session ids", () => {
    expect(outputFilename("2026-01-01", "ab")).toBe("2026-01-01_ab.md");
  });
});

describe("readFrontmatterField", () => {
  const fm = `---\nsession: abc\nproject: /home/user\ndate: 2026-06-11\nlast: 2026-06-11T10:00:00.000Z\nturns: 5\n---\n`;

  it("reads a present field", () => {
    expect(readFrontmatterField(fm, "session")).toBe("abc");
    expect(readFrontmatterField(fm, "last")).toBe("2026-06-11T10:00:00.000Z");
  });

  it("returns null for absent field", () => {
    expect(readFrontmatterField(fm, "missing")).toBeNull();
  });
});

describe("parseSessionMeta — string content", () => {
  it("counts string-content user messages", () => {
    const lines = [
      JSON.stringify({ type: "user", timestamp: "2026-06-11T10:00:00.000Z", message: { role: "user", content: "hello" } }),
      JSON.stringify({ type: "assistant", timestamp: "2026-06-11T10:00:01.000Z", message: { role: "assistant", content: [{ type: "text", text: "hi" }] } }),
      JSON.stringify({ type: "user", timestamp: "2026-06-11T10:00:02.000Z", message: { role: "user", content: "follow up" } }),
    ];
    const meta = parseSessionMeta(fakePath("-home-user-Work-proj"), lines);
    expect(meta).not.toBeNull();
    expect(meta!.userMessages).toBe(2);
    expect(meta!.turns).toBe(3);
  });
});

describe("parseSessionMeta — array content (the bug fix)", () => {
  it("counts text-block array user messages", () => {
    const lines = [
      JSON.stringify({
        type: "user",
        timestamp: "2026-06-11T10:00:00.000Z",
        message: { role: "user", content: [{ type: "text", text: "first question" }] },
      }),
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-06-11T10:00:01.000Z",
        message: { role: "assistant", content: [{ type: "text", text: "answer" }] },
      }),
      JSON.stringify({
        type: "user",
        timestamp: "2026-06-11T10:00:02.000Z",
        message: { role: "user", content: [{ type: "text", text: "second question" }] },
      }),
    ];
    const meta = parseSessionMeta(fakePath("-home-user-Work-proj"), lines);
    expect(meta).not.toBeNull();
    expect(meta!.userMessages).toBe(2);
  });

  it("does NOT count tool_result-only user records as user messages", () => {
    const lines = [
      JSON.stringify({
        type: "user",
        timestamp: "2026-06-11T10:00:00.000Z",
        message: {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: "abc", content: "some output" },
          ],
        },
      }),
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-06-11T10:00:01.000Z",
        message: { role: "assistant", content: [{ type: "text", text: "ok" }] },
      }),
    ];
    const meta = parseSessionMeta(fakePath("-home-user-Work-proj"), lines);
    expect(meta).toBeNull();
  });

  it("counts a mix: one text-block user + one tool_result-only user = 1", () => {
    const lines = [
      JSON.stringify({
        type: "user",
        timestamp: "2026-06-11T10:00:00.000Z",
        message: {
          role: "user",
          content: [{ type: "text", text: "real question" }],
        },
      }),
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-06-11T10:00:01.000Z",
        message: { role: "assistant", content: [{ type: "text", text: "answer" }] },
      }),
      JSON.stringify({
        type: "user",
        timestamp: "2026-06-11T10:00:02.000Z",
        message: {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "xyz", content: "tool output" }],
        },
      }),
    ];
    const meta = parseSessionMeta(fakePath("-home-user-Work-proj"), lines);
    expect(meta!.userMessages).toBe(1);
  });

  it("returns null when no valid messages", () => {
    const lines = ["not json", "", "   "];
    const meta = parseSessionMeta(fakePath("-home-user-Work-proj"), lines);
    expect(meta).toBeNull();
  });

  it("returns null when only tool_result user records (userMessages=0, < 1)", () => {
    const lines = [
      JSON.stringify({
        type: "user",
        timestamp: "2026-06-11T10:00:00.000Z",
        message: {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "abc", content: "output" }],
        },
      }),
      JSON.stringify({
        type: "user",
        timestamp: "2026-06-11T10:00:01.000Z",
        message: {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "def", content: "more output" }],
        },
      }),
    ];
    const meta = parseSessionMeta(fakePath("-home-user-Work-proj"), lines);
    expect(meta).toBeNull();
  });

  it("picks up firstTimestamp and lastTimestamp", () => {
    const lines = [
      JSON.stringify({ type: "user", timestamp: "2026-06-11T08:00:00.000Z", message: { role: "user", content: "start" } }),
      JSON.stringify({ type: "assistant", timestamp: "2026-06-11T08:00:01.000Z", message: { role: "assistant", content: "resp" } }),
      JSON.stringify({ type: "user", timestamp: "2026-06-11T09:00:00.000Z", message: { role: "user", content: "end" } }),
    ];
    const meta = parseSessionMeta(fakePath("-home-user-Work-proj"), lines);
    expect(meta!.date).toBe("2026-06-11");
    expect(meta!.lastTimestamp).toBe("2026-06-11T09:00:00.000Z");
  });

  it("ignores unknown record types for turn counting", () => {
    const lines = [
      JSON.stringify({ type: "ai-title", aiTitle: "My Session" }),
      JSON.stringify({ type: "user", timestamp: "2026-06-11T10:00:00.000Z", message: { role: "user", content: "hi" } }),
      JSON.stringify({ type: "system", subtype: "turn_duration", content: "3s" }),
      JSON.stringify({ type: "assistant", timestamp: "2026-06-11T10:00:01.000Z", message: { role: "assistant", content: "hello" } }),
      JSON.stringify({ type: "user", timestamp: "2026-06-11T10:00:02.000Z", message: { role: "user", content: [{ type: "text", text: "what?" }] } }),
    ];
    const meta = parseSessionMeta(fakePath("-home-user-Work-proj"), lines);
    expect(meta!.turns).toBe(3);
    expect(meta!.userMessages).toBe(2);
  });
});

describe("buildMarkdown", () => {
  it("produces frontmatter + header + transcript", () => {
    const meta = {
      sessionId: "abc123def456",
      project: "/home/user/Work/myproject",
      date: "2026-06-11",
      lastTimestamp: "2026-06-11T10:00:02.000Z",
      turns: 3,
      userMessages: 2,
    };
    const md = buildMarkdown(meta, "U: hi\nA: hello");
    expect(md).toContain("session: abc123def456");
    expect(md).toContain("project: /home/user/Work/myproject");
    expect(md).toContain("date: 2026-06-11");
    expect(md).toContain("last: 2026-06-11T10:00:02.000Z");
    expect(md).toContain("turns: 3");
    expect(md).toContain("# Session 2026-06-11 — /home/user/Work/myproject");
    expect(md).toContain("U: hi\nA: hello");
  });
});
