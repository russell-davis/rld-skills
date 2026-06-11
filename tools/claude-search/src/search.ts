import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseLine } from "../../claude-jsonl/parse.ts";
import { titleForFile } from "../../claude-jsonl/titles.ts";
import type { JsonlRecord, Message } from "../../claude-jsonl/types.ts";
import { messageToMatch } from "./match.ts";
import type { SearchOptions, SessionResult } from "./types.ts";

function getProjectsDir(): string {
  return join(
    process.env.HOME ?? process.env.USERPROFILE ?? "~",
    ".claude",
    "projects"
  );
}

export async function checkRipgrep(): Promise<void> {
  const proc = Bun.spawn(["rg", "--version"], {
    stdout: "ignore",
    stderr: "ignore",
  });
  const code = await proc.exited;
  if (code !== 0) throw new RipgrepNotFoundError();
}

export class RipgrepNotFoundError extends Error {
  constructor() {
    super(
      `ripgrep (rg) is required but not found on PATH.

Install it:
  Windows:       winget install BurntSushi.ripgrep
  Arch/Manjaro:  pacman -S ripgrep
  Ubuntu/Debian: apt install ripgrep
  macOS:         brew install ripgrep
  Cargo:         cargo install ripgrep`
    );
    this.name = "RipgrepNotFoundError";
  }
}

export interface SearchParams {
  pattern: string;
  maxResults: number;
  projectFilter?: string;
  afterDate?: string;
  beforeDate?: string;
  branchFilter?: string;
  options: Partial<SearchOptions>;
}

export async function searchWithRipgrep(
  params: SearchParams
): Promise<SessionResult[]> {
  const { pattern, maxResults, projectFilter, afterDate, beforeDate, branchFilter, options } =
    params;

  if (pattern === "") {
    const allFiles = await findAllJsonlFiles(projectFilter);
    const results: SessionResult[] = [];
    for (const filePath of allFiles) {
      const result = await summarizeFile(filePath, afterDate, beforeDate, branchFilter);
      if (result) results.push(result);
    }
    return rankResults(results).slice(0, maxResults);
  }

  await checkRipgrep();
  const matchingFiles = await rgFindFiles(pattern, projectFilter);

  const results: SessionResult[] = [];
  for (const filePath of matchingFiles) {
    const result = await searchFile(filePath, pattern, options, afterDate, beforeDate, branchFilter);
    if (result && result.matchCount > 0) {
      results.push(result);
    }
  }

  return rankResults(results).slice(0, maxResults);
}

async function readRecords(filePath: string): Promise<{ records: JsonlRecord[]; content: string } | null> {
  let content: string;
  try {
    content = await Bun.file(filePath).text();
  } catch {
    return null;
  }
  const records: JsonlRecord[] = [];
  for (const line of content.split("\n")) {
    const record = parseLine(line);
    if (record) records.push(record);
  }
  return { records, content };
}

function computeTimestampRange(records: JsonlRecord[]): { latest: string; earliest: string } {
  let latest = "";
  let earliest = "";
  for (const record of records) {
    const ts = (record as { timestamp?: string }).timestamp ?? "";
    if (!ts) continue;
    if (!latest || ts > latest) latest = ts;
    if (!earliest || ts < earliest) earliest = ts;
  }
  return { latest, earliest };
}

function passesDateFilter(
  latestTimestamp: string,
  afterDate?: string,
  beforeDate?: string
): boolean {
  if (!afterDate && !beforeDate) return true;
  const dateStr = latestTimestamp.slice(0, 10);
  if (afterDate && dateStr < afterDate) return false;
  if (beforeDate && dateStr > beforeDate) return false;
  return true;
}

function passesBranchFilter(records: JsonlRecord[], branchFilter?: string): boolean {
  if (!branchFilter) return true;
  return records.some(
    (r) => (r as { gitBranch?: string }).gitBranch === branchFilter
  );
}

async function summarizeFile(
  filePath: string,
  afterDate?: string,
  beforeDate?: string,
  branchFilter?: string
): Promise<SessionResult | null> {
  const parsed = await readRecords(filePath);
  if (!parsed) return null;
  const { records } = parsed;

  const { latest: latestTimestamp } = computeTimestampRange(records);

  if (!passesDateFilter(latestTimestamp, afterDate, beforeDate)) return null;
  if (!passesBranchFilter(records, branchFilter)) return null;

  const title = titleForFile(filePath, records);
  return { filePath, matchCount: 0, latestTimestamp, matches: [], title };
}

async function rgFindFiles(
  pattern: string,
  projectFilter?: string
): Promise<string[]> {
  const args = [
    "rg",
    "-l",
    "-i",
    "--glob",
    "*.jsonl",
    pattern,
    getProjectsDir(),
  ];

  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "ignore" });
  const text = await new Response(proc.stdout).text();
  await proc.exited;

  let files = text.trim().split("\n").filter(Boolean);

  if (projectFilter) {
    const filter = projectFilter.toLowerCase();
    files = files.filter((f) => f.toLowerCase().includes(filter));
  }

  return files;
}

async function findAllJsonlFiles(
  projectFilter?: string
): Promise<string[]> {
  const files: string[] = [];
  const projectsDir = resolve(getProjectsDir());

  let projectDirs: string[];
  try {
    projectDirs = await readdir(projectsDir);
  } catch {
    return [];
  }

  for (const dir of projectDirs) {
    if (projectFilter && !dir.toLowerCase().includes(projectFilter.toLowerCase())) {
      continue;
    }
    const dirPath = join(projectsDir, dir);
    let entries: string[];
    try {
      entries = await readdir(dirPath);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.endsWith(".jsonl") && !entry.startsWith("agent-")) {
        files.push(join(dirPath, entry));
      }
    }
  }

  return files;
}

async function searchFile(
  filePath: string,
  pattern: string,
  options: Partial<SearchOptions>,
  afterDate?: string,
  beforeDate?: string,
  branchFilter?: string
): Promise<SessionResult | null> {
  const parsed = await readRecords(filePath);
  if (!parsed) return null;
  const { records } = parsed;

  const { latest: latestTimestamp } = computeTimestampRange(records);

  if (!passesDateFilter(latestTimestamp, afterDate, beforeDate)) return null;
  if (!passesBranchFilter(records, branchFilter)) return null;

  const matches: SessionResult["matches"] = [];

  for (const record of records) {
    if (record.type !== "user" && record.type !== "assistant") continue;
    const match = messageToMatch(record as Message, pattern, options);
    if (match) matches.push(match);
  }

  if (matches.length === 0) return null;

  const title = titleForFile(filePath, records);
  return { filePath, matchCount: matches.length, latestTimestamp, matches, title };
}

export function rankResults(results: SessionResult[]): SessionResult[] {
  return [...results].sort((a, b) => {
    const dateCmp = b.latestTimestamp.localeCompare(a.latestTimestamp);
    if (dateCmp !== 0) return dateCmp;
    return b.matchCount - a.matchCount;
  });
}
