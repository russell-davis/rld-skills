import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseLine } from "./parse.ts";
import { lastAiTitle, fallbackTitle, titleForFile } from "./titles.ts";
import type { JsonlRecord } from "./types.ts";

const fixturesDir = join(import.meta.dir, "fixtures");

function loadRecords(name: string): JsonlRecord[] {
  return readFileSync(join(fixturesDir, name), "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => parseLine(l))
    .filter((r): r is JsonlRecord => r !== null);
}

test("lastAiTitle: returns last ai-title in file order", () => {
  const records = loadRecords("ai-title-last-wins.jsonl");
  const title = lastAiTitle(records);
  expect(title).toBe("Final Title");
});

test("lastAiTitle: returns null when no ai-title records", () => {
  const records = loadRecords("no-title.jsonl");
  expect(lastAiTitle(records)).toBeNull();
});

test("lastAiTitle: returns null for empty records", () => {
  expect(lastAiTitle([])).toBeNull();
});

test("fallbackTitle: strips -home-rld-Work- prefix and converts dashes to slashes", () => {
  const path = "/home/rld/.claude/projects/-home-rld-Work-my-project/abc123.jsonl";
  const title = fallbackTitle(path);
  expect(title).toBe("my/project");
});

test("fallbackTitle: strips -home-rld- prefix", () => {
  const path = "/home/rld/.claude/projects/-home-rld-dotfiles/abc123.jsonl";
  const title = fallbackTitle(path);
  expect(title).toBe("dotfiles");
});

test("fallbackTitle: handles plain project dir name without known prefix", () => {
  const path = "/home/rld/.claude/projects/some-project/abc123.jsonl";
  const title = fallbackTitle(path);
  expect(title.length).toBeGreaterThan(0);
});

test("fallbackTitle: never returns empty string", () => {
  const paths = [
    "/home/rld/.claude/projects/-home-rld-Work-my-project/abc.jsonl",
    "/tmp/session.jsonl",
    "/a/b.jsonl",
    "/home/rld/.claude/projects/-home-rld-/abc.jsonl",
  ];
  for (const p of paths) {
    const result = fallbackTitle(p);
    expect(result.length).toBeGreaterThan(0);
  }
});

test("titleForFile: uses ai-title when present", () => {
  const records = loadRecords("ai-title-last-wins.jsonl");
  const path = "/home/rld/.claude/projects/-home-rld-Work-rld-skills/abc.jsonl";
  expect(titleForFile(path, records)).toBe("Final Title");
});

test("titleForFile: falls back to path-derived title when no ai-title", () => {
  const records = loadRecords("no-title.jsonl");
  const path = "/home/rld/.claude/projects/-home-rld-Work-rld-skills/abc.jsonl";
  const title = titleForFile(path, records);
  expect(title.length).toBeGreaterThan(0);
  expect(title).toBe("rld/skills");
});
