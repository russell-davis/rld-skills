# rld's skills

A personal collection of agent skills for Claude Code and compatible agents.

## Install

```bash
# all skills
npx skills add russell-davis/rld-skills

# one skill
npx skills add russell-davis/rld-skills --skill grill-me

# list first, install later
npx skills add russell-davis/rld-skills --list
```

Uses the [vercel-labs/skills](https://github.com/vercel-labs/skills) CLI. Works with Claude Code, Codex, Cursor, OpenCode, and others.

## Skills

### Derived from [mattpocock/skills](https://github.com/mattpocock/skills)

These started from Matt Pocock's originals (MIT-licensed) and were adapted to my workflow. Each `SKILL.md` has an attribution footer noting the source and the substantive diff.

- **grill-me** — Interview the user relentlessly until every branch of a design decision is resolved. Expands Matt's version with explicit probe categories (scope, UX, edge cases, dependencies, failure modes, trade-offs, migration) and a "when to stop" rule.
- **write-a-prd** — Create a PRD via user interview, codebase exploration, and module design. Based on Matt's `to-prd`, but *does* interview the user (his explicitly does not — I fold in the `grill-me` step) and supports non-GitHub targets (`.prd/` directory, other trackers).
- **prd-to-issues** — Break a PRD into independently-grabbable issues using tracer-bullet vertical slices. Based on Matt's `to-issues`, adds a local `.issues/` directory format for early-stage / non-GitHub projects and richer frontmatter.

## License

MIT. See [LICENSE](LICENSE). Derived skills preserve Matt Pocock's copyright.
