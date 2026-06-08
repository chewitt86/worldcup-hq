#!/usr/bin/env bash
# Manage the worldcup-hq container. Run from the project folder (needs docker access).
set -euo pipefail
cd "$(dirname "$0")"
case "${1:-help}" in
  dev)      echo "Local dev: run the API server (terminal 1) and the client (terminal 2):"
            echo "  PORT=3050 ADMIN_PASSWORD=1966 node server/server.js"
            echo "  npm --prefix client run dev    # http://localhost:5173 (proxies /api -> :3050)" ;;
  build)    npm --prefix client run build && echo "✅ Client built -> client/dist" ;;
  restart)  docker restart worldcup-hq && echo "✅ Restarted." ;;
  rebuild)  docker compose up -d --build && docker image prune -f && echo "✅ Rebuilt & running." ;;
  update)   docker compose build --pull && docker compose pull && docker compose up -d && docker image prune -f && echo "✅ Pulled latest base images, rebuilt & running." ;;
  deploy)   git pull --ff-only && docker compose up -d --build && docker image prune -f && echo "✅ Pulled from git, rebuilt & running." ;;
  backup)   ts="$(date +%Y%m%d-%H%M%S)"; mkdir -p backups; cp -r server/data "backups/data-$ts"; echo "✅ Backed up -> backups/data-$ts" ;;
  logs)     docker logs -f worldcup-hq ;;
  status)   docker ps --filter "name=worldcup-hq" --filter "name=cloudflared" ;;
  check)    node --check server/server.js \
              && for f in server/lib/*.js; do node --check "$f"; done \
              && npm --prefix client run typecheck \
              && npm --prefix client test \
              && echo "✅ server syntax + client typecheck + tests OK" ;;
  *) echo "usage: ./manage.sh {dev|build|restart|rebuild|update|deploy|backup|logs|status|check}" ;;
esac
