---
name: to-issues
description: Break a plan, spec, PRD, or in-conversation idea into independently-grabbable issues using tracer-bullet vertical slices. Use when user wants to convert a plan to issues, create implementation tickets, break a PRD into work items, plan a sprint from a spec, or turn requirements into a task list — even if they don't use the term "vertical slice."
---

# To Issues

Break a plan into independently-grabbable issues using vertical slices (tracer bullets).

The source can be a PRD, a spec, a markdown doc, an existing issue, or just a grilled conversation context. Adapt to what you have.

## Process

### 1. Locate or assemble the source

Figure out what you're working from. In order of preference:

- **Existing PRD or spec** — local file (`.prd/*.md`, `.specs/*.md`, any markdown), or an issue reference (number/URL) → fetch with `gh issue view <number>` or the tracker's equivalent.
- **Already in conversation context** — a plan you and the user have hashed out in this session is fair game.
- **A bare idea with no shared understanding yet** — see step 2.

### 2. Conditionally interview

If the source is thin — the user is handing you a one-liner, a vague intent, or there's no PRD and the conversation hasn't grilled the design — **interview the user first** before drafting slices. Skipping this produces issues that look complete but encode unresolved decisions, and the breakdown gets rejected later.

Walk down the design tree one branch at a time. For each question, propose your recommended answer so the user can accept/modify rather than start from scratch. Cover scope boundaries, user-facing behavior, edge cases, dependencies, failure modes, and migration/rollback. Stop when every decision branch is resolved.

Skip this step when:
- A PRD or spec already encodes the decisions
- The conversation has already done a `grill-me` pass
- The user explicitly says "just break it up" / "you have enough context"

### 3. Explore the codebase

Understand the current state of the code in the area you'll touch. Use the project's domain glossary vocabulary in issue titles and descriptions, and respect any ADRs in that area — they encode constraints that should shape the slices.

### 4. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones
</vertical-slice-rules>

### 5. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices (if any) must complete first
- **User stories / requirements covered**: which user stories or requirements this addresses (if the source material has them)

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown.

### 6. Create the issues

Detect the project context and choose the right target:

- **No repo / early stage** → Write issues as markdown files in `.issues/`, one per slice. Create the directory if it doesn't exist.
- **GitHub remote** → Create issues with `gh issue create` in dependency order (blockers first) so you can reference real issue numbers.
- **Other tracker** (Azure DevOps, Linear, etc.) → Write local files and let the user decide how to file them, or use the tracker's CLI if one is available.

Ask the user if the default doesn't fit.

#### Local issue format (`.issues/`)

```markdown
---
title: Short descriptive name
type: AFK
status: todo
blocked_by: []
user_stories: [3, 7]
parent: ../.prd/feature-name.md
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

#### Issue tracker format

<issue-template>
## Parent

A reference to the parent PRD / spec / issue (if any). Omit if there isn't one.

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Reference specific sections of the parent rather than duplicating content.

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it here and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Blocked by #<issue-number> (if any)

Or "None - can start immediately" if no blockers.

## User stories / requirements addressed

Reference by number from the parent (if applicable):

- User story 3
- User story 7

</issue-template>

Do NOT close or modify the parent PRD/issue.
