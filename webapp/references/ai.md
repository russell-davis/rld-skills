# AI Integration

> **Requires Tier 2+** - AI integration needs a backend for API key protection or local model access. If currently at Tier 1, upgrade first.

## Setup

```bash
bun add ai @ai-sdk/openai  # or @ai-sdk/anthropic
```

For local models (Ollama):
```bash
bun add ai ollama-ai-provider
```

## Provider Setup

### Remote Providers

```typescript
// OpenAI
import { openai } from '@ai-sdk/openai';
const model = openai('gpt-4o');

// Anthropic
import { anthropic } from '@ai-sdk/anthropic';
const model = anthropic('claude-sonnet-4-20250514');
```

### Local Models (Ollama)

```typescript
import { createOllama } from 'ollama-ai-provider';

const ollama = createOllama();  // defaults to localhost:11434
const model = ollama('llama3.1');
```

## Text Generation

```typescript
import { generateText } from 'ai';

const { text } = await generateText({
  model,
  prompt: 'Explain quantum computing in one sentence.',
});
```

## Streaming (Tier 2)

```typescript
import { streamText } from 'ai';

async function handleApi(req: Request, url: URL): Promise<Response> {
  if (url.pathname === "/api/chat" && req.method === "POST") {
    const { messages } = await req.json();

    const result = streamText({
      model,
      messages,
    });

    return result.toDataStreamResponse();
  }
}
```

## Chat Interface (Tier 3 - React)

The AI SDK provides React hooks for chat UIs.

### API Route

```typescript
// src/pages/api/chat.ts
import type { APIRoute } from 'astro';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const POST: APIRoute = async ({ request }) => {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });

  return result.toDataStreamResponse();
};
```

### React Component

```tsx
// src/components/Chat.tsx
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      <div>
        {messages.map((m) => (
          <div key={m.id}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
```

### Astro Page

```astro
---
// src/pages/chat.astro
import Layout from '../layouts/Layout.astro';
import Chat from '../components/Chat';
---

<Layout title="Chat">
  <Chat client:load />
</Layout>
```

## Completions (Single Response)

For one-shot completions without chat history:

```tsx
// src/components/Completion.tsx
import { useCompletion } from '@ai-sdk/react';

export default function Completion() {
  const { completion, input, handleInputChange, handleSubmit, isLoading } = useCompletion({
    api: '/api/complete',
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Enter a prompt..."
        />
        <button type="submit" disabled={isLoading}>Generate</button>
      </form>
      <p>{completion}</p>
    </div>
  );
}
```

## Embeddings

For semantic search, RAG, similarity.

```typescript
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// Single embedding
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'The quick brown fox',
});

// Batch embeddings
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: ['First text', 'Second text', 'Third text'],
});
```

## Structured Output

Get typed JSON responses:

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model,
  schema: z.object({
    name: z.string(),
    age: z.number(),
    interests: z.array(z.string()),
  }),
  prompt: 'Generate a fictional person profile.',
});
// object is typed: { name: string, age: number, interests: string[] }
```

## Tool Use

Let the model call functions:

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { text } = await generateText({
  model,
  prompt: 'What is the weather in San Francisco?',
  tools: {
    getWeather: tool({
      description: 'Get the weather for a location',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        // Call weather API
        return { temp: 72, condition: 'sunny' };
      },
    }),
  },
});
```
