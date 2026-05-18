# Web Stack Standard

Personal standard stack and decision tree for scaffolding new web projects.

**See also:** [`docker-conventions.md`](docker-conventions.md) — cross-cutting Docker / Compose rules (host port range, `.devcontainer/` directory layout, `up -d --force-recreate`, universal compose patterns). All container work on this machine follows those conventions; this doc layers stack-specific scaffolds on top.

## The Standard Stack

The default for any new interactive web project:

```
Bun.serve()   HTTP server + bundler + dev server (replaces Vite)
Hono          API framework when you need one (also Tier 2)
React         SPA frontend (via Bun's HTML imports)
TanStack      Query (data fetching, cache); Router only if needed
Drizzle       ORM (type-safe, lightweight)
Postgres      Database (always, even for simple projects)
Bun           Runtime + package manager (never npm)
Docker        Dev containers + production deployment
```

## Decision Tree

```
What are you building?
|
+-- Quick visual prototype, no server?
|   -> Tier 1: Single HTML file
|   Open directly in browser. No tooling needed.
|
+-- Backend only (API, service, no frontend)?
|   -> Tier 2: Bun + Hono
|      DB: Drizzle + Postgres
|      Dev: .devcontainer/ with Postgres service
|
+-- Has a frontend?
|   |
|   +-- Content-first (blog, docs, marketing + some interactive bits)?
|   |   -> Astro (+ React/Preact islands)
|   |      API: Astro SSR routes (no separate server)
|   |      DB: Drizzle + Postgres if needed
|   |      Dev: .devcontainer/ with oven/bun image
|   |
|   +-- Interactive app (dashboard, forms, data viz, live updates)?
|       |
|       +-- No API, or only talks to external APIs?
|       |   -> Tier 3A: Bun.serve() + React (HTML imports)
|       |      Server: Bun.serve({ routes: { "/": index } })
|       |      Data:   TanStack Query (no router, or code-based)
|       |      UI:     Pick per project (Mantine, Tailwind+CVA, shadcn)
|       |      Arch:   One process, no separate dev server, dev = prod
|       |
|       +-- Has its own API?
|       |   -> Tier 3B: Bun.serve() + React + Hono (one process)
|       |      Server: Bun.serve with "/" -> index, "/api/*" -> Hono
|       |      Data:   TanStack Query + Hono RPC client (typed boundary)
|       |              + TanStack Router code-based, or none
|       |      DB:     Drizzle + Postgres
|       |      UI:     Pick per project
|       |      Arch:   One server.ts, one port, dev = prod (no vite build)
|       |      Dev:    .devcontainer/ with Postgres service
|       |
|       +-- Need TanStack Router file-based routing
|           (or other Vite-only plugin)?
|           -> Tier 3C: Vite + React + Hono (escape hatch)
|              API:  Hono (serves built Vite assets at / and /api/*)
|              Data: TanStack Router (file-based) + Query
|              DB:   Drizzle + Postgres
|              Arch: Single server, one Dockerfile, one port
|              Dev:  .devcontainer/ with Postgres service
|
+-- Multiple packages (server + clients + shared types)?
|   -> Bun workspace monorepo
|      Each package gets its own tier decision
|      Dev: .devcontainer/ with per-service entrypoints
|
+-- Deployment (orthogonal, add to any tier):
    Dockerfile (multi-stage: build -> serve)
    compose.yml (app + postgres)
    Target: homelab (GHCR + Watchtower) or Railway
```

## The `.devcontainer/` Directory

Every project beyond Tier 1 gets a `.devcontainer/` directory. The directory layout, dev-only `.env` convention, and "zero host dependencies" rationale are in [`docker-conventions.md`](docker-conventions.md). This section covers the dev-to-prod pipeline specific to this stack.

### Dev-to-Production Pipeline

The devcontainer is where you iron everything out. Once the app works reliably in the dev container, preparing for production is trivial — you already know exactly what the app needs because you've been running it in a container the whole time.

Production files live at the project root:

```
project/
├── .devcontainer/           # Dev environment (already working)
│   ├── Dockerfile
│   ├── compose.yml
│   └── .env
├── Dockerfile              # Prod image (multi-stage, optimized)
├── compose.yml             # Prod services (app + postgres)
├── .env                    # Prod secrets (gitignored, never committed)
├── .env.example            # Template showing required vars (committed)
└── src/
```

**The root Dockerfile** is a multi-stage build derived from the dev Dockerfile. You already know the base image, system deps, and build steps — just add the optimization layer (smaller final image, no dev deps, `--frozen-lockfile`).

