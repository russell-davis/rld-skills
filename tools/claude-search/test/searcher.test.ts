import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractText } from "../../claude-jsonl/parse.ts";
import { matchesPattern, extractSnippet, messageToMatch } from "../src/match.ts";
import { rankResults, searchWithRipgrep } from "../src/search.ts";
import type { UserMessage, AssistantMessage } from "../../claude-jsonl/types.ts";
import type { SessionResult } from "../src/types.ts";

const userMsg: UserMessage = {
  type: "user",
  message: { role: "user", content: "how do we handle authentication for the API" },
  sessionId: "s1",
  uuid: "u1",
  timestamp: "2026-02-20T14:32:00Z",
};

const assistantMsg: AssistantMessage = {
  type: "assistant",
  message: {
    role: "assistant",
    content: [
      { type: "text", text: "The OAuth2 flow requires a client ID and secret." },
    ],
  },
  sessionId: "s1",
  uuid: "a1",
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
  sessionId: "s1",
  uuid: "a2",
  timestamp: "2026-02-20T14:34:00Z",
};

const assistantWithToolResult: AssistantMessage = {
  type: "assistant",
  message: {
    role: "assistant",
    content: [
      { type: "tool_result", tool_use_id: "t1", content: "host: localhost\nport: 5432\ndatabase: myapp_production" },
      { type: "text", text: "The database config shows PostgreSQL." },
    ],
  },
  sessionId: "s1",
  uuid: "a3",
  timestamp: "2026-02-20T14:35:00Z",
};

const userMsgArrayContent: UserMessage = {
  type: "user",
  message: {
    role: "user",
    content: [
      { type: "text", text: "Can you explain the deployment pipeline?" },
      { type: "tool_result", tool_use_id: "t2", content: "some tool output" },
    ],
  },
  sessionId: "s1",
  uuid: "u2",
  timestamp: "2026-02-20T15:00:00Z",
};

describe("extractText (via core)", () => {
  test("extracts user message content (string)", () => {
    expect(extractText(userMsg)).toBe("how do we handle authentication for the API");
  });

  test("extracts user message content (array)", () => {
    expect(extractText(userMsgArrayContent)).toBe("Can you explain the deployment pipeline?");
  });

  test("extracts assistant text blocks", () => {
    expect(extractText(assistantMsg)).toBe("The OAuth2 flow requires a client ID and secret.");
  });

  test("skips thinking blocks by default", () => {
    expect(extractText(assistantWithThinking)).toBe("Let me look at the test output.");
  });

  test("includes thinking blocks when opted in", () => {
    const text = extractText(assistantWithThinking, { includeThinking: true });
    expect(text).toContain("wrong mock data");
    expect(text).toContain("Let me look at the test output.");
  });

  test("skips tool output by default", () => {
    expect(extractText(assistantWithToolResult)).toBe("The database config shows PostgreSQL.");
  });

  test("includes tool output when opted in", () => {
    const text = extractText(assistantWithToolResult, { includeToolOutput: true });
    expect(text).toContain("localhost");
    expect(text).toContain("myapp_production");
    expect(text).toContain("The database config shows PostgreSQL.");
  });

  test("respects userOnly option", () => {
    expect(extractText(userMsg, { userOnly: true })).toBe("how do we handle authentication for the API");
    expect(extractText(assistantMsg, { userOnly: true })).toBe("");
  });

  test("respects assistantOnly option", () => {
    expect(extractText(userMsg, { assistantOnly: true })).toBe("");
    expect(extractText(assistantMsg, { assistantOnly: true })).toBe("The OAuth2 flow requires a client ID and secret.");
  });
});

describe("matchesPattern", () => {
  test("case insensitive by default", () => {
    expect(matchesPattern("Hello World", "hello", false)).toBe(true);
    expect(matchesPattern("Hello World", "WORLD", false)).toBe(true);
  });

  test("case sensitive when specified", () => {
    expect(matchesPattern("Hello World", "hello", true)).toBe(false);
    expect(matchesPattern("Hello World", "Hello", true)).toBe(true);
  });

  test("returns false for empty inputs", () => {
    expect(matchesPattern("", "test", false)).toBe(false);
    expect(matchesPattern("test", "", false)).toBe(false);
  });
});

