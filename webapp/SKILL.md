---
name: webapp
description: Scaffold and build web apps using a tiered approach. Determine the right tier, scaffold at that level, then build incrementally within it. Use when building frontends, prototypes, or web applications.
---

See `references/web-stack-standard.md` for full details.

# Web App Skill

Build web applications using a tiered architecture that matches complexity to need. Determine the right tier, scaffold at that level, then build incrementally within the framework — design first, then functionality.

## Tier Decision Tree

**Start here:** What do you need?

```
Need to run somewhere real (container, CI/CD, hosting)?
  └─ YES → Tier 4: Deployment
  └─ NO ↓

Need frontend architecture (components, routing, React, MDX)?
  └─ YES → Tier 3: Astro
  └─ NO ↓

Need a backend (API, database, auth, secrets, server logic)?
  └─ YES → Tier 2: Bun Server
  └─ NO ↓

Just need to see something?
  └─ YES → Tier 1: Single HTML
```

## Tier Overview

| Tier | Boundary | What It Unlocks | Typical Use |
|------|----------|-----------------|-------------|
| 1 | Client only | Pure prototype, no secrets | Visual mockup, quick demo |
| 2 | + Server | DB, auth, secrets, APIs, hot-reload | Backend logic, data persistence |
| 3 | + Framework | Components, routing, React, MDX | Real frontend architecture |
| 4 | + Deployment | Containers, CI/CD, production hosting | Ship it somewhere |

## Key Principles

1. **Don't over-engineer** - Start at the lowest tier that meets the need
2. **Upgrade signals are clear** - "I need an API" means Tier 2, "I need components" means Tier 3
3. **Each tier is self-contained** - A Tier 2 project works fine without ever becoming Tier 3
4. **Default to Ember Dark theme** - Unless a specific style is requested, use the warm dark theme in `references/default-theme.md`
5. **Scaffold at target, build incrementally** - Don't start at Tier 1 and convert upward. If the interview says Tier 3, scaffold Astro + React immediately, but build in phases: static design with mock data first, then wire up real functionality

## Instructions

### Step 1: Determine the Tier

**ALWAYS run `/interview` first** - even if only to confirm details. Never assume, always ask.

The interview should clarify:
- Is this a quick visual prototype, or something more? → Tier 1 vs higher
- Will you need server-side logic, a database, or secrets? → Tier 2
- Do you want React, components, MDX, or routing? → Tier 3
- Do you need to deploy this somewhere? → Tier 4

Only proceed to scaffolding after the interview confirms the tier and requirements.

### Step 2: Scaffold & Build Incrementally

**Scaffold at the target tier immediately** — don't start lower and convert upward. Then build in phases:

**Phase 1: Scaffold & Design**
1. Create the project directory (in `~/Work/` or `~/Work/Tries/` for experiments)
2. Scaffold using the target tier's reference pattern:
   - `references/tier1-html.md` - Single HTML file
   - `references/tier2-bun.md` - Bun server with optional DB/auth
   - `references/tier3-astro.md` - Astro framework setup
   - `references/tier4-deploy.md` - Deployment patterns
3. Install dependencies if needed (`bun install`)
4. Build the UI with hardcoded/mock data — get pages looking right before wiring anything
5. Start the dev server or open the file in browser, confirm it's running

**Phase 2: Wire Functionality**
- Swap mock data for real API calls
- Connect backend routes, database, auth as needed
- Hook up any external services or integrations

**Phase 3: Operational Polish**
- CLI commands, polling, background jobs
- Deployment config, environment variables
- Anything beyond core functionality

### Step 3: Build the Features

**Keep building** - implement what the user asked for. This skill doesn't stop at scaffolding.

- Write the actual UI, not just boilerplate
- Implement the actual functionality discussed in the interview
- **Apply the default Ember Dark theme** (see `references/default-theme.md`) unless a different style was requested
- Use the `frontend-design` skill only if the user wants a distinctive/custom aesthetic

Don't add things the user didn't ask for:
- Hot-reload unless they're iterating fast on UI
- Database unless they need persistence
- Auth unless they need users
- Docker unless they need deployment

### Step 4: Recognize Upgrade Signals

When the user says something like:
- "I need to save this data" → Needs backend (Tier 2+)
- "I need to call an external API with a secret" → Needs backend (Tier 2+)
- "I need AI integration" → Needs backend (Tier 2+)
- "This is getting messy, I need components" → Tier 3
- "Can we add React?" → Tier 3
- "I want to deploy this" → Tier 4

**Upgrading requires re-interviewing.** Don't assume the target tier. Run `/interview` to determine:
- Tier 2 (Bun) vs Tier 3 (Astro) - do they need just a backend, or full framework?
- Which bedrock features (DB, auth, AI) are actually needed?
- Any other requirements that affect the architecture?

Propose the upgrade, then interview: "You're asking for [X] which requires a backend. Let me ask a few questions to figure out the right setup."

## Bedrock Features (Tier 2+ Only)

These features REQUIRE a backend. If the user asks for any of these and you're at Tier 1, upgrade to Tier 2 first.

| Feature | Requires | Reference |
|---------|----------|-----------|
| Database | Server to run SQLite/Postgres | `references/database.md` |
| Auth | Server for sessions, secrets | `references/auth.md` |
| AI | Server to protect API keys or run local models | `references/ai.md` |

Do NOT attempt to add these to Tier 1 projects. Propose the upgrade and re-interview to determine the right target tier (Tier 2 vs Tier 3) and what else might be needed.

## Constraints

- **Always use Bun** - Never npm
- **Prefer simple** - Don't add complexity until it's needed
- **User's Work directory** - Projects go in `~/Work/` or `~/Work/Tries/` for experiments
- **Browser testing** - For Tier 1, just open the HTML file directly; for Tier 2+, use the dev server