**The root `compose.yml`** mirrors the dev compose but with production concerns: real credentials via `.env`, restart policies, health checks, no bind mounts (image contains everything), no exposed DB ports.

**`.env.example`** is committed and shows every required variable with placeholder values:

```env
# .env.example — copy to .env and fill in real values
DATABASE_URL=postgresql://user:password@postgres:5432/app
HOST=0.0.0.0
PORT=3000
```

**`.env`** is gitignored and contains real production secrets. Never committed.

The progression is linear:
1. Build the app in `.devcontainer/` — deps, services, config all containerized
2. Get it working — tests pass, migrations run, dev server serves
3. Copy patterns to root — Dockerfile becomes multi-stage, compose drops bind mounts, .env gets real creds
4. Deploy — push image to GHCR, `docker compose up` on the target

No surprises at deploy time because prod is just a hardened version of what you've been running all along.

## Dev URLs Use the Machine's Hostname

**Dev URLs printed for the user use the machine's hostname, not `localhost`.** Tailscale MagicDNS makes the machine reachable from any Tailnet device at `http://<hostname>:PORT`, so the same URL works whether you're on the dev box itself or SSHed in from a laptop — Cmd-click in any terminal opens the page in that device's browser.

> **Scope: dev-time workstation convention only.** This applies when a skill or script on a workstation prints a URL for *you* to click during development. **Production and homelab deployments are unaffected** — those go through real domains via Caddy/Traefik (`chatroom.lddev.xyz`, etc.) and use proper DNS + reverse proxy, not the `hostname:PORT` pattern. Internal proxy targets (Vite → Hono, container-to-container traffic, Ollama IPC) also keep `localhost` / service names.

```ts
// In scripts/skills that print URLs:
import { hostname } from "node:os";
console.log(`Serving on http://${hostname()}:${server.port}`);
```

```sh
# In shell-flavored output:
echo "Running at http://$(hostname -s):${PORT}"
```

This relies on three things being true (all already standard on this stack):

1. **Servers bind `0.0.0.0`, not `127.0.0.1`.** Required so the kernel accepts non-loopback connections. Already mandated above (`HOST=0.0.0.0`).
2. **Tailscale MagicDNS** is enabled in the tailnet (default). Resolves the short hostname from any Tailnet device.
3. **Browser HMR clients derive the WS host from the page URL** — never hardcode `ws://localhost`. Vite's default behavior is correct; Bun.serve hot-reload scripts should use `` `ws://${location.host}/...` ``.

Caveats and the full rule live in [`dev-urls-use-hostname.md`](dev-urls-use-hostname.md) — OAuth callback registration, secure-context features (`localhost` is treated as secure over HTTP, custom hostnames are not), and the fallback to `tailscale ip -4` when MagicDNS isn't available.

## Architecture: Always Single Server

For projects with both API and frontend:

- **Tier 3A/3B (default):** `Bun.serve()` is both the bundler/dev server and the HTTP server. Same `server.ts` runs in dev and prod — no `vite build` step, no separate dev server process, no proxy. HMR is provided by Bun's `development: { hmr: true }`.
- **Tier 3C (escape hatch):** Hono serves the built Vite assets at `/` and API at `/api/*`. Two processes in dev (Vite + Hono), one process in prod.
- One Dockerfile, one port in all cases.
- No CORS, no proxy config, no split containers.
- Scale the single container if needed.

Two-container setups only if there's a concrete reason (independent scaling, different runtimes).

## Bun.serve() + Hono Pattern (Tier 3B)

The canonical Tier 3B server collapses frontend bundling and API into one process:

```ts
// server.ts
import { Hono } from "hono";
import index from "./index.html";

const api = new Hono().basePath("/api");
api.get("/users/:id", c => c.json({ id: c.req.param("id") }));
// ... rest of API routes

const app = Bun.serve({
  routes: {
    "/": index,                          // Bun bundles + serves the SPA
    "/api/*": req => api.fetch(req),     // Hono handles the API
  },
  development: { hmr: true, console: true },
});

export type Api = typeof api;            // for the typed RPC client
```

On the client, Hono's RPC client gives you full type safety across the boundary:

```ts
// src/client/api.ts
import { hc } from "hono/client";
import type { Api } from "../../server";

export const api = hc<Api>("/");
// api.api.users[":id"].$get({ param: { id: "42" } })  ← fully typed
```

