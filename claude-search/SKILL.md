---
name: claude-search
description: "Search Claude Code conversation history using claude-searcher CLI. Use when the user asks to search past conversations, find something from a previous session, look up what was discussed, recall when they did something, grep session history, or says anything like 'search my sessions', 'find that conversation', 'what did we talk about', 'when did I', 'past claude sessions'. Always use this instead of manually reading JSONL files."
---

# Claude Search

Full-text search across all Claude Code conversation history. Returns matching session file paths ranked by recency, each annotated with its date and title.

## When to Use

- **"Find when I did X"** → `claude-searcher "pattern"`
- **"Search my sessions for..."** → `claude-searcher "keyword"`
- **"List my sessions from last week"** → `claude-searcher --after 2026-06-01` (no pattern = list mode)
- Finding a past conversation to review with `claude-transcript`

## Usage

```bash
claude-searcher "authentication"
claude-searcher --preview "refactor"
claude-searcher -n 5 --after 2026-02-01 "deploy"
claude-searcher -p Work/myapp "scheduler"
claude-searcher --branch feat/scheduler-v2 "retry"
claude-searcher --tool-output "error"
```

## Options

| Flag | Effect |
|------|--------|
| `-n N` | Max results (default: 20) |
| `-p PATTERN` | Filter by project path substring |
| `--after DATE` | Sessions with latest message on or after DATE (YYYY-MM-DD) |
| `--before DATE` | Sessions with latest message on or before DATE (YYYY-MM-DD) |
| `--branch NAME` | Only sessions where any record's `gitBranch` equals NAME |
| `--preview` | Always show matching snippets |
| `--tool-output` | Also search tool results |
| `--thinking` | Also search thinking blocks |
| `--user` | Only search user messages |
| `--assistant` | Only search assistant messages |
| `-s` | Case sensitive (default: case insensitive) |
| `--agent` | Compact, decoration-free output for machine/agent consumers |

`--after`/`--before` filter on the session's **message timestamps**, not file modification time — restoring or re-indexing a session does not change which date filter it matches.

## Output

Each result line begins with the session file path (always the first whitespace token), followed by `(date)` and the session title:

```
/home/user/.claude/projects/-home-user-Work-myapp/abc123….jsonl  (2026-06-11)  Refactor the auth middleware
```

Auto-shows preview snippets when fewer than 10 results, paths-only when 10+. Use `--preview` to force snippets. With no pattern, lists sessions matching the filters.

## Typical Workflow

Search → get file path → `claude-transcript <file>` to read the session.
