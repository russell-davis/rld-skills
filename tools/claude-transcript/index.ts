#!/usr/bin/env bun

import { readFileSync } from "fs";
import { DEFAULT_OPTIONS, type TranscriptOptions } from "./src/types.ts";
import { transcribeLines, transcribeFile } from "./src/transcript.ts";

const HELP = `Usage: claude-transcript [OPTIONS] <file.jsonl>

Convert Claude Code conversation files to readable transcripts.

Options:
  --include-thinking     Include thinking blocks (truncated to 300 chars)
  --full-thinking        Include full thinking blocks (no truncation)
  --include-tool-output  Include tool output summaries
  --subagents            Expand subagent transcripts inline (default)
  --no-subagents         Show subagents as "spawn agent" without expansion
  --session-path PATH    Session file path for subagent lookup (use with stdin)
  --header               Print a per-session header (title, branch, cwd)
  --agent                Agent/compact mode: disables header, keeps output decoration-free
  -h, --help             Show this help

Output format:
  U: user message text
  A: assistant response text
  A[Tool]: command or action
    → result summary (if --include-tool-output)
  A[think]: reasoning... (if --include-thinking)
  Agent (Type): task description...
    ↳ output summary (if --subagents)
  [away] context summary (from away_summary records)
  [compacted: earlier turns discarded] (when session was compacted)
  [forked session] (when session was forked)

Examples:
  claude-transcript conversation.jsonl
  claude-transcript --include-thinking session.jsonl
  cat session.jsonl | claude-transcript -
  claude-transcript --header session.jsonl
  claude-transcript --agent session.jsonl`;

let file = "";
let sessionPath = "";
const opts: TranscriptOptions = { ...DEFAULT_OPTIONS };

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--include-thinking":
      opts.includeThinking = true;
      break;
    case "--full-thinking":
      opts.includeThinking = true;
      opts.fullThinking = true;
      break;
    case "--include-tool-output":
      opts.includeToolOutput = true;
      break;
    case "--subagents":
      opts.expandSubagents = true;
      break;
    case "--no-subagents":
      opts.expandSubagents = false;
      break;
    case "--session-path":
      sessionPath = args[++i] || "";
      break;
    case "--header":
      opts.showHeader = true;
      break;
    case "--agent":
      opts.agentMode = true;
      opts.showHeader = false;
      break;
    case "-h":
    case "--help":
      console.log(HELP);
      process.exit(0);
    default:
      if (!file) file = args[i] as string;
      else {
        console.error(`Unexpected argument: ${args[i]}`);
        process.exit(1);
      }
  }
}

if (!file) {
  console.error("Error: JSONL file required");
  console.log(HELP);
  process.exit(1);
}

if (file === "-" && opts.expandSubagents && !sessionPath) {
  console.error("Error: Cannot expand subagents from stdin without --session-path");
  console.error("Use --session-path PATH, --no-subagents, or provide a file path");
  process.exit(1);
}

let lines: string[];

if (file === "-") {
  const input = readFileSync(0, "utf-8");
  lines = transcribeLines(input.split("\n"), sessionPath || null, opts);
} else {
  lines = transcribeFile(file, opts);
}

for (const line of lines) {
  console.log(line);
}
