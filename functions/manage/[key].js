// Cloudflare Pages Function — the hidden scorekeeper page.
//   GET /manage/<secret>   -> serves the admin page ONLY when <secret> matches
//                             the ADMIN_KEY env var. Any other value 404s, so the
//                             page is unreachable without the exact secret URL.
// The secret lives only in the Pages env var — never in this repo.

export async function onRequestGet({ params, env }) {
  if (!env.ADMIN_KEY || params.key !== env.ADMIN_KEY) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  var html = PAGE.replace(/__KEY__/g, params.key);
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Scorekeeper — Tawas Bracket</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  :root{--green:#1f6b43;--green-dk:#154a2e;--gold:#e0a93b;--gold-dk:#c8902a;
    --cream:#faf6ee;--paper:#fffdf8;--ink:#20271f;--muted:#5d6b59;--line:#e6ddc9;--red:#7a241b;}
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink);background:var(--cream);line-height:1.45;padding-bottom:96px}
  .top{background:var(--green-dk);color:#fff;padding:12px 16px;position:sticky;top:0;z-index:5}
  .top h1{font-family:"Oswald",sans-serif;font-size:17px;text-transform:uppercase;letter-spacing:.06em;margin:0}
  .top .s{font-size:12.5px;color:#cfe3d4;margin-top:2px}
  .wrap{max-width:640px;margin:0 auto;padding:14px}
  .hint{background:#fbf3dd;border:1px solid var(--gold);border-radius:10px;padding:10px 12px;font-size:13.5px;margin:0 0 14px}
  .game{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:12px 12px 10px;margin:0 0 12px;box-shadow:0 4px 14px rgba(20,40,25,.07)}
  .game.lb{border-left:4px solid var(--gold-dk)}
  .game.wb{border-left:4px solid var(--green)}
  .game.fin-card{border-left:4px solid var(--green-dk)}
  .gh{font-family:"Oswald",sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:13px;color:var(--green-dk);margin-bottom:8px}
  .gh .gid{display:inline-block;background:var(--gold-dk);color:#fff;border-radius:4px;padding:1px 6px;margin-right:6px;font-size:11px}
  .row{display:flex;align-items:center;gap:8px;margin:6px 0}
  .row .nm{flex:1;font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .row .nm.pending{color:var(--muted);font-style:italic}
  .row .nm.win{font-weight:700;color:var(--green-dk)}
  .row input[type=number]{width:58px;font-size:17px;text-align:center;padding:7px 4px;border:1.5px solid var(--line);border-radius:8px;-moz-appearance:textfield}
  .row input[type=number]:focus{outline:none;border-color:var(--green)}
  .wsel{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);white-space:nowrap}
  .wsel input{width:18px;height:18px}
  .finrow{margin-top:8px;font-size:14px;display:flex;align-items:center;gap:10px}
  .finrow label{display:flex;align-items:center;gap:6px;cursor:pointer}
  .finrow input{width:18px;height:18px}
  .finrow .clr{margin-left:auto;font-size:12.5px;color:var(--red);background:none;border:none;text-decoration:underline;cursor:pointer;padding:4px}
  .savebar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);
    padding:12px 14px;display:flex;align-items:center;gap:12px;box-shadow:0 -6px 18px rgba(20,40,25,.10)}
  .savebar .st{flex:1;font-size:13px;color:var(--muted)}
  .savebar .st.ok{color:var(--green-dk)} .savebar .st.err{color:var(--red)}
  .btn{background:var(--green);color:#fff;font-family:"Oswald",sans-serif;font-weight:600;text-transform:uppercase;
    letter-spacing:.05em;border:none;border-radius:8px;padding:13px 22px;font-size:15px;cursor:pointer}
  .btn:disabled{opacity:.5}
  .btn.dirty{background:var(--gold-dk)}
  .links{font-size:13.5px;margin:2px 0 14px}
  .links a{color:var(--green)}
</style>
</head>
<body>
<div class="top">
  <h1>Scorekeeper &middot; Tawas Bracket</h1>
  <div class="s" id="status">Loading&hellip;</div>
</div>
<div class="wrap">
  <div class="hint">Enter scores as games finish and tap <b>Save</b> &mdash; the public bracket updates for everyone within a few seconds. Winner is picked automatically from the scores; check <b>Final</b> once a game is over so the next round fills in. Keep this link private.</div>
  <div class="links"><a href="bracket.html" target="_blank" rel="noopener">Open the public bracket &rarr;</a></div>
  <div id="games"></div>
</div>
<div class="savebar">
  <div class="st" id="savest">&nbsp;</div>
  <button class="btn" id="save" disabled>Save</button>
</div>

<script src="/bracket-logic.js"></script>
<script>
(function(){
  var KEY = "__KEY__";
  var B = window.BRACKET;
  var state = { results: {}, updated: 0 };
  var dirty = false;

  function setStatus(txt){ document.getElementById('status').textContent = txt; }
  function setSave(txt, cls){
    var e = document.getElementById('savest');
    e.textContent = txt || '\\u00a0';
    e.className = 'st' + (cls ? ' ' + cls : '');
  }
  function markDirty(){
    dirty = true;
    var b = document.getElementById('save');
    b.disabled = false; b.classList.add('dirty');
    setSave('Unsaved changes', '');
  }

  function cardClass(g){
    if (g === 'G16' || g === 'G17') return 'fin-card';
    return (g.match(/^G([0-9]+)$/) && ['G6','G9','G11','G12','G13','G14','G15'].indexOf(g) >= 0) ? 'lb' : 'wb';
  }

  function build(){
    var host = document.getElementById('games');
    host.innerHTML = '';
    B.GAMES.forEach(function(gm){
      var g = gm.g;
      var card = document.createElement('div');
      card.className = 'game ' + cardClass(g);
      card.setAttribute('data-g', g);

      var gh = document.createElement('div');
      gh.className = 'gh';
      gh.innerHTML = '<span class="gid">' + g + '</span>' + gm.round;
      card.appendChild(gh);

      [0,1].forEach(function(idx){
        var row = document.createElement('div');
        row.className = 'row';
        var nm = document.createElement('span'); nm.className = 'nm'; nm.setAttribute('data-nm', idx);
        var inp = document.createElement('input'); inp.type = 'number'; inp.min = '0'; inp.max = '99';
        inp.inputMode = 'numeric'; inp.setAttribute('data-sc', idx); inp.setAttribute('aria-label', 'score');
        var wsel = document.createElement('label'); wsel.className = 'wsel';
        var wr = document.createElement('input'); wr.type = 'radio'; wr.name = 'w-' + g; wr.value = (idx===0?'a':'b');
        wr.setAttribute('data-w', idx);
        wsel.appendChild(wr); wsel.appendChild(document.createTextNode('win'));
        row.appendChild(nm); row.appendChild(inp); row.appendChild(wsel);
        card.appendChild(row);
        inp.addEventListener('input', function(){ onScore(g); markDirty(); });
        wr.addEventListener('change', function(){ markDirty(); renderNames(); });
      });

      var finrow = document.createElement('div'); finrow.className = 'finrow';
      var flab = document.createElement('label');
      var fchk = document.createElement('input'); fchk.type = 'checkbox'; fchk.setAttribute('data-final','1');
      flab.appendChild(fchk); flab.appendChild(document.createTextNode('Final'));
      fchk.addEventListener('change', function(){ markDirty(); renderNames(); });
      var clr = document.createElement('button'); clr.className = 'clr'; clr.type = 'button'; clr.textContent = 'clear';
      clr.addEventListener('click', function(){ clearGame(g); markDirty(); });
      finrow.appendChild(flab); finrow.appendChild(clr);
      card.appendChild(finrow);

      host.appendChild(card);
    });
  }

  function cardEl(g){ return document.querySelector('.game[data-g="' + g + '"]'); }

  function onScore(g){
    // auto-select winner from the two scores
    var c = cardEl(g);
    var a = c.querySelector('[data-sc="0"]').value;
    var b = c.querySelector('[data-sc="1"]').value;
    if (a !== '' && b !== '' && Number(a) !== Number(b)) {
      var win = Number(a) > Number(b) ? '0' : '1';
      c.querySelector('[data-w="' + win + '"]').checked = true;
    }
    paintWinner(g);
    renderNames(); // downstream games may now resolve from local edits
  }

  function paintWinner(g){
    var c = cardEl(g);
    [0,1].forEach(function(idx){
      var r = c.querySelector('[data-w="' + idx + '"]').checked;
      c.querySelector('[data-nm="' + idx + '"]').classList.toggle('win', r);
    });
  }

  function clearGame(g){
    var c = cardEl(g);
    c.querySelector('[data-sc="0"]').value = '';
    c.querySelector('[data-sc="1"]').value = '';
    var w0 = c.querySelector('[data-w="0"]'); var w1 = c.querySelector('[data-w="1"]');
    w0.checked = false; w1.checked = false;
    c.querySelector('[data-final]').checked = false;
    paintWinner(g);
    renderNames();
  }

  // Build a results object from the current inputs.
  function collect(){
    var out = {};
    B.GAMES.forEach(function(gm){
      var g = gm.g; var c = cardEl(g);
      var a = c.querySelector('[data-sc="0"]').value;
      var b = c.querySelector('[data-sc="1"]').value;
      var w = c.querySelector('[data-w="0"]').checked ? 'a' : (c.querySelector('[data-w="1"]').checked ? 'b' : null);
      var fin = c.querySelector('[data-final]').checked;
      var sa = a === '' ? null : Number(a);
      var sb = b === '' ? null : Number(b);
      if (!w && sa != null && sb != null && sa !== sb) w = sa > sb ? 'a' : 'b';
      if (sa == null && sb == null && !w && !fin) return;
      out[g] = { sa: sa, sb: sb, w: w, final: fin };
    });
    return out;
  }

  // Update the team-name labels using the current (local) inputs so downstream
  // rounds show who advanced even before saving.
  function renderNames(){
    var live = collect();
    B.GAMES.forEach(function(gm){
      var g = gm.g; var c = cardEl(g);
      var teams = B.gameTeams(g, live);
      [0,1].forEach(function(idx){
        var el = c.querySelector('[data-nm="' + idx + '"]');
        var res = teams[idx];
        el.textContent = B.withSeed(res);
        el.classList.toggle('pending', res.name == null);
      });
      paintWinner(g);
    });
  }

  // Fill inputs from a saved results object.
  function fill(results){
    B.GAMES.forEach(function(gm){
      var g = gm.g; var c = cardEl(g); var r = results[g];
      c.querySelector('[data-sc="0"]').value = (r && r.sa != null) ? r.sa : '';
      c.querySelector('[data-sc="1"]').value = (r && r.sb != null) ? r.sb : '';
      c.querySelector('[data-w="0"]').checked = !!(r && r.w === 'a');
      c.querySelector('[data-w="1"]').checked = !!(r && r.w === 'b');
      c.querySelector('[data-final]').checked = !!(r && r.final);
    });
    renderNames();
  }

  function load(){
    fetch('/api/results', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(d){
      state.results = (d && d.results) || {};
      state.updated = (d && d.updated) || 0;
      fill(state.results);
      setStatus(state.updated ? ('Last saved ' + new Date(state.updated).toLocaleTimeString()) : 'No scores entered yet');
    }).catch(function(){ setStatus('Could not load current scores — you can still enter and save.'); });
  }

  function save(){
    var b = document.getElementById('save'); b.disabled = true; setSave('Saving\\u2026','');
    var payload = { key: KEY, results: collect() };
    fetch('/api/results', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
      .then(function(res){
        if (!res.ok) { setSave((res.d && res.d.error === 'unauthorized') ? 'Not authorized (bad link)' : 'Save failed — try again', 'err'); b.disabled = false; return; }
        state.results = res.d.results || {}; state.updated = res.d.updated || Date.now();
        dirty = false; b.classList.remove('dirty');
        fill(state.results);
        setSave('Saved &mdash; live now', 'ok'); setStatus('Last saved ' + new Date(state.updated).toLocaleTimeString());
      }).catch(function(){ setSave('Save failed — check your connection', 'err'); b.disabled = false; });
  }

  document.getElementById('save').addEventListener('click', save);
  build();
  load();
})();
</script>
</body>
</html>`;
