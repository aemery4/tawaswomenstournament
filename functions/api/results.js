// Cloudflare Pages Function — live bracket results store.
//   GET  /api/results        -> public read: { results: {...}, updated: <ms> }
//   POST /api/results        -> organizer write (requires the secret key)
//
// Requires two bindings on the Pages project (set once in the dashboard):
//   • KV namespace bound as  BRACKET
//   • Environment variable    ADMIN_KEY  (the secret slug used in the admin URL)
// If the KV binding is missing, GET returns empty and the public page just shows
// the static "Win G# / Lose G#" placeholders — nothing breaks.

const GIDS = ['G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12','G13','G14','G15','G16','G17'];

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

// Coerce a score to an int in [0, 99] or null.
function san(x) {
  if (x === null || x === undefined || x === '') return null;
  var n = Number(x);
  if (!isFinite(n)) return null;
  n = Math.round(n);
  if (n < 0) n = 0;
  if (n > 99) n = 99;
  return n;
}

export async function onRequestGet({ env }) {
  var kv = env.BRACKET;
  if (!kv) return json({ results: {}, updated: 0 });
  var raw = await kv.get('results');
  if (!raw) return json({ results: {}, updated: 0 });
  // stored value is already the {results,updated} envelope
  return new Response(raw, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  var kv = env.BRACKET;
  if (!kv) return json({ error: 'store-not-configured' }, 503);

  var body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad-json' }, 400); }

  // Auth: the key must match the server-side secret. Constant-ish compare.
  if (!env.ADMIN_KEY || !body || typeof body.key !== 'string' || body.key !== env.ADMIN_KEY) {
    return json({ error: 'unauthorized' }, 401);
  }

  var inR = (body.results && typeof body.results === 'object') ? body.results : {};
  var clean = {};
  for (var i = 0; i < GIDS.length; i++) {
    var g = GIDS[i];
    var r = inR[g];
    if (!r || typeof r !== 'object') continue;
    var sa = san(r.sa);
    var sb = san(r.sb);
    var w = (r.w === 'a' || r.w === 'b') ? r.w : null;
    var final = !!r.final;
    // derive winner from scores if not explicitly set
    if (!w && sa != null && sb != null && sa !== sb) w = (sa > sb) ? 'a' : 'b';
    if (sa == null && sb == null && !w && !final) continue; // nothing entered
    clean[g] = { sa: sa, sb: sb, w: w, final: final };
  }

  var envelope = JSON.stringify({ results: clean, updated: Date.now() });
  await kv.put('results', envelope);
  return new Response(envelope, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
