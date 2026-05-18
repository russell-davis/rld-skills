# rld's skills

A personal collection of agent skills for Claude Code and compatible agents.

## Install

```bash
# all skills
npx skills add russell-davis/rld-skills

# one skill
npx skills add russell-davis/rld-skills --skill webapp

# list first, install later
npx skills add russell-davis/rld-skills --list
```

Uses the [vercel-labs/skills](https://github.com/vercel-labs/skills) CLI. Works with Claude Code, Codex, Cursor, OpenCode, and others.

## Skills

- **webapp** — Scaffold and build web apps using a tiered approach (single HTML → Bun server → Astro → deployment). Bundles the full Bun/Hono/React/Postgres stack standard, Docker conventions, and per-tier scaffolding references so the skill is self-contained.
- **grill-me** — Interview the user relentlessly until every branch of a design decision is resolved. Explicit probe categories (scope, UX, edge cases, dependencies, failure modes, trade-offs, migration) and a "when to stop" rule.
- **write-a-prd** — Create a PRD via user interview, codebase exploration, and module design. Folds in a `grill-me` step and supports non-GitHub targets (`.prd/` directory, other trackers).
- **to-issues** — Break a plan, spec, PRD, or in-conversation idea into independently-grabbable issues using tracer-bullet vertical slices. Local `.issues/` directory format for early-stage / non-GitHub projects, richer frontmatter.

`grill-me`, `write-a-prd`, and `to-issues` are inspired by [mattpocock/skills](https://github.com/mattpocock/skills).

## License

MIT. See [LICENSE](LICENSE).
