# ── Stage 1: Build Vite client ────────────────────────────────
FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/

RUN pnpm install --frozen-lockfile

COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js index.html ./
COPY src/ src/
RUN pnpm build

# ── Stage 2: Production runtime ───────────────────────────────
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/

# Install server deps only (tsx is in devDeps but needed for start)
RUN pnpm install --frozen-lockfile --filter server

# Copy server source
COPY server/src/ server/src/
COPY server/tsconfig.json server/

# Copy built Vite client from stage 1
COPY --from=build /app/dist/ dist/

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["pnpm", "--filter", "server", "start"]
