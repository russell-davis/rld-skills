---
name: interview
description: Conduct a detailed interview about the current topic using thoughtful, non-obvious questions. Use when you need to deeply understand requirements, uncover hidden assumptions, or explore tradeoffs the user hasn't considered.
---

# Interview

Conduct a thorough interview using the AskUserQuestion tool to deeply understand the current topic. Ask probing, non-obvious questions that uncover hidden requirements, assumptions, edge cases, and tradeoffs.

## Instructions

### Step 1: Identify the Topic

From the conversation context, identify:
- What are we building/discussing?
- What decisions have already been made?
- What areas seem under-specified?

### Step 2: Prepare Interview Questions

Generate questions across these dimensions, but **avoid the obvious**:

| Category | Obvious (avoid) | Non-obvious (prefer) |
|----------|----------------|---------------------|
| **Requirements** | "What features do you want?" | "What would make you abandon this halfway through?" |
| **Users** | "Who will use this?" | "Who do you NOT want using this, and why?" |
| **Edge cases** | "What if the input is empty?" | "What's the most creative way a user could misuse this?" |
| **Tradeoffs** | "Speed or accuracy?" | "If you had to remove one feature to ship tomorrow, which one?" |
| **Technical** | "What language?" | "What's the ugliest hack you'd accept to get this working?" |
| **UX** | "What should the UI look like?" | "What's the most confusing thing about similar tools you've used?" |
| **Scope** | "Is this MVP?" | "What would version 2.0 have that you're forcing yourself not to build now?" |
| **Failure** | "What if it fails?" | "What failure would be embarrassing vs just annoying?" |

### Step 3: Conduct the Interview

Use AskUserQuestion to ask 2-4 questions at a time. Guidelines:

- **Ask one hard question per batch** - Something that requires real thought
- **Include a "devil's advocate" question** - Challenge an assumption they've made
- **Dig into vague answers** - If they say "it should be fast", ask "what latency would make you switch to a competitor?"
- **Look for contradictions** - If earlier they said X but now imply Y, surface it
- **Ask about feelings** - "What part of this makes you nervous?" often reveals real constraints

### Step 4: Synthesize and Verify

After 2-3 rounds of questions, summarize what you've learned:

```
## Interview Summary

### Core Requirements
- <what must exist>

### Constraints Discovered
- <limits they revealed>

### Tradeoffs Accepted
- <what they're willing to sacrifice>

### Open Questions
- <things still unclear>

### Risks Identified
- <potential problems surfaced>
```

Then ask: "Did I miss anything important? Anything here feel wrong?"

## Question Bank

When stuck, draw from these non-obvious questions:

**Technical depth:**
- "What's the worst data quality you'd tolerate before rejecting input?"
- "If the system had to work offline, what would break first?"
- "What existing system does this need to play nice with that you haven't mentioned?"

**User understanding:**
- "Walk me through what happens when someone uses this at 2am while exhausted"
- "Who's the person most likely to complain about this, and what will they say?"
- "What would power users want that beginners would find confusing?"

**Business/priority:**
- "If this takes 3x longer than expected, what gets cut?"
- "What's the political landmine here that I should know about?"
- "Whose approval do you need that you're worried about?"

**Design/UX:**
- "What's the 'undo' story here?"
- "How does someone know it's working vs frozen?"
- "What should absolutely NOT be customizable?"

**Future-proofing:**
- "What change in your domain would make this design obsolete?"
- "What's the migration story for existing data/users?"
- "When would you know it's time to rewrite this?"

## Constraints

- **Never ask questions with obvious answers** - If you can guess the answer, don't ask
- **Avoid yes/no questions** - They don't reveal much
- **Don't ask more than 4 questions per round** - It's overwhelming
- **Stop when diminishing returns** - 3-4 rounds is usually enough
- **Respect "I don't know"** - That's valuable information too
