# Tier 4: Deployment

Containerization and deployment - devcontainers, Docker, CI/CD, and production hosting.

## When to Use

- Need to run this somewhere real
- Want consistent dev environment (devcontainer)
- Ready to ship to homelab, Railway, or remote server
- Need CI/CD pipeline

## Deployment Options

| Target | Use Case |
|--------|----------|
| Devcontainer | Consistent local dev environment |
| Homelab | Personal infrastructure, full control |
| Railway | Quick cloud deployment, managed |
| Remote server | VPS, custom hosting |

---

## Devcontainer Setup

For consistent development environments across machines.

### Structure

```
project/
├── .devcontainer/
│   ├── devcontainer.json
│   └── docker-compose.yml  # Optional, for services like DB
├── Dockerfile.dev          # Dev image
└── ... (rest of project)
```

### devcontainer.json

```json
{
  "name": "Project Dev",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "customizations": {
    "vscode": {
      "extensions": [
        "astro-build.astro-vscode"
      ]
    }
  },
  "forwardPorts": [3000],
  "postCreateCommand": "bun install"
}
```

### docker-compose.yml (devcontainer)

```yaml
services:
  app:
    build:
      context: ..
      dockerfile: Dockerfile.dev
    volumes:
      - ..:/workspace:cached
    command: sleep infinity
    ports:
      - "3000:3000"
```

### Dockerfile.dev

```dockerfile
FROM oven/bun:latest

WORKDIR /workspace

# Keep container running for devcontainer
CMD ["sleep", "infinity"]
```

---

## Production Dockerfile

### For Tier 2 (Bun Server)

```dockerfile
FROM oven/bun:latest as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY . .

EXPOSE 3000
CMD ["bun", "server.ts"]
```

### For Tier 3 (Astro)

```dockerfile
FROM oven/bun:latest as build
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:latest
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["bun", "run", "./dist/server/entry.mjs"]
```

---

## Homelab Deployment

A homelab deployment can use Docker Compose with a remote context.

### docker-compose.yml (production)

```yaml
services:
  app:
    container_name: project-name
    image: ghcr.io/russell-davis/project-name:latest
    ports:
      - '3000:3000'
    environment:
      - HOST=0.0.0.0
      - PORT=3000
    restart: unless-stopped
```

### Deployment Commands

```bash
# From homelab directory
cd ~/Work/homelab

# Deploy
docker --context devtop compose up -d project-name

# Pull latest and deploy
docker --context devtop compose pull project-name
docker --context devtop compose up -d project-name
```

### GitHub Actions for Auto-Deploy

```yaml
# .github/workflows/deploy.yml
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
```

Watchtower on the homelab will auto-pull and restart.

---

## Railway Deployment

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "bun run start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300
  }
}
```

### Deploy

```bash
# Install Railway CLI if needed
bun install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

---

## .dockerignore

```
node_modules
.git
.env
*.log
dist
.astro
```

## Notes

- Always use `oven/bun` as base image for Bun projects
- For homelab: image goes to GHCR, compose file lives in ~/Work/homelab
- Environment variables: use `.env` locally, Railway/container env vars in production
- Health checks: add a `/health` endpoint for production monitoring
