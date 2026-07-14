# syntax=docker/dockerfile:1
#
# Production strategy: run server.ts through `tsx` in the runtime image
# instead of precompiling it to plain JS.
#
# Why: server.ts and its first-party modules (src/lib, src/server) use the
# `@/*` path alias from tsconfig.json. `tsx` already resolves that alias at
# runtime (it's exactly what `npm run dev` uses today), so reusing it in
# production needs zero extra tooling and zero new failure modes. The
# alternative — bundling server.ts with esbuild to a single plain-JS file —
# would still require shipping the full node_modules tree anyway (Next.js
# itself, Prisma's engine, bcrypt's native bits are never safe to bundle),
# so the only thing it would remove is JIT-transpiling a handful of small
# first-party files, which `tsx` (esbuild under the hood) does in
# low-single-digit milliseconds. Not worth the added build step and the risk
# of a path-alias-resolution mismatch between build time and run time.
# `tsx`, `prisma` (CLI, for `migrate deploy`) and `cross-env` were moved from
# devDependencies to dependencies in package.json for exactly this reason.

# base: shared OS deps for every later stage
FROM node:22-alpine AS base
# openssl is required by Prisma's migration engine on musl/Alpine even though
# query execution itself goes through @prisma/adapter-pg (plain `pg`), not
# Prisma's native query engine.
RUN apk add --no-cache openssl
WORKDIR /app
# Registry flakiness (ECONNRESET mid-download) is common on longer `npm ci`
# runs; make npm retry instead of failing the whole build on one hiccup, and
# cap concurrent connections — fewer parallel sockets tends to survive a
# constrained/unstable network better than npm's aggressive default.
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set maxsockets 4

# deps: full install (incl. devDependencies) — used to build the app
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# prod-deps: production-only node_modules for the runtime image. Pruned from
# `deps` (offline) rather than a second `npm ci --omit=dev`: BuildKit builds
# sibling stages concurrently, and two full network installs racing each
# other is a common way to trip registry connection resets. `npm prune`
# needs no network at all, so it's also faster.
FROM deps AS prod-deps
RUN npm prune --omit=dev

# builder: type-check, generate the Prisma client, build Next.js
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` = `prisma generate && next build`. No page runs a DB query
# at build time (every data-driven route is force-dynamic), but Next.js
# still IMPORTS every route module during "collecting page data" — and
# src/lib/db.ts constructs the Prisma client at module scope, which throws
# immediately if DATABASE_URL is unset. This placeholder is only ever read
# by that constructor during the build; nothing here opens a real
# connection. The runtime stage below gets the real DATABASE_URL from
# .env.production at container start, not from this value.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

# runtime: the image that actually ships
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY package.json ./
COPY server.ts next.config.ts tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY deploy/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && chown -R node:node /app

# The official Node image ships a pre-created, unprivileged `node` user —
# reused here instead of creating a new one.
USER node

EXPOSE 3000

# Talks straight to the app's own /api/health, which also pings the DB —
# see server.ts. Used by both `docker compose` and plain `docker run`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Applies pending migrations (`prisma migrate deploy`, never `migrate dev`)
# before the app starts, then execs the real process as PID 1.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start:prod"]