Why this is the default:
- One process, one port — `bun --hot ./server.ts` for dev, `bun ./server.ts` for prod
- Bun's bundler handles `.tsx`, CSS, Tailwind, HMR — no Vite config to maintain
- Hono brings middleware (CORS, auth, validators, OpenAPI) and the typed RPC client
- Dev and prod run the **same code path** — fewer surprises at deploy time

## Devcontainer Patterns

Three patterns, from simple to complex. All compose examples below follow the host port range convention (`'3000-9999:CONTAINER_PORT'`) defined in [`docker-conventions.md`](docker-conventions.md) — see that doc for the rule, rationale, and the double-colon gotcha.

### Minimal (single service, no DB)

For Tier 2 projects or Astro sites. No custom Dockerfile needed.

```yaml
# .devcontainer/compose.yml
services:
  dev:
    image: oven/bun:latest
    working_dir: /app
    ports:
      - '3000-9999:3000'
    volumes:
      - ..:/app
      - /app/node_modules          # anonymous volume, isolates from host
    environment:
      - HOST=0.0.0.0
    command: sh -c "bun install && bun run dev"
    restart: unless-stopped
```

### Standard (app + Postgres)

The default for most interactive projects.

```yaml
# .devcontainer/compose.yml
services:
  dev:
    image: oven/bun:latest
    working_dir: /app
    ports:
      - '3000-9999:3000'
    volumes:
      - ..:/app
      - /app/node_modules
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://dev:dev@postgres:5432/app
    command: sh -c "bun install && bun run dev"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d app"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '3000-9999:5432'

volumes:
  postgres_data:
```

### Full (monorepo, multi-service)

For Bun workspace projects with multiple services. Custom Dockerfile with system deps, named volumes, entrypoint scripts per service.

```yaml
# .devcontainer/compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    working_dir: /home/user/app
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://dev:dev@postgres:5432/app
    volumes:
      - ..:/home/user/app
      - node_modules:/home/user/app/node_modules
      - ./api-entrypoint.sh:/api-entrypoint.sh:ro
    ports:
      - "3000-9999:8920"
    command: sh /api-entrypoint.sh
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: Dockerfile
    working_dir: /home/user/app/packages/web
    environment:
      API_PROXY_TARGET: http://api:8920
    volumes:
      - ..:/home/user/app
      - node_modules:/home/user/app/node_modules
      - ./web-entrypoint.sh:/web-entrypoint.sh:ro
    ports:
      - "3000-9999:8910"
    command: sh /web-entrypoint.sh
    depends_on:
      api:
        condition: service_started

  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d app"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  node_modules:
  postgres_data:
```

Custom Dockerfile for system deps:

```dockerfile
FROM oven/bun:1-debian
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git ripgrep jq && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /home/bun/app
USER bun
```

Entrypoint scripts handle: bun install, migrations, dev server start.

### VS Code Devcontainer Integration (optional)

When developing inside VS Code, add a `devcontainer.json` that points to the compose file:

```json
{
  "name": "Project Dev",
  "dockerComposeFile": "compose.yml",
  "service": "dev",
  "workspaceFolder": "/app",
  "postCreateCommand": "bun install",
  "forwardPorts": [3000, 5432]
}
```

For VS Code-attached development, the service uses `command: sleep infinity` instead of running the dev server directly - VS Code attaches to the container and you run commands from the integrated terminal.

### Postgres Extensions & Init Scripts

When you need extensions like pgvector, mount an init script:

```yaml
postgres:
  image: pgvector/pgvector:pg15    # or postgres:17 for vanilla
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
```

```sql
-- init-db.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Entrypoint Script Pattern

For anything beyond `bun install && bun run dev`, use an entrypoint script:

```sh
#!/bin/sh
set -e
bun install                              # Install deps
cd packages/db && bun drizzle-kit push   # Run migrations
cd /app && exec bun run dev              # Start dev server
```

Mount as read-only: `./dev-entrypoint.sh:/dev-entrypoint.sh:ro`

### Ngrok for Webhook Development

When building Slack bots or anything that needs inbound webhooks:

```yaml
ngrok:
  image: ngrok/ngrok:latest
  env_file:
    - .env
  command: http app:3000 --log stdout
  ports:
    - "3000-9999:4040"   # ngrok dashboard (Docker assigns host port)
```

The app discovers its tunnel URL via `http://ngrok:4040` API.

### Stack-Specific Patterns

