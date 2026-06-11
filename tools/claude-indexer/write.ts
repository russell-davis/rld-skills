import type { SessionMeta } from "./parse.ts";

export function buildMarkdown(meta: SessionMeta, transcript: string): string {
  return `---
session: ${meta.sessionId}
project: ${meta.project}
date: ${meta.date}
last: ${meta.lastTimestamp}
turns: ${meta.turns}
---

# Session ${meta.date} — ${meta.project}

${transcript}
`;
}
