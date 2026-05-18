# Auth

> **Requires Tier 2+** - Auth needs a server for sessions and secret management. If currently at Tier 1, upgrade first.

## Simple Session Auth

Good for: prototypes, internal tools, single-user apps.

### Cookie-Based Sessions (Tier 2)

```typescript
import { Database } from "bun:sqlite";

const db = new Database("data.db");
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    expires_at DATETIME
  )
`);

function createSession(userId: number): string {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  db.run(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    [sessionId, userId, expiresAt.toISOString()]
  );
  return sessionId;
}

function getSession(sessionId: string): { userId: number } | null {
  const session = db.query(
    "SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')"
  ).get(sessionId);
  return session ? { userId: session.user_id } : null;
}

// In your request handler:
async function handleRequest(req: Request): Promise<Response> {
  const cookies = parseCookies(req.headers.get("cookie") || "");
  const session = cookies.session ? getSession(cookies.session) : null;

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // User is authenticated, session.userId available
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split("; ").map(c => c.split("="))
  );
}
```

### Login Endpoint

```typescript
if (url.pathname === "/api/login" && req.method === "POST") {
  const { username, password } = await req.json();

  const user = db.query(
    "SELECT id, password_hash FROM users WHERE username = ?"
  ).get(username);

  if (!user || !await verifyPassword(password, user.password_hash)) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionId = createSession(user.id);

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      "Set-Cookie": `session=${sessionId}; HttpOnly; Path=/; SameSite=Strict`,
      "Content-Type": "application/json",
    },
  });
}
```

### Password Hashing

```typescript
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}
```

## JWT Auth

Good for: APIs, stateless auth, mobile clients.

```bash
bun add jose
```

```typescript
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function createToken(userId: number): Promise<string> {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

async function verifyToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as number };
  } catch {
    return null;
  }
}

// In your request handler:
async function handleRequest(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  // User is authenticated, payload.userId available
}
```

## Auth Middleware (Tier 3 - Astro)

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip auth for public routes
  if (context.url.pathname.startsWith('/public')) {
    return next();
  }

  const sessionId = context.cookies.get('session')?.value;
  if (!sessionId) {
    return context.redirect('/login');
  }

  const session = getSession(sessionId);
  if (!session) {
    return context.redirect('/login');
  }

  context.locals.userId = session.userId;
  return next();
});
```

## OAuth (External Providers)

For Google, GitHub, etc. Use `arctic` for OAuth flows:

```bash
bun add arctic
```

```typescript
import { GitHub } from 'arctic';

const github = new GitHub(
  process.env.GITHUB_CLIENT_ID,
  process.env.GITHUB_CLIENT_SECRET
);

// Redirect to GitHub
const [url, state] = await github.createAuthorizationURL([]);
// Store state in cookie, redirect user to url

// Handle callback
const code = url.searchParams.get("code");
const tokens = await github.validateAuthorizationCode(code);
// Use tokens.accessToken to fetch user info from GitHub API
```
