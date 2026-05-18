# Database

> **Requires Tier 2+** - Database access needs a server. If currently at Tier 1, upgrade first.

## SQLite (Bun Built-in)

Zero dependencies, built into Bun. Good for: prototypes, single-server apps, local-first.

```typescript
import { Database } from "bun:sqlite";

const db = new Database("data.db");

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Query
const items = db.query("SELECT * FROM items").all();

// Insert
const result = db.run("INSERT INTO items (name) VALUES (?)", [name]);
const id = result.lastInsertRowid;

// Parameterized queries (prevent SQL injection)
const item = db.query("SELECT * FROM items WHERE id = ?").get(id);
```

### API Route Pattern (Tier 2)

```typescript
async function handleApi(req: Request, url: URL): Promise<Response> {
  if (url.pathname === "/api/items" && req.method === "GET") {
    const items = db.query("SELECT * FROM items").all();
    return Response.json(items);
  }

  if (url.pathname === "/api/items" && req.method === "POST") {
    const { name } = await req.json();
    const result = db.run("INSERT INTO items (name) VALUES (?)", [name]);
    return Response.json({ id: result.lastInsertRowid });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
```

### API Route Pattern (Tier 3 - Astro)

```typescript
// src/pages/api/items.ts
import type { APIRoute } from 'astro';
import { Database } from "bun:sqlite";

const db = new Database("data.db");

export const GET: APIRoute = async () => {
  const items = db.query("SELECT * FROM items").all();
  return Response.json(items);
};

export const POST: APIRoute = async ({ request }) => {
  const { name } = await request.json();
  const result = db.run("INSERT INTO items (name) VALUES (?)", [name]);
  return Response.json({ id: result.lastInsertRowid });
};
```

## Postgres

For multi-server, production, or when you need Postgres features.

```bash
bun add postgres
```

```typescript
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

// Query
const items = await sql`SELECT * FROM items`;

// Insert
const [item] = await sql`
  INSERT INTO items (name) VALUES (${name})
  RETURNING *
`;

// Parameterized (automatic with template literals)
const item = await sql`SELECT * FROM items WHERE id = ${id}`;
```

## Drizzle ORM (Optional)

Type-safe queries if you want an ORM.

```bash
bun add drizzle-orm
bun add -d drizzle-kit
```

```typescript
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

const sqlite = new Database('data.db');
const db = drizzle(sqlite);

// Schema
const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

// Query
const allItems = await db.select().from(items);

// Insert
await db.insert(items).values({ name: 'New item' });
```