describe("extractSnippet", () => {
  test("shows context around match", () => {
    const text = "A".repeat(100) + " authentication " + "B".repeat(100);
    const snippet = extractSnippet(text, "authentication");
    expect(snippet).toContain("authentication");
    expect(snippet.length).toBeLessThan(text.length);
  });

  test("handles match at start of text", () => {
    const snippet = extractSnippet("authentication is important", "authentication");
    expect(snippet).toStartWith("authentication");
  });

  test("replaces newlines with spaces", () => {
    const snippet = extractSnippet("line1\nline2\nauthentication\nline4", "authentication");
    expect(snippet).not.toContain("\n");
  });
});

describe("messageToMatch", () => {
  test("returns match for user message containing pattern", () => {
    const match = messageToMatch(userMsg, "authentication");
    expect(match).not.toBeNull();
    expect(match!.role).toBe("U");
    expect(match!.text).toContain("authentication");
  });

  test("returns match for assistant message containing pattern", () => {
    const match = messageToMatch(assistantMsg, "OAuth2");
    expect(match).not.toBeNull();
    expect(match!.role).toBe("A");
  });

  test("returns null when no match", () => {
    expect(messageToMatch(userMsg, "kubernetes")).toBeNull();
  });

  test("includes timestamp", () => {
    const match = messageToMatch(userMsg, "authentication");
    expect(match!.timestamp).toBe("2026-02-20T14:32:00Z");
  });
});

describe("rankResults", () => {
  test("sorts by recency first", () => {
    const results: SessionResult[] = [
      { filePath: "old.jsonl", matchCount: 5, latestTimestamp: "2026-01-01T00:00:00Z", matches: [] },
      { filePath: "new.jsonl", matchCount: 1, latestTimestamp: "2026-02-20T00:00:00Z", matches: [] },
    ];
    const ranked = rankResults(results);
    expect(ranked[0]!.filePath).toBe("new.jsonl");
  });

  test("uses match count as tiebreaker", () => {
    const results: SessionResult[] = [
      { filePath: "few.jsonl", matchCount: 1, latestTimestamp: "2026-02-20T00:00:00Z", matches: [] },
      { filePath: "many.jsonl", matchCount: 10, latestTimestamp: "2026-02-20T00:00:00Z", matches: [] },
    ];
    const ranked = rankResults(results);
    expect(ranked[0]!.filePath).toBe("many.jsonl");
  });

  test("does not mutate input array", () => {
    const results: SessionResult[] = [
      { filePath: "b.jsonl", matchCount: 1, latestTimestamp: "2026-01-01T00:00:00Z", matches: [] },
      { filePath: "a.jsonl", matchCount: 1, latestTimestamp: "2026-02-01T00:00:00Z", matches: [] },
    ];
    const original = [...results];
    rankResults(results);
    expect(results[0]!.filePath).toBe(original[0]!.filePath);
  });
});

