# Tier 2: Bun Server

A Bun server that serves HTML and optionally provides API routes, database access, and hot-reload.

## When to Use

- Need server-side logic
- Need to store secrets (API keys, credentials)
- Need database access
- Need hot-reload for fast UI iteration
- Need API endpoints

## Structure

```
project/
├── server.ts        # Bun server
├── public/
│   └── index.html   # Frontend (served statically)
├── package.json
└── .env             # Secrets (gitignored)
```

## Minimal Server (Static Only)

```typescript
// server.ts
import { hostname } from "node:os";

const server = Bun.serve({
  port: 3000,
  hostname: "0.0.0.0", // accept connections from Tailnet, not just loopback
  async fetch(req) {
    const url = new URL(req.url);

    // Serve static files from public/
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`./public${filePath}`);

    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at http://${hostname()}:${server.port}`);
```

## With API Routes

```typescript
// server.ts
import { hostname } from "node:os";

const server = Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);

    // API routes
    if (url.pathname.startsWith("/api/")) {
      return handleApi(req, url);
    }

    // Static files
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`./public${filePath}`);

    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

async function handleApi(req: Request, url: URL): Promise<Response> {
  // Example: GET /api/data
  if (url.pathname === "/api/data" && req.method === "GET") {
    return Response.json({ message: "Hello from API" });
  }

  // Example: POST /api/submit
  if (url.pathname === "/api/submit" && req.method === "POST") {
    const body = await req.json();
    // Process body...
    return Response.json({ success: true });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

console.log(`Server running at http://${hostname()}:${server.port}`);
```

## With Hot-Reload (WebSocket)

```typescript
// server.ts
import { hostname } from "node:os";

const clients = new Set<ServerWebSocket<unknown>>();

const server = Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade for hot-reload
    if (url.pathname === "/__reload") {
      if (server.upgrade(req)) return;
    }

    // Static files
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`./public${filePath}`);

    if (await file.exists()) {
      let content = await file.text();

      // Inject hot-reload script into HTML
      if (filePath.endsWith(".html")) {
        content = content.replace(
          "</body>",
          `<script>
            // Derive WS host from page URL so HMR works whether the page was loaded
            // via localhost, the machine's Tailnet hostname, or anything else.
            const ws = new WebSocket(\`ws://\${location.host}/__reload\`);
            ws.onmessage = () => location.reload();
          </script></body>`
        );
      }

      return new Response(content, {
        headers: { "Content-Type": file.type },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) { clients.add(ws); },
    close(ws) { clients.delete(ws); },
    message() {},
  },
});

// Watch for file changes
import { watch } from "fs";
watch("./public", { recursive: true }, () => {
  clients.forEach((client) => client.send("reload"));
});

console.log(`Server running at http://${hostname()}:${server.port}`);
```

## Bedrock Features

Need persistence, auth, or AI? See the bedrock references:
- `references/database.md` - SQLite, Postgres patterns
- `references/auth.md` - Sessions, JWT, access control
- `references/ai.md` - Chat, completions, embeddings

## package.json

```json
{
  "name": "project-name",
  "scripts": {
    "dev": "bun --watch server.ts",
    "start": "bun server.ts"
  }
}
```

## Running

```bash
# Development (auto-restart on server changes)
bun run dev

# Production
bun run start
```

## Upgrade Signals → Tier 3

Time to upgrade when:
- "I need React components"
- "This is getting messy, I need to split into components"
- "I want MDX for content"
- "I need proper routing"
- "I want TypeScript in the frontend with proper tooling"
