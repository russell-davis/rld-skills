import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseLine } from "../../claude-jsonl/parse.ts";
import { titleForFile } from "../../claude-jsonl/titles.ts";
import type { JsonlRecord, SystemRecord, UserMessage } from "../../claude-jsonl/types.ts";
import type { TranscriptOptions } from "./types.ts";
import { formatMessage } from "./format.ts";

function expandSingleAgent(agentFile: string, agentType: string): string[] {
  const lines: string[] = [];
  const content = readFileSync(agentFile, "utf-8");
  const jsonlLines = content.split("\n");

  let task = "";
  let lastOutput = "";

  for (const line of jsonlLines) {
    const record = parseLine(line);
    if (!record) continue;

    if (record.type === "user") {
      const msg = record as UserMessage;
      if (!task) {
        const msgContent = msg.message.content;
        if (typeof msgContent === "string") {
          task = msgContent.slice(0, 80);
        } else if (Array.isArray(msgContent)) {
          const textBlock = msgContent.find((b) => b.type === "text" && b.text);
          if (textBlock?.text) task = (textBlock.text as string).slice(0, 80);
        }
      }
    }

    if (record.type === "assistant") {
      const assistantMsg = record as import("../../claude-jsonl/types.ts").AssistantMessage;
      const msgContent = assistantMsg.message?.content;
      if (Array.isArray(msgContent)) {
        for (const block of msgContent) {
          if (block.type === "text" && block.text && !/^agentId:/.test(block.text as string)) {
            lastOutput = (block.text as string).slice(0, 100);
          }
        }
      }
    }
  }

  if (task) {
    lines.push(`Agent (${agentType}): ${task}...`);
    if (lastOutput) lines.push(`  ↳ ${lastOutput}`);
  }

  return lines;
}

function renderHeader(filePath: string, records: JsonlRecord[]): string[] {
  const title = titleForFile(filePath, records);
  let branch = "";
  let cwd = "";
  for (const record of records) {
    if ((record.type === "user" || record.type === "assistant") && !branch) {
      const r = record as { gitBranch?: string; cwd?: string };
      if (r.gitBranch) branch = r.gitBranch;
      if (r.cwd) cwd = r.cwd;
    }
    if (branch && cwd) break;
  }
  const parts = [`Session: ${title}`];
  if (branch) parts.push(`Branch: ${branch}`);
  if (cwd) parts.push(`CWD: ${cwd}`);
  return [parts.join(" | "), "---"];
}

export function transcribeLines(
  jsonlLines: string[],
  sessionPath: string | null,
  opts: TranscriptOptions,
): string[] {
  const output: string[] = [];
  let lastSubagentType = "";

  const sessionDir = sessionPath?.replace(/\.jsonl$/, "") || null;

  const allRecords: JsonlRecord[] = [];
  for (const line of jsonlLines) {
    const record = parseLine(line);
    if (record) allRecords.push(record);
  }

  if (opts.showHeader && !opts.agentMode && sessionPath) {
    output.push(...renderHeader(sessionPath, allRecords));
  }

  for (const record of allRecords) {
    if (record.type === "system") {
      const sys = record as SystemRecord;
      if (sys.subtype === "away_summary" && sys.content) {
        const summary = sys.content.replace(/\n+/g, " ").trim();
        output.push(`[away] ${summary}`);
      }
      continue;
    }

    if (record.type === "bridge-session") {
      output.push("[forked session]");
      continue;
    }

    if (record.type === "user") {
      const userRecord = record as UserMessage & { isCompactSummary?: boolean; forkedFrom?: string };
      if (userRecord.isCompactSummary) {
        output.push("[compacted: earlier turns discarded]");
      }
      if (userRecord.forkedFrom) {
        output.push("[forked session]");
      }
    }

    if (record.type !== "user" && record.type !== "assistant") {
      continue;
    }

    const formatted = formatMessage(record as Parameters<typeof formatMessage>[0], opts);

    for (const fline of formatted) {
      if (opts.expandSubagents) {
        const useMatch = fline.match(/^A\[(?:Task|Agent)\]: __SUBAGENT_USE:([^_]+)__$/);
        if (useMatch) {
          lastSubagentType = useMatch[1] ?? "";
          continue;
        }

        const resultMatch = fline.match(/^__SUBAGENT_RESULT:([a-f0-9]+)__$/);
        if (resultMatch && sessionDir) {
          const agentFile = join(sessionDir, "subagents", `agent-${resultMatch[1]}.jsonl`);
          if (existsSync(agentFile)) {
            output.push(...expandSingleAgent(agentFile, lastSubagentType || "agent"));
          } else {
            output.push(`  (subagent file not found: ${resultMatch[1]})`);
          }
          lastSubagentType = "";
          continue;
        }
      }

      output.push(fline);
    }
  }

  return output;
}

export function transcribeFile(filePath: string, opts: TranscriptOptions): string[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  return transcribeLines(lines, filePath, opts);
}
