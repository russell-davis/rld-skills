---
name: write-a-prd
description: Create a PRD through user interview, codebase exploration, and module design. Use when user wants to write a PRD, plan a feature, create a spec, write requirements, design a new system, or scope out work — even if they don't say "PRD" explicitly. Any substantial feature planning benefits from this structured approach.
---

# Write a PRD

A good PRD captures *why* something should be built, *what* it should do, and *how* the pieces fit together — before anyone writes code. The interview process surfaces hidden assumptions and conflicting requirements early, when they're cheap to fix.

Skip steps that don't apply (e.g., no repo to explore, or the user already has a clear spec in mind).

## 1. Gather the problem

Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions. Let them talk — the goal is to get everything out of their head before you start structuring it.

## 2. Explore the codebase

If there's a repo, explore it to verify the user's assertions and understand the current state. This grounds the PRD in reality — users often have stale mental models of their own code.

## 3. Interview

Interview the user about every aspect of this plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. The point isn't to be exhaustive — it's to find the decisions that affect other decisions and resolve them in the right order.

## 4. Design modules

Sketch the major modules you'll need to build or modify. Actively look for opportunities to extract deep modules — ones that encapsulate a lot of functionality behind a simple, testable interface that rarely changes. These are where the real design value lives.

Check with the user that these modules match their expectations. Check which modules they want tests written for.

## 5. Write the PRD

Once you have a complete understanding of the problem and solution, use the template below.

### Where to put it

Detect the project context and choose the right target:

- **No repo yet / early stage** → Write to `.prd/` directory as a markdown file (e.g., `.prd/auth-system.md`). Create the directory if it doesn't exist.
- **GitHub remote exists** → Create a GitHub issue with `gh issue create`.
- **Other tracker** (Azure DevOps, Linear, etc.) → Write the local file and let the user decide how to file it.

Ask the user if the default doesn't fit. The PRD content is the same regardless of where it lives.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>

---

*Adapted from [mattpocock/skills/to-prd](https://github.com/mattpocock/skills/tree/main/to-prd) (MIT). Inverts the "don't interview" rule — folds in a `grill-me`-style interview step — and supports non-GitHub targets (`.prd/` directory, other trackers).*
