/* ============================================================================
 * server.js — Leo's World Cup (zero-dependency Node runtime server)
 *
 * Phase 0 scaffold: serves the built client (client/dist) + GET /api/health.
 * Later phases add: viewer gate, shared board (/api/state), admin auth
 * (/api/admin/*), and the live-data proxy. Uses only built-in Node + global fetch.
 * ========================================================================== */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3050", 10);
const CLIENT_DIR = process.env.CLIENT_DIR || path.join(__dirname, "..", "client", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".map": "application/json",
};

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

/* serve a static file from client/dist; SPA-fallback to index.html for unknown routes */
function serveStatic(req, res) {
  let rel = decodeURIComponent((req.url || "/").split("?")[0]);
  if (rel === "/") rel = "/index.html";
  const fp = path.normalize(path.join(CLIENT_DIR, rel));
  if (!fp.startsWith(CLIENT_DIR)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(fp, (err, buf) => {
    if (err) {
      // SPA fallback: serve index.html so client-side (hash) routing works
      return fs.readFile(path.join(CLIENT_DIR, "index.html"), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end("Not found"); }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(idx);
      });
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];
  if (url === "/api/health") return sendJson(res, 200, { status: "healthy" });
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`⚽ Leo's World Cup server on http://0.0.0.0:${PORT}  (client: ${CLIENT_DIR})`);
});

module.exports = { server };
