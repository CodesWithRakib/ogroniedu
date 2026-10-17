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
ENV NEXT_TELEMETRY_DISABLED=1
RUN rm -f apps/web/*.tsbuildinfo && \
    pnpm --filter @ogroniedu/contracts build && \
    pnpm --filter @ogroniedu/web build

# Stage 3: Production Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Security: Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone server and static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
