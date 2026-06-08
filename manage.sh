#!/usr/bin/env bash
# Manage the worldcup-hq container. Run from the project folder (needs docker access).
set -euo pipefail
cd "$(dirname "$0")"
case "${1:-help}" in
  refresh) echo "Front-end (public/index.html) edits are live on a browser refresh — nothing to do." ;;
  restart) docker restart worldcup-hq && echo "✅ Restarted — applied server.js/fetcher.js changes." ;;
  rebuild) docker compose up -d --build && docker image prune -f && echo "✅ Rebuilt & running." ;;
  update)  docker compose build --pull && docker compose pull && docker compose up -d && docker image prune -f && echo "✅ Pulled latest base images, rebuilt & running." ;;
  backup)  ts="$(date +%Y%m%d-%H%M%S)"; mkdir -p backups; cp -r data "backups/data-$ts"; echo "✅ Backed up -> backups/data-$ts" ;;
  deploy)  git pull --ff-only && docker compose up -d --build && docker image prune -f && echo "✅ Pulled from git, rebuilt & running." ;;
  logs)    docker logs -f worldcup-hq ;;
  status)  docker ps --filter "name=worldcup-hq" --filter "name=cloudflared" ;;
  check)   node --check server.js && node --check fetcher.js && echo "✅ JS syntax OK" ;;
  *) echo "usage: ./manage.sh {refresh|restart|rebuild|update|deploy|backup|logs|status|check}" ;;
esac