describe("list mode and filters", () => {
  let tmpHome: string;
  let originalHome: string | undefined;

  beforeAll(async () => {
    originalHome = process.env.HOME;
    tmpHome = await mkdtemp(join(tmpdir(), "claude-search-test-"));
    process.env.HOME = tmpHome;

    const projectA = join(tmpHome, ".claude", "projects", "-home-user-projA");
    const projectB = join(tmpHome, ".claude", "projects", "-home-user-projB");
    await mkdir(projectA, { recursive: true });
    await mkdir(projectB, { recursive: true });

    const msgA1 = { ...userMsg, timestamp: "2026-02-15T10:00:00Z", gitBranch: "main" };
    const msgA2 = { ...assistantMsg, timestamp: "2026-02-15T10:01:00Z", gitBranch: "main" };
    const msgB1 = { ...userMsg, timestamp: "2026-03-01T09:00:00Z", gitBranch: "feat/search" };
    const msgC1 = { ...userMsg, timestamp: "2026-03-10T12:00:00Z", gitBranch: "fix/parser" };
    const aiTitleC = { type: "ai-title", aiTitle: "Parser fix session", sessionId: "s3" };

    const sessionA = [JSON.stringify(msgA1), JSON.stringify(msgA2)].join("\n");
    const sessionB = [JSON.stringify(msgB1)].join("\n");
    const sessionC = [JSON.stringify(msgC1), JSON.stringify(aiTitleC)].join("\n");

    await writeFile(join(projectA, "session-a.jsonl"), sessionA);
    await writeFile(join(projectA, "session-c.jsonl"), sessionC);
    await writeFile(join(projectB, "session-b.jsonl"), sessionB);
  });

  afterAll(async () => {
    if (originalHome !== undefined) process.env.HOME = originalHome;
    else delete process.env.HOME;
    await rm(tmpHome, { recursive: true, force: true });
  });

  test("lists all sessions when pattern is empty", async () => {
    const results = await searchWithRipgrep({ pattern: "", maxResults: 20, options: {} });
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.matchCount).toBe(0);
      expect(r.matches).toEqual([]);
      expect(r.latestTimestamp).not.toBe("");
    }
  });

  test("results sorted by recency", async () => {
    const results = await searchWithRipgrep({ pattern: "", maxResults: 20, options: {} });
    expect(results[0]!.filePath).toContain("session-c.jsonl");
    expect(results[1]!.filePath).toContain("session-b.jsonl");
    expect(results[2]!.filePath).toContain("session-a.jsonl");
  });

  test("respects maxResults", async () => {
    const results = await searchWithRipgrep({ pattern: "", maxResults: 2, options: {} });
    expect(results).toHaveLength(2);
  });

  test("respects projectFilter", async () => {
    const results = await searchWithRipgrep({ pattern: "", maxResults: 20, projectFilter: "projB", options: {} });
    expect(results).toHaveLength(1);
    expect(results[0]!.filePath).toContain("session-b.jsonl");
  });

  test("afterDate filters on message timestamps not mtime", async () => {
    const results = await searchWithRipgrep({
      pattern: "",
      maxResults: 20,
      afterDate: "2026-03-01",
      options: {},
    });
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.filePath).not.toContain("session-a.jsonl");
    }
  });

  test("beforeDate filters on message timestamps not mtime", async () => {
    const results = await searchWithRipgrep({
      pattern: "",
      maxResults: 20,
      beforeDate: "2026-03-05",
      options: {},
    });
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.filePath).not.toContain("session-c.jsonl");
    }
  });

  test("combined after+before yields single session (message timestamps)", async () => {
    const results = await searchWithRipgrep({
      pattern: "",
      maxResults: 20,
      afterDate: "2026-02-20",
      beforeDate: "2026-03-05",
      options: {},
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.filePath).toContain("session-b.jsonl");
  });

  test("branchFilter matches sessions with that gitBranch", async () => {
    const results = await searchWithRipgrep({
      pattern: "",
      maxResults: 20,
      branchFilter: "feat/search",
      options: {},
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.filePath).toContain("session-b.jsonl");
  });

  test("branchFilter returns nothing when no session has that branch", async () => {
    const results = await searchWithRipgrep({
      pattern: "",
      maxResults: 20,
      branchFilter: "nonexistent-branch",
      options: {},
    });
    expect(results).toHaveLength(0);
  });

  test("branchFilter works with main branch across multiple sessions", async () => {
    const results = await searchWithRipgrep({
      pattern: "",
      maxResults: 20,
      branchFilter: "main",
      options: {},
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.filePath).toContain("session-a.jsonl");
  });

  test("title from ai-title record is included in result", async () => {
    const results = await searchWithRipgrep({ pattern: "", maxResults: 20, options: {} });
    const sessionC = results.find((r) => r.filePath.includes("session-c.jsonl"));
    expect(sessionC).toBeDefined();
    expect(sessionC!.title).toBe("Parser fix session");
  });

  test("filepath-derived fallback title when no ai-title", async () => {
    const results = await searchWithRipgrep({ pattern: "", maxResults: 20, options: {} });
    const sessionB = results.find((r) => r.filePath.includes("session-b.jsonl"));
    expect(sessionB).toBeDefined();
    expect(sessionB!.title).toBeTruthy();
    expect(typeof sessionB!.title).toBe("string");
  });

  test("filePath is first whitespace token in list output", async () => {
    const results = await searchWithRipgrep({ pattern: "", maxResults: 20, options: {} });
    for (const r of results) {
      const date = r.latestTimestamp.slice(0, 10);
      const line = r.title
        ? `${r.filePath}  (${date})  ${r.title}`
        : `${r.filePath}  (${date})`;
      const firstToken = line.split(/\s+/)[0];
      expect(firstToken).toBe(r.filePath);
    }
  });

  test("agent mode list output has filePath as first tab-delimited token", async () => {
    const results = await searchWithRipgrep({ pattern: "", maxResults: 20, options: {} });
    for (const r of results) {
      const date = r.latestTimestamp.slice(0, 10);
      const title = r.title ?? "";
      const line = `${r.filePath}\t${date}\t${title}`;
      expect(line.split("\t")[0]).toBe(r.filePath);
    }
  });
});
