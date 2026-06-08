FROM node:20-alpine
WORKDIR /app

# No npm install needed — the server uses only built-in Node modules + global fetch.
COPY server.js fetcher.js ./
COPY public ./public

ENV PORT=3050
ENV DATA_FILE=/app/data/state.json

VOLUME /app/data
EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3050/api/health || exit 1

CMD ["node", "server.js"]
