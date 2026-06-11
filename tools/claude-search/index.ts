#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { searchWithRipgrep } from "./src/search.ts";
import type { SessionResult, SearchOptions } from "./src/types.ts";

function usage(): never {
  console.log(`Usage: claude-searcher [OPTIONS] ["pattern"]

Search all Claude Code conversation history. If no pattern is given,
list sessions matching the filters (useful with --after/--before/-p/-n).

Options:
  -n N              Max results (default: 20)
  -p PATTERN        Filter by project path substring
  --after DATE      Sessions with latest message on or after this date (YYYY-MM-DD)
  --before DATE     Sessions with latest message on or before this date (YYYY-MM-DD)
  --branch NAME     Only sessions where any record has gitBranch equal to NAME
  --preview         Always show matching snippets
  --tool-output     Also search tool results
  --thinking        Also search thinking blocks
  --user            Only search user messages
  --assistant       Only search assistant messages
  -s                Case sensitive (default: case insensitive)
  --agent           Compact machine-readable output (no headers, stable format)
  -h, --help        Show this help`);
  process.exit(0);
}

function parseCliArgs() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h", default: false },
      n: { type: "string", default: "20" },
      p: { type: "string" },
      after: { type: "string" },
      before: { type: "string" },
      branch: { type: "string" },
      preview: { type: "boolean", default: false },
      "tool-output": { type: "boolean", default: false },
      thinking: { type: "boolean", default: false },
      user: { type: "boolean", default: false },
      assistant: { type: "boolean", default: false },
      s: { type: "boolean", default: false },
      agent: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) usage();

  const pattern = positionals[0] ?? "";

  return {
    pattern,
    maxResults: parseInt(values.n ?? "20", 10),
    projectFilter: values.p,
    afterDate: values.after,
    beforeDate: values.before,
    branchFilter: values.branch,
    forcePreview: values.preview ?? false,
    agentMode: values.agent ?? false,
    options: {
      includeToolOutput: values["tool-output"] ?? false,
      includeThinking: values.thinking ?? false,
      userOnly: values.user ?? false,
      assistantOnly: values.assistant ?? false,
      caseSensitive: values.s ?? false,
    } satisfies SearchOptions,
  };
}

function formatResults(
  results: SessionResult[],
  forcePreview: boolean,
  listMode: boolean,
  agentMode: boolean,
): string {
  if (results.length === 0) {
    return listMode ? "No sessions found." : "No matches found.";
  }

  const showPreview = !listMode && !agentMode && (forcePreview || results.length < 10);
  const lines: string[] = [];

  for (const result of results) {
    const date = result.latestTimestamp.slice(0, 10) || "unknown";
    const title = result.title ?? "";

    if (agentMode) {
      if (listMode) {
        lines.push(`${result.filePath}\t${date}\t${title}`);
      } else {
        lines.push(`${result.matchCount}\t${result.filePath}\t${date}\t${title}`);
      }
      continue;
    }

    if (listMode) {
      lines.push(title ? `${result.filePath}  (${date})  ${title}` : `${result.filePath}  (${date})`);
      continue;
    }

    const matchWord = result.matchCount === 1 ? "match" : "matches";
    lines.push(
      title
        ? `${result.matchCount} ${matchWord}  ${result.filePath}  (${date})  ${title}`
        : `${result.matchCount} ${matchWord}  ${result.filePath}  (${date})`
    );

    if (showPreview) {
      const previewMatches = result.matches.slice(0, 3);
      for (const match of previewMatches) {
        const ts = match.timestamp.slice(11, 16) || "";
        const prefix = ts ? `[${ts}] ${match.role}` : match.role;
        lines.push(`  ${prefix}: ${match.text}`);
      }
      if (result.matches.length > 3) {
        lines.push(`  ... and ${result.matches.length - 3} more`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  const args = parseCliArgs();

  const results = await searchWithRipgrep({
    pattern: args.pattern,
    maxResults: args.maxResults,
    projectFilter: args.projectFilter,
    afterDate: args.afterDate,
    beforeDate: args.beforeDate,
    branchFilter: args.branchFilter,
    options: args.options,
  });

  console.log(formatResults(results, args.forcePreview, args.pattern === "", args.agentMode));
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
