/* World Cup HQ — admin API client helpers.

   Thin, dependency-free wrappers (global `fetch` only) over the server's admin
   endpoints (see server/server.js handleApi):

     POST /api/admin/login    { password }            -> { token }            | 401 { error }
     GET  /api/admin/config   (Bearer)                -> { settings, providers }
     POST /api/admin/config   (Bearer) { patch }      -> masked config         | 400 { error }
     POST /api/admin/test     (Bearer) { provider… }  -> probe result
     POST /api/admin/sync     (Bearer) { provider… }  -> { ok, rev, applied }  | { ok:false, … }

   Every helper resolves to the parsed JSON, or a clean `{ ok:false, error }` on
   a network/parse failure — callers never have to try/catch. Provider API keys
   are SERVER-SIDE only: config responses carry `keySet` + `keyHint`, never a raw
   key. */

/* The masked provider shape the server returns (config.js maskProvider): the raw
   `key` is stripped, replaced by `keySet` + `keyHint` ("•••• 1234"). */
export interface MaskedProvider {
  name: string;
  status: string;
  baseUrl: string;
  authHeader: string;
  docs?: string;
  hint?: string;
  builtin?: boolean;
  keySet: boolean;
  keyHint: string;
  [k: string]: unknown;
}

/* Tournament/sync settings (config.js DEFAULT_SETTINGS). */
export interface AdminSettings {
  dataSource: string;
  activeProvider: string;
  autoSync: boolean;
  syncMins: number;
  lastSync: string | null;
  [k: string]: unknown;
}

/* The masked config envelope from GET/POST /api/admin/config. */
export interface AdminConfig {
  settings: AdminSettings;
  providers: Record<string, MaskedProvider>;
}

/* Result of POST /api/admin/login. */
export interface LoginResult {
  ok: boolean;
  token?: string;
  error?: string;
}

/* Build the Bearer auth headers for an admin-only request. */
function authHeaders(token: string): Record<string, string> {
  return { Authorization: 'Bearer ' + token };
}

/* Parse a Response as JSON, tolerating an empty/204 body. */
async function parseJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: 'bad response' };
  }
}

/* POST /api/admin/login — exchange the typed password for a bearer token.
   Always resolves: { ok:true, token } on success, otherwise { ok:false, error }. */
export async function adminLogin(password: string): Promise<LoginResult> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const body = await parseJson(res);
    if (res.ok && body && typeof body.token === 'string') {
      return { ok: true, token: body.token };
    }
    return { ok: false, error: (body && body.error) || 'wrong password' };
  } catch {
    return { ok: false, error: 'network error' };
  }
}

/* GET /api/admin/config — masked settings + providers (never a raw key).
   Returns the parsed config, or { ok:false, error } on failure. */
export async function getAdminConfig(token: string): Promise<any> {
  try {
    const res = await fetch('/api/admin/config', {
      method: 'GET',
      headers: authHeaders(token),
      cache: 'no-store',
    });
    const body = await parseJson(res);
    if (!res.ok) return { ok: false, error: (body && body.error) || 'unauthorized' };
    return body;
  } catch {
    return { ok: false, error: 'network error' };
  }
}

/* POST /api/admin/config — persist a settings/provider patch server-side.
   Returns the freshly masked config, or { ok:false, error } on failure. */
export async function saveAdminConfig(token: string, patch: any): Promise<any> {
  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(patch || {}),
    });
    const body = await parseJson(res);
    if (!res.ok) return { ok: false, error: (body && body.error) || 'save failed' };
    return body;
  } catch {
    return { ok: false, error: 'network error' };
  }
}

/* POST /api/admin/test — probe a provider ("does the API work?").
   `body` may inline-override provider fields (e.g. a freshly typed key). */
export async function testProvider(token: string, body: any): Promise<any> {
  try {
    const res = await fetch('/api/admin/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(body || {}),
    });
    const out = await parseJson(res);
    if (!res.ok) return { ok: false, error: (out && out.error) || 'unauthorized' };
    return out;
  } catch {
    return { ok: false, error: 'network error' };
  }
}

/* POST /api/admin/sync — fetch live results and merge them into the board.
   `body` may inline-override provider fields. Returns { ok, rev, applied } or
   { ok:false, error }. */
export async function syncNow(token: string, body?: any): Promise<any> {
  try {
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(body || {}),
    });
    const out = await parseJson(res);
    if (!res.ok) return { ok: false, error: (out && out.error) || 'unauthorized' };
    return out;
  } catch {
    return { ok: false, error: 'network error' };
  }
}
