#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { readdir, stat, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { parseSessionMeta, outputFilename, readFrontmatterField } from "./parse.ts";
import { buildMarkdown } from "./write.ts";

const SESSIONS_DIR = join(process.env.HOME!, ".claude/projects");
const OUTPUT_DIR = join(process.env.HOME!, ".local/share/claude-sessions");
const MIN_USER_MESSAGES = 2;

interface Options {
  dryRun: boolean;
  verbose: boolean;
  limit: number;
}

function usage(): never {
  console.log(`Usage: claude-session-indexer [OPTIONS]

Convert Claude Code sessions to searchable markdown files.

Options:
  --dry-run       Show what would be processed without writing files
  --verbose       Show progress for each session
  --limit N       Process at most N sessions (0 = unlimited)
  -h, --help      Show this help

Output: ~/.local/share/claude-sessions/YYYY-MM-DD_XXXXXXXX.md`);
  process.exit(0);
}

function log(opts: Options, ...args: unknown[]) {
  if (opts.verbose) {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    console.error(`[${ts}]`, ...args);
  }
}

async function findSessions(): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "subagents") continue;
        await walk(full);
      } else if (entry.name.endsWith(".jsonl")) {
        results.push(full);
      }
    }
  }

  await walk(SESSIONS_DIR);
  return results.sort();
}

async function getTranscript(filePath: string): Promise<string> {
  const proc = Bun.spawn(["claude-transcript", "--no-subagents", filePath], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return text.trim();
}

async function loadExistingTimestamps(dir: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return map;
  }
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const content = await readFile(join(dir, name), "utf-8");
    const last = readFrontmatterField(content, "last");
    if (last) map.set(name, last);
  }
  return map;
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h", default: false },
      "dry-run": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      limit: { type: "string", default: "0" },
    },
  });

  if (values.help) usage();

  const opts: Options = {
    dryRun: values["dry-run"] ?? false,
    verbose: values.verbose ?? false,
    limit: parseInt(values.limit ?? "0", 10),
  };

  await mkdir(OUTPUT_DIR, { recursive: true });

  log(opts, "Loading existing index...");
  const existing = await loadExistingTimestamps(OUTPUT_DIR);
  log(opts, `${existing.size} existing files`);

  log(opts, "Finding sessions...");
  const sessions = await findSessions();
  log(opts, `Found ${sessions.length} session files`);

  let written = 0;
  let updated = 0;
  const skipReasons = {
    empty: 0,
    noMessages: 0,
    tooFew: 0,
    upToDate: 0,
    emptyTranscript: 0,
  };
  let processed = 0;

  for (const filePath of sessions) {
    if (opts.limit > 0 && processed >= opts.limit) break;

    const sessionId = basename(filePath, ".jsonl");
    log(opts, `Checking: ${sessionId}`);

    const fileStat = await stat(filePath);

    if (fileStat.size === 0) {
      log(opts, "  Skip: empty file");
      skipReasons.empty++;
      continue;
    }

    const raw = await readFile(filePath, "utf-8");
    const lines = raw.split("\n");
    const meta = parseSessionMeta(filePath, lines);

    if (!meta) {
      log(opts, "  Skip: no valid messages");
      skipReasons.noMessages++;
      continue;
    }

    if (meta.userMessages < MIN_USER_MESSAGES) {
      log(opts, `  Skip: ${meta.userMessages} user messages (need ${MIN_USER_MESSAGES})`);
      skipReasons.tooFew++;
      continue;
    }

    const outName = outputFilename(meta.date, meta.sessionId);
    const existingTs = existing.get(outName);

    if (existingTs === meta.lastTimestamp) {
      log(opts, `  Skip: up to date (${outName})`);
      skipReasons.upToDate++;
      continue;
    }

    const isUpdate = existingTs !== undefined;

    if (opts.dryRun) {
      const sizeKb = Math.round(fileStat.size / 1024);
      const action = isUpdate ? "Would update" : "Would write";
      console.log(`${action}: ${outName}`);
      console.log(`  Project: ${meta.project}  Messages: ${meta.userMessages}  Turns: ${meta.turns}  Size: ${sizeKb}K`);
      processed++;
      continue;
    }

    const transcript = await getTranscript(filePath);
    if (!transcript) {
      log(opts, "  Skip: empty transcript");
      skipReasons.emptyTranscript++;
      continue;
    }

    const markdown = buildMarkdown(meta, transcript);
    const outPath = join(OUTPUT_DIR, outName);
    await writeFile(outPath, markdown);
    existing.set(outName, meta.lastTimestamp);

    if (isUpdate) {
      log(opts, `  Updated: ${outName} (${markdown.length} bytes)`);
      updated++;
    } else {
      log(opts, `  Wrote: ${outName} (${markdown.length} bytes)`);
      written++;
    }
    processed++;
  }

  const totalSkipped = Object.values(skipReasons).reduce((a, b) => a + b, 0);
  const parts = [`Done: ${written} written, ${updated} updated, ${totalSkipped} skipped`];
  const reasons: string[] = [];
  if (skipReasons.upToDate) reasons.push(`${skipReasons.upToDate} up to date`);
  if (skipReasons.tooFew) reasons.push(`${skipReasons.tooFew} too few messages`);
  if (skipReasons.noMessages) reasons.push(`${skipReasons.noMessages} no valid messages`);
  if (skipReasons.empty) reasons.push(`${skipReasons.empty} empty`);
  if (skipReasons.emptyTranscript) reasons.push(`${skipReasons.emptyTranscript} empty transcript`);
  if (reasons.length) parts.push(`(${reasons.join(", ")})`);
  console.error(parts.join(" "));
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
