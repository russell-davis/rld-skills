# Docker Conventions

Cross-cutting conventions for Docker / Docker Compose work on this machine — applies to **all** container work (web projects, homelab services, ad-hoc skills, anything). Stack-specific scaffolds (Bun + Hono + Postgres compose templates, drizzle migration entrypoints, production Dockerfile patterns) live in the companion doc.

**See also:** [`web-stack-standard.md`](web-stack-standard.md) — the bun/hono/react/postgres stack standard, which builds on these conventions for web projects.

## Host Port Mapping: Never Hardcode

**Never pin a specific host port** in compose files. Always let Docker assign one from the range `3000-9999`.

```yaml
ports:
  - '3000-9999:3000'    # Docker picks the first free host port in 3000-9999
```

**Why:** this machine runs many containers (homelab + multiple dev stacks + ad-hoc services). Hardcoded host ports collide — antflash's first `up` failed because `dev-lddev-xyz` already held host port 3000. Dynamic assignment makes any new stack compose with whatever else is already running.

After `docker compose up`, run `docker compose ps` to discover the assigned host ports.

**Gotcha — single colon only.** The empty-host-port form uses a single colon with a range on the left:

```yaml
ports:
  - '3000-9999:5173'    # ✅ correct — Docker picks a host port in 3000-9999
  - '3000-9999::5173'   # ❌ wrong — double-colon means IP::CONTAINER, and "3000-9999" is parsed as an IP address
```

The error from the wrong form is `invalid IP address: 3000-9999`. Don't waste time on it again.

**Exception:** for public-facing production services that need a stable URL (reverse proxies, services behind Caddy/Traefik with a fixed routing config), pin a specific host port. Everything else — dev containers, internal services, anything ephemeral — uses the range.

## Applying Changes to Running Containers

`docker compose restart` only stops/starts existing containers — it does **not** pick up changes to `compose.yml` (command, environment, ports, volumes). To apply config changes:

```bash
docker compose up -d --force-recreate
```

This destroys and rebuilds containers from the updated compose file while preserving named volumes (so DB data persists). Use this whenever you change `command`, `environment`, `ports`, or service config. Plain `restart` is only useful for picking up code changes via bind mounts.

## Universal Compose Patterns

| Pattern | Why |
|---------|-----|
| `container_name: <project>-<service>` (e.g. `scout-dev`, `scout`) | Without it Compose auto-generates `<project-dir>-<service>-<index>`, which becomes `devcontainer-dev-1` when the compose file lives in `.devcontainer/` — generic, collision-prone across stacks, and unpredictable for `docker exec` / `docker logs` / referring to it from scripts |
| `'3000-9999:CONTAINER'` for ports | Avoids host port collisions across stacks (see above) |
| `HOST=0.0.0.0` env | Required so the container process accepts connections from outside its own loopback — without it, port forwarding silently fails |
| `restart: unless-stopped` | Survives reboots, respects manual `docker compose down` |
| Healthcheck + `depends_on: condition: service_healthy` | App waits for DB / dependency to actually be ready, not just running |
| Named volumes for persistent state | DB data, logs survive rebuilds (and `--force-recreate`) |
| Anonymous volume to shadow `node_modules` | Stops host's `node_modules` from leaking into the container when bind-mounting source |
| Mount entrypoint scripts read-only | `./entrypoint.sh:/entrypoint.sh:ro` — script is editable from host, immutable from container |

## The `.devcontainer/` Directory Convention

Every dev environment beyond a single static HTML file gets a `.devcontainer/` directory at the project root:

```
.devcontainer/
├── Dockerfile          # Dev image (base + system deps), if needed
├── compose.yml         # Dev services (app, postgres, ngrok, etc.)
└── .env                # Dev-only env vars (DB creds, debug flags)
```

Optional additions:
```
├── devcontainer.json   # VS Code integration (attach to container)
├── init-db.sql         # Postgres extensions / seed data
└── *-entrypoint.sh     # Per-service startup scripts
```

**Why:** zero host dependencies. Clone the repo, `docker compose -f .devcontainer/compose.yml up`, done. Works identically on any machine — Linux, Mac, teammate's laptop, CI runner. Eliminates "works on my machine."

**The `.env` in `.devcontainer/` is dev-only.** Hardcoded dev credentials (`dev:dev@postgres`), debug flags, local URLs. No secrets, no production values. Safe to commit or `.gitignore` — either way it's throwaway config.

Production compose / Dockerfile live at the project root, not under `.devcontainer/`. The devcontainer is where you iron everything out; prod is the hardened version of what already works.

## Quick Containerization (ad-hoc)

For quickly serving any directory without a full devcontainer setup — sharing a prototype, hosting a static page, testing a build:

1. Write a `server.ts` if none exists (Bun.serve, routes for each .html)
2. Minimal Dockerfile: `FROM oven/bun:1`, `COPY . .`, `CMD ["bun", "server.ts"]`
3. `compose.yml`: build + port mapping (`'3000-9999:3000'`)
4. `docker compose up -d --build`
5. Run `docker compose ps` to discover the assigned host port
6. Accessible at `http://$(hostname -s):PORT` from any Tailnet device (MagicDNS), or `http://$(tailscale ip -4):PORT` as a fallback. See the "Dev URLs Use the Machine's Hostname" section in [`web-stack-standard.md`](web-stack-standard.md) for the rationale.

The `dockerize-webapp` skill encodes this exact pattern.
