# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
RUN npm install -g pnpm@12.10.1
WORKDIR /app

# Stage 1: Dependencies with frozen lockfile
FROM base AS dependencies
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM dependencies AS builder
COPY . .
RUN pnpm --filter @ogroniedu/contracts build && \
    pnpm --filter @ogroniedu/database build && \
    pnpm --filter @ogroniedu/api build

# Stage 3: Production Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init curl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Security: Non-root user
USER node

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/packages/contracts ./packages/contracts
COPY --chown=node:node --from=builder /app/packages/database ./packages/database
COPY --chown=node:node --from=builder /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/package.json ./apps/api/package.json

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
