---
name: claude-transcript
description: "Convert Claude Code JSONL sessions to readable text transcripts. Use when the user wants to view a conversation transcript, needs to read a session file, or mentions session transcripts."
---

# Claude Transcript

Convert Claude Code JSONL session files into readable text transcripts.

## When to Use

- **"Show me that session"** → `claude-transcript <file>`
- **"What happened in that conversation?"** → find the JSONL, run transcript
- Feeding session content into another tool or prompt

## Usage

```bash
claude-transcript <file.jsonl>
claude-transcript --include-thinking session.jsonl
claude-transcript --include-tool-output session.jsonl
claude-transcript --header session.jsonl
cat session.jsonl | claude-transcript --no-subagents -
```

## Options

| Flag | Effect |
|------|--------|
| `--include-thinking` | Show thinking blocks (truncated to 300 chars) |
| `--full-thinking` | Show full thinking blocks (no truncation) |
| `--include-tool-output` | Show tool result content |
| `--subagents` | Expand subagent transcripts inline (default) |
| `--no-subagents` | Show subagents as "spawn agent" without expansion |
| `--session-path PATH` | Session file path for subagent lookup (use with stdin) |
| `--header` | Print a per-session header (title, git branch, cwd) |
| `--agent` | Agent/compact mode: disables header, keeps output decoration-free |

## Output Format

```
U: user message text
A: assistant response text
A[Tool]: command or action
  → result summary (if --include-tool-output)
A[think]: reasoning... (if --include-thinking)
Agent (Type): task description...
  ↳ output summary (if --subagents)
[recap] one-line conversation recap (from away_summary records)
[compacted: earlier turns discarded]
[forked session]
```

`[recap]` lines surface the auto-generated "away" summaries Claude Code records mid-conversation — a dense recap of the discussion to that point. `[compacted: …]` / `[forked session]` markers flag sessions whose earlier turns were discarded or branched, so a partial transcript isn't mistaken for the whole conversation.

## Finding Sessions

Sessions are stored in `~/.claude/projects/<encoded-path>/`. The path encodes the working directory (e.g. `/home/user/Work/foo` → `-home-user-Work-foo`).

```bash
ls ~/.claude/projects/
PROJECT_PATH=$(pwd | sed 's|/|-|g; s|^-||')
ls ~/.claude/projects/${PROJECT_PATH}/*.jsonl
```
