# syntax=docker/dockerfile:1
# ============================================================================
# Leo's World Cup — multi-stage build.
#   Stage 1 (build): compile the Vite client with the full toolchain.
#   Stage 2 (runtime): a lean, ZERO-dependency Node server that serves the
#   built client + the /api shared board. No npm install at runtime.
# ============================================================================

# ---- stage 1: build the client ----
FROM node:22-alpine AS build
WORKDIR /app/client
# install deps first (better layer caching). `npm install` (not `npm ci`) so the
# build is robust to platform-specific optional deps that a lockfile generated on
# another OS can omit (e.g. @emnapi/* on linux/alpine).
COPY client/package.json client/package-lock.json ./
RUN npm install --no-audit --no-fund
# then build
COPY client/ ./
RUN npm run build

# ---- stage 2: runtime (server + built client, no node_modules) ----
FROM node:22-alpine
WORKDIR /app
# the zero-dependency server (built-in Node modules + global fetch only)
COPY server/ ./server/
# the compiled client, served statically by the server
COPY --from=build /app/client/dist ./client/dist

ENV PORT=3050
ENV NODE_ENV=production
EXPOSE 3050

# the shared board + provider keys persist here — back this folder up
VOLUME /app/server/data

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3050/api/health || exit 1

CMD ["node", "server/server.js"]
