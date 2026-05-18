# Dev URLs Use the Machine's Hostname, Not `localhost`

**When a skill or script prints a URL the user is meant to click during local development, use the machine's hostname** (`os.hostname()` in Node/Bun, `$(hostname -s)` in shell) **— not `localhost`.**

## Scope

**This is a dev-time workstation convention.** It applies to URLs that the user is meant to follow from a terminal on the dev box or from another Tailnet device (laptop SSHed into the dev box, etc.).

**It does NOT apply to:**
- **Production / homelab deployments.** Real domains via Caddy/Traefik (`chatroom.lddev.xyz`, `<service>.lddev.xyz`, etc.) — those use proper DNS + reverse proxy. The deploy skills (e.g. `deploy-to-homelab`) handle production URLs separately.
- **Internal targets that aren't user-facing**, e.g. Vite's `proxy: { "/api": { target: "http://localhost:3000" } }`, container-to-container traffic over the Docker network, Ollama IPC at `localhost:11434`, server-to-DB connection strings. Those stay `localhost` / service names.
- **URLs printed from inside containers.** `hostname` inside `docker exec` returns the container's ID, not the host. Print URLs from the host shell side, or hardcode the known host hostname if you're scripting from inside.

## Why

The user SSHes into `omarchy-desktop` from a laptop, runs dev flows, then wants to follow links from any terminal on any Tailnet device. A `http://localhost:PORT` URL printed on omarchy-desktop is only clickable on omarchy-desktop. A `http://omarchy-desktop:PORT` URL works from the dev box AND from any Tailnet device with MagicDNS — same string, no translation.

This applies to dev servers, ad-hoc Docker containers, hot-reload setups, and anything else that prints a URL for the user to hit in a browser.

## How to apply

**In TypeScript / Bun scripts:**

```ts
import { hostname } from "node:os";
console.log(`Serving on http://${hostname()}:${port}`);
```

**In shell scripts and skill instructions:**

```sh
echo "Running at http://$(hostname -s):${PORT}"
curl "http://$(hostname -s):${PORT}/health"
```

**In hot-reload WebSocket URLs injected into HTML** — never hardcode the host. Derive it from the page URL so the WS connects back to wherever the user loaded the page from:

```html
<script>
  const ws = new WebSocket(`ws://${location.host}/__reload`);
  ws.onmessage = () => location.reload();
</script>
```

## Prerequisites (already true on this stack)

- **Server binds `0.0.0.0`, not `127.0.0.1`.** Otherwise the kernel rejects non-loopback connections regardless of what the URL says. `Web-Stack-Standard.md` already mandates `HOST=0.0.0.0`; Bun.serve takes `hostname: "0.0.0.0"`.
- **Tailscale MagicDNS** enabled in the tailnet (default). Without it, fall back to `tailscale ip -4` or the full FQDN.

## Caveats

1. **HMR/WebSockets** — Vite's default HMR derives the WS host from the page URL, so loading `http://omarchy-desktop:5173` auto-connects HMR to `ws://omarchy-desktop:5173`. Breaks if a project hardcodes `server.hmr.host` to `localhost`. Don't.

2. **OAuth callbacks** — many dev OAuth flows hardcode `http://localhost:PORT/callback` at the provider. For those: register an additional `http://omarchy-desktop:PORT/callback` with the provider, or do OAuth dev locally only.

3. **Secure-context features** — `localhost` over HTTP counts as a secure context (clipboard API, service workers, WebCrypto subtle, getUserMedia). Custom hostnames over plain HTTP do NOT. If a feature breaks: fall back to localhost for that test, or use `tailscale serve` to get HTTPS at `<hostname>.<tailnet>.ts.net`.

4. **Local resolution from this machine** — the machine's own hostname resolves via NSS `myhostname` (127.0.1.1) on Linux. No `/etc/hosts` change needed.

5. **From other Tailscale devices** — relies on MagicDNS being enabled in the tailnet (default). Without it, use the full FQDN `<hostname>.<tailnet>.ts.net`, or the Tailscale IP from `tailscale ip -4`.

## Exceptions (when `localhost` is still correct)

- **Internal proxy targets inside a single host/container** — e.g. Vite's `proxy: { "/api": { target: "http://localhost:3000" } }`. The proxy runs in the same network namespace; using `localhost` is correct and faster.
- **Local-only IPC** — Ollama at `localhost:11434`, Postgres on the same box, anything not meant to be browser-facing.
- **`0.0.0.0` in env/compose files** — that's the bind address, not a URL. Keep it.