| Pattern | Why |
|---------|-----|
| `..:/app` bind mount | Source code editable from host, runs in container |
| `/app/node_modules` anonymous or named volume | Isolates Bun-installed deps from host filesystem |
| Postgres healthcheck + `depends_on` | App waits for DB to be ready before drizzle migrations run |
| Entrypoint script: bun install → drizzle-kit push → dev server | The canonical Tier 3B startup sequence |

For universal patterns (port ranges, `HOST=0.0.0.0`, healthchecks, named volumes, `restart: unless-stopped`, applying compose changes with `--force-recreate`), see [`docker-conventions.md`](docker-conventions.md).

## Quick Docker Serving (ad-hoc)

For one-off containerization (serving a prototype, sharing via Tailscale, testing a build) without a full devcontainer setup, see the "Quick Containerization" section in [`docker-conventions.md`](docker-conventions.md). The `dockerize-webapp` skill encodes that pattern.

## Production Deployment

### Dockerfile — Default (Tier 3A / 3B)

Bun.serve() bundles on the fly, so prod doesn't need a separate build step. Multi-stage just installs prod deps in a clean image:

```dockerfile
# Deps stage — install production dependencies only
FROM oven/bun:latest as deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Production stage
FROM oven/bun:latest
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "server.ts"]
```

The same `server.ts` ran your dev container — there is no `bun run build` artifact to copy.

### Dockerfile — Tier 3C (Vite escape hatch)

Only when Vite is in play. Build the SPA into `dist/`, then Hono serves it at `/`:

```dockerfile
# Build stage
FROM oven/bun:latest as build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build                        # vite build -> dist/

# Production stage
FROM oven/bun:latest
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "server.ts"]
```

### docker-entrypoint.sh

The entrypoint is the startup gate — it runs before `CMD`, handles migrations, waits for dependencies, and then `exec`s the final process. Separating `ENTRYPOINT` from `CMD` means you can override the command (`docker run <image> bun run other-thing`) without losing the startup logic.

```sh
#!/bin/sh
set -e

# Run migrations if DB is available
if [ -n "$DATABASE_URL" ]; then
  echo "Running migrations..."
  bun drizzle-kit push
fi

# Hand off to CMD — exec replaces the shell so CMD's process gets PID 1
# (receives signals correctly, clean shutdown)
exec "$@"
```

Key rules:
- **Always `exec "$@"`** at the end — this replaces the shell with the CMD process so it gets PID 1 and receives SIGTERM properly for clean shutdown
- **Keep it idempotent** — migrations, seed checks, cache warmup should all be safe to re-run
- **Fail fast** — `set -e` means a failed migration stops the container instead of running the app against a broken schema
- **Lives in the repo root** as `docker-entrypoint.sh`, gets `COPY`'d into the image

### compose.yml (production)

```yaml
services:
  app:
    build: .
    ports:
      - '3000-9999:3000'    # Docker assigns host port; for public-facing prod, pin a specific port instead
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:17
    env_file:
      - .env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

All credentials come from `.env` (gitignored). The committed `.env.example` documents what's required:

```env
# .env.example
DATABASE_URL=postgresql://user:password@postgres:5432/app
POSTGRES_DB=app
POSTGRES_USER=user
POSTGRES_PASSWORD=changeme
HOST=0.0.0.0
PORT=3000
```

### Deployment Targets

| Target | How |
|--------|-----|
| **Homelab** | Push to GHCR via GitHub Actions, Watchtower auto-pulls. Compose file in homelab repo. |
| **Railway** | `railway.json` + `railway up`. Or connect repo for auto-deploy. |
| **Local Docker** | `docker compose up -d` directly on the machine. |

Homelab pattern: image goes to GHCR, compose entry in homelab repo, deploy with `docker --context <host> compose up -d <service>`.

## Scaffolding Reference

Every tier beyond Tier 1 shares this common project shell:

```
project/
├── .devcontainer/
│   ├── compose.yml       # Dev services
│   └── .env              # Dev-only env vars
├── Dockerfile            # Prod (multi-stage)
├── docker-entrypoint.sh  # Prod startup (migrations, then exec CMD)
├── compose.yml           # Prod services
├── .env                  # Prod secrets (gitignored)
├── .env.example          # Required vars template
├── package.json
├── tsconfig.json
└── src/                  # (varies by tier, see below)
```

### Tier 1: Single HTML

```
project/
└── index.html
```

### Tier 2: Bun + Hono API

```
project/
├── ...                   # common shell
├── drizzle.config.ts
└── src/
    ├── index.ts          # Hono app
    ├── db/
    │   ├── schema.ts     # Drizzle schema
    │   └── index.ts      # Drizzle client
    └── routes/
