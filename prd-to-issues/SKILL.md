---
name: prd-to-issues
description: Break a PRD into independently-grabbable issues using tracer-bullet vertical slices. Use when user wants to convert a PRD to issues, create implementation tickets, break down a PRD into work items, plan a sprint from a spec, or turn requirements into a task list — even if they don't use the term "vertical slice."
---

# PRD to Issues

Break a PRD into independently-grabbable issues using vertical slices (tracer bullets).

## Process

### 1. Locate the PRD

Ask the user where the PRD lives. It could be:

- A local file (`.prd/*.md` or any markdown)
- A GitHub issue number/URL → fetch with `gh issue view <number>`
- Already in the conversation context

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories from the PRD this addresses

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 5. Create the issues

Detect the project context and choose the right target:

- **No repo / early stage** → Write issues as markdown files in `.issues/`, one per slice. Create the directory if it doesn't exist.
- **GitHub remote** → Create issues with `gh issue create` in dependency order (blockers first) so you can reference real issue numbers.
- **Other tracker** → Write local files and let the user decide how to file them.

Ask the user if the default doesn't fit.

#### Local issue format (`.issues/`)

```markdown
---
title: Short descriptive name
type: AFK
status: todo
blocked_by: []
user_stories: [3, 7]
parent_prd: ../.prd/feature-name.md
---

## What to build

A concise description of this vertical slice. Describe the end-to-end
behavior, not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

Name files with a sequence prefix for ordering: `001-setup-auth.md`, `002-add-login.md`, etc.

#### GitHub issue format

<issue-template>
## Parent PRD

#<prd-issue-number>

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent PRD rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Blocked by #<issue-number> (if any)

Or "None - can start immediately" if no blockers.

## User stories addressed

Reference by number from the parent PRD:

- User story 3
- User story 7

</issue-template>

Do NOT close or modify the parent PRD issue.

---

*Adapted from [mattpocock/skills/to-issues](https://github.com/mattpocock/skills/tree/main/to-issues) (MIT). Adds a local `.issues/` directory format with frontmatter for early-stage / non-GitHub projects, and a `User stories addressed` section in the issue template.*
