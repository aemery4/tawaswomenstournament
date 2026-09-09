/* Tawas bracket — shared logic (single source of truth).
   Loaded as a plain browser script by both the public bracket page and the
   hidden admin page. Defines window.BRACKET.

   Game structure mirrors 2026/bracket-verify.py exactly. Team names in later
   games are DERIVED from earlier results, so the organizer only ever enters
   scores — the advancing teams fill themselves in. */
(function () {
  var SEEDS = {
    1: 'Good Vibrations',
    2: 'Cranks',
    3: 'Hot Pitches',
    4: "Kennedy's",
    5: 'Bat Intentions',
    6: '41',
    7: 'Amrize',
    8: 'Koval',
    9: "Lena's Crew"
  };

  // slot = ['S', seedNo]  |  ['W', 'G#'] (winner of)  |  ['L', 'G#'] (loser of)
  var GAMES = [
    { g: 'G1',  round: 'Play-in',            slots: [['S', 8], ['S', 9]] },
    { g: 'G2',  round: 'Quarterfinal',       slots: [['S', 4], ['S', 5]] },
    { g: 'G3',  round: 'Quarterfinal',       slots: [['S', 2], ['S', 7]] },
    { g: 'G4',  round: 'Quarterfinal',       slots: [['S', 1], ['W', 'G1']] },
    { g: 'G5',  round: 'Quarterfinal',       slots: [['S', 3], ['S', 6]] },
    { g: 'G6',  round: "Losers' R1",         slots: [['L', 'G1'], ['L', 'G3']] },
    { g: 'G7',  round: "Winners' Semi",      slots: [['W', 'G4'], ['W', 'G2']] },
    { g: 'G8',  round: "Winners' Semi",      slots: [['W', 'G3'], ['W', 'G5']] },
    { g: 'G9',  round: "Losers' R2",         slots: [['L', 'G4'], ['L', 'G2']] },
    { g: 'G10', round: "Winners' Final",     slots: [['W', 'G7'], ['W', 'G8']] },
    { g: 'G11', round: "Losers' R3",         slots: [['W', 'G6'], ['L', 'G5']] },
    { g: 'G12', round: "Losers' R4",         slots: [['L', 'G8'], ['W', 'G9']] },
    { g: 'G13', round: "Losers' R5",         slots: [['L', 'G7'], ['W', 'G11']] },
    { g: 'G14', round: "Losers' Semifinal",  slots: [['W', 'G12'], ['W', 'G13']] },
    { g: 'G15', round: "Losers' Final",      slots: [['W', 'G14'], ['L', 'G10']] },
    { g: 'G16', round: 'CHAMPIONSHIP',       slots: [['W', 'G10'], ['W', 'G15']] },
    { g: 'G17', round: 'Championship "if" game', slots: [['W', 'G16'], ['L', 'G16']] }
  ];
  var GMAP = {};
  GAMES.forEach(function (x) { GMAP[x.g] = x; });

  // Resolve one slot against a results map.
  // Returns {name:string|null, seed:number|null, ph:string}
  //   ph = the "Win G4 / Lose G3" placeholder to show while undecided.
  function resolveSlot(slot, results, depth) {
    depth = depth || 0;
    if (depth > 40) return { name: null, seed: null, ph: '?' };
    var type = slot[0], ref = slot[1];
    if (type === 'S') {
      return { name: SEEDS[ref] || ('Seed ' + ref), seed: ref, ph: SEEDS[ref] || ('Seed ' + ref) };
    }
    var ph = (type === 'W' ? 'Win ' : 'Lose ') + ref;
    var r = results && results[ref];
    var decided = r && r.final && (r.w === 'a' || r.w === 'b');
    if (!decided) return { name: null, seed: null, ph: ph };
    var teams = gameTeams(ref, results, depth + 1);
    var winIdx = r.w === 'a' ? 0 : 1;
    var pick = (type === 'W') ? teams[winIdx] : teams[1 - winIdx];
    return { name: pick.name, seed: pick.seed, ph: pick.name != null ? pick.name : ph };
  }

  function gameTeams(g, results, depth) {
    var gm = GMAP[g];
    return gm.slots.map(function (s) { return resolveSlot(s, results, depth); });
  }

  // Display helpers
  function withSeed(res) {
    if (res.name == null) return res.ph;
    return (res.seed != null ? res.seed + ' ' : '') + res.name;
  }
  function noSeed(res) {
    return res.name != null ? res.name : res.ph;
  }

  // Per-side info for rendering a game.
  function sideInfo(g, idx, results) {
    var teams = gameTeams(g, results);
    var r = (results && results[g]) || {};
    var score = null;
    if (r.sa != null || r.sb != null) score = (idx === 0 ? r.sa : r.sb);
    var isWin = !!r.final && ((r.w === 'a' && idx === 0) || (r.w === 'b' && idx === 1));
    return { res: teams[idx], withSeed: withSeed(teams[idx]), noSeed: noSeed(teams[idx]), score: score, isWin: isWin, final: !!r.final };
  }

  window.BRACKET = {
    SEEDS: SEEDS,
    GAMES: GAMES,
    GMAP: GMAP,
    GIDS: GAMES.map(function (x) { return x.g; }),
    resolveSlot: resolveSlot,
    gameTeams: gameTeams,
    withSeed: withSeed,
    noSeed: noSeed,
    sideInfo: sideInfo
  };
})();
