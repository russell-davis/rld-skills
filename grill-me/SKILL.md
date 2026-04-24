---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, challenge their assumptions, poke holes in an idea, or says "grill me". Also useful before committing to a large implementation.
---

# Grill Me

The goal is to find the gaps, contradictions, and unstated assumptions in a plan *before* they become bugs or rewrites. A good grilling turns vague intent into concrete, defensible decisions.

## How to grill

Interview the user about every aspect of their plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

**For each question, provide your recommended answer.** This keeps things moving — the user can accept, reject, or modify your suggestion rather than starting from scratch each time. If a question can be answered by exploring the codebase, explore the codebase instead of asking.

**Ask one question at a time.** Don't dump a list of 10 questions — that overwhelms and gets shallow answers. Go deep on each branch before moving to the next.

## What to probe

- **Scope boundaries** — What's in, what's out, what's ambiguous?
- **User-facing behavior** — What does the user see, click, experience? Walk through concrete scenarios.
- **Edge cases** — What happens when inputs are empty, huge, malformed, concurrent?
- **Dependencies** — What has to exist before this works? What breaks if those change?
- **Failure modes** — What happens when things go wrong? How does the user recover?
- **Trade-offs** — What are you giving up with this approach? What alternatives were considered?
- **Migration / rollback** — How do you get from here to there? How do you undo it?

## When to stop

Stop when every decision branch has been resolved and the user isn't surfacing new concerns. Summarize the resolved decisions as a numbered list so there's a clear record of what was agreed.

---

*Adapted from [mattpocock/skills/grill-me](https://github.com/mattpocock/skills/tree/main/grill-me) (MIT). Expanded with explicit probe categories and a stop condition.*