```

### Astro (content-first, un-numbered — different axis)

```
project/
├── ...                   # common shell
├── astro.config.mjs
├── public/
└── src/
    ├── components/       # Astro/React components
    ├── layouts/
    ├── pages/
    │   ├── index.astro
    │   └── api/          # API routes (if SSR)
    └── content/          # MDX (optional)
```

### Tier 3A: Bun.serve() + React (no API, or external API only)

```
project/
├── ...                   # common shell
├── server.ts             # Bun.serve({ routes: { "/": index } })
├── index.html            # <script type="module" src="./src/frontend.tsx">
└── src/
    ├── frontend.tsx      # createRoot, App entry
    ├── components/
    ├── queries/          # TanStack Query hooks (if hitting external APIs)
    └── styles.css        # Tailwind via Bun's CSS bundler
```

No bundler config, no separate dev server. `bun --hot ./server.ts` does everything.

### Tier 3B: Bun.serve() + React + Hono (one process, default for apps with own API)

```
project/
├── ...                   # common shell
├── drizzle.config.ts
├── server.ts             # Bun.serve: "/" -> index, "/api/*" -> Hono
├── index.html
└── src/
    ├── client/           # React SPA
    │   ├── components/
    │   ├── queries/      # TanStack Query hooks (typed via Hono RPC)
    │   ├── api.ts        # hc<Api>("/") — typed RPC client
    │   ├── frontend.tsx
    │   └── routes.tsx    # TanStack Router code-based, or omit
    ├── server/           # Hono API
    │   ├── routes/
    │   ├── db/
    │   │   ├── schema.ts
    │   │   └── index.ts
    │   └── api.ts        # const api = new Hono(); export type Api
    └── shared/           # Types shared between client/server
```

`server.ts` imports both `index.html` (Bun bundles the SPA) and the Hono `api`. One process serves both in dev and prod.

### Tier 3C: Vite + React + Hono (escape hatch — needs Vite plugin)

Use only when TanStack Router file-based routing or another Vite-only plugin is required.

```
project/
├── ...                   # common shell
├── vite.config.ts
├── drizzle.config.ts
└── src/
    ├── client/           # React SPA
    │   ├── components/
    │   ├── routes/       # TanStack Router file-based
    │   ├── queries/      # TanStack Query hooks
    │   ├── main.tsx
    │   └── router.tsx
    ├── server/           # Hono API (serves dist/ at /, API at /api/*)
    │   ├── routes/
    │   ├── db/
    │   │   ├── schema.ts
    │   │   └── index.ts
    │   └── index.ts
    └── shared/           # Types shared between client/server
```

### Bun Workspace Monorepo

```
project/
├── .devcontainer/
│   ├── Dockerfile        # Dev image (system deps)
│   ├── compose.yml
│   ├── .env
│   └── *-entrypoint.sh   # Per-service startup
├── ...                   # common shell (rest)
├── tsconfig.base.json
└── packages/
    ├── core/             # Shared types + client
    ├── app/              # Main app (API + frontend)
    └── <other>/          # Extensions, CLIs, etc.
```

## UI Library (Not Prescribed)

UI library varies per project. Choose during planning:

| Library | Good For |
|---------|----------|
| **Mantine** | Full component library, forms, selects, modals |
| **Tailwind + CVA** | Custom design, utility-first, class variance |
| **shadcn/ui** | Radix primitives, copy-paste components |
| **d3** | Heavy data visualization, custom charts |

## What Doesn't Make the Cut

- **Vite by default** — Bun's native bundler + `Bun.serve()` HTML imports cover dev server, HMR, and bundling in one process. Dev and prod run the same `server.ts`. Keep Vite only when a required plugin (e.g. TanStack Router file-based routing) demands it. That's Tier 3C.
- **Astro for interactive apps** — islands model fights you when everything needs `client:load`. Astro is for content-first sites only.
- **TanStack Start** — still maturing, SSR hydration not battle-tested with component libraries like Mantine
- **Elysia** — evaluated, no compelling advantage over Hono
- **SQLite** — Postgres always wins (existing infra, multi-user future-proofing)
- **Two-container split** — adds CORS, networking, debugging complexity for no benefit at personal scale
- **Prisma** — Drizzle is lighter, more composable, preferred
- **npm** — never. Always Bun.
- **Express** — too heavy. Hono is the standard.
- **Running bun install on the host** — devcontainers handle deps inside the container, though local dev without the container is fine too
