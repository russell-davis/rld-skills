# Tier 3: Astro

Full frontend framework with components, routing, React support, and MDX.

## When to Use

- Need React components
- Need proper routing
- Need MDX for content
- Frontend is getting complex enough to need architecture
- Want TypeScript with proper tooling

## Scaffolding

```bash
# Create new Astro project with Bun
cd ~/Work  # or ~/Work/Tries for experiments
bun create astro@latest -- --template minimal project-name
cd project-name
```

## Structure

```
project/
├── src/
│   ├── components/    # Astro/React components
│   ├── layouts/       # Page layouts
│   ├── pages/         # File-based routing
│   │   ├── index.astro
│   │   └── api/       # API routes
│   └── content/       # MDX content (optional)
├── public/            # Static assets
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Output mode: 'static' (default) or 'server' for SSR
  output: 'server',

  // Server settings
  server: {
    port: 3000,
    host: true,
  },
});
```

## Adding React

```bash
bun astro add react
```

Then in astro.config.mjs:

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  integrations: [react()],
});
```

## Adding MDX

```bash
bun astro add mdx
```

## Page Example (Astro)

```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Counter from '../components/Counter';
---

<Layout title="Home">
  <h1>Welcome</h1>
  <Counter client:load />
</Layout>
```

## React Component Example

```tsx
// src/components/Counter.tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

## API Route Example

```typescript
// src/pages/api/data.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return Response.json({ message: "Hello from API" });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  // Process...
  return Response.json({ success: true });
};
```

## Layout Example

```astro
---
// src/layouts/Layout.astro
interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body>
  <slot />
</body>
</html>
```

## Running

```bash
# Development (hot-reload via Vite)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## package.json Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

## Upgrade Signals → Tier 4

Time to upgrade when:
- "I want to deploy this"
- "I need a dev container"
- "I want CI/CD"
- "This needs to run on my homelab / Railway / a server"
