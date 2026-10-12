/* VANISHED — League HQ Mystery. Top-down 2D detective game, HTML5 Canvas. */
(() => {
'use strict';
const T = 32, MW = 80, MH = 40, W = 960, H = 600, TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const cv = $('game'), cx = cv.getContext('2d');
const lc = document.createElement('canvas'); lc.width = W; lc.height = H;
const lx = lc.getContext('2d');
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= WORLD ================= */
const grid = Array.from({ length: MH }, () => new Array(MW).fill(1));
const rmap = Array.from({ length: MH }, () => new Array(MW).fill(-1));
const ROOMS = [];
function carve(x, y, w, h, r) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { grid[j][i] = 0; if (rmap[j][i] < 0) rmap[j][i] = r; }
}
function room(id, name, x, y, w, h, floor) { ROOMS.push({ id, name, floor }); const i = ROOMS.length - 1; carve(x, y, w, h, i); return i; }
const rHall = room('hall', 'Central Corridor', 3, 18, 74, 4, '#161c28');
room('lobby', 'Main Lobby', 30, 26, 17, 11, '#1a2434'); carve(36, 22, 4, 4, rHall);
room('barracks', 'Dormitory Wing', 20, 4, 14, 12, '#221f30'); carve(25, 16, 3, 2, rHall);
room('medbay', 'Medical Bay', 3, 26, 14, 11, '#183030'); carve(8, 22, 3, 4, rHall);
room('lab', 'Research Lab', 3, 4, 14, 12, '#182a38'); carve(8, 16, 3, 2, rHall);
room('hangar', 'Hangar Bay', 52, 26, 25, 11, '#1f242e'); carve(62, 22, 3, 4, rHall);
room('armory', 'Armory', 38, 4, 12, 12, '#2b2220'); carve(42, 16, 3, 2, rHall);
room('control', 'Control Room', 54, 3, 23, 13, '#2a1730'); carve(64, 16, 3, 2, rHall);

const DOOR_DEFS = [
  { x: 8, y: 16, w: 3, h: 2, need: 'blue' },
  { x: 42, y: 16, w: 3, h: 2, need: 'red' },
  { x: 64, y: 16, w: 3, h: 2, need: 'all' }
];
// [x, y, w, h, type] in tiles — all solid
const PROPS = [
  [40, 29, 5, 2, 'desk'], [32, 29, 2, 2, 'crate'], [44, 33, 2, 2, 'crate'],
  [21, 5, 3, 2, 'bed'], [25, 5, 3, 2, 'bed'], [29, 5, 3, 2, 'bed'], [21, 12, 3, 2, 'bed'], [29, 12, 3, 2, 'bed'],
  [4, 28, 3, 2, 'med'], [12, 28, 3, 2, 'med'], [4, 33, 3, 2, 'med'], [12, 33, 3, 2, 'med'],
  [4, 5, 2, 3, 'tube'], [7, 5, 2, 3, 'tube'], [10, 5, 2, 3, 'tube'], [13, 5, 2, 3, 'tube'], [4, 12, 4, 2, 'console'],
  [56, 31, 12, 3, 'ship'], [53, 28, 3, 3, 'crate'], [72, 28, 3, 3, 'crate'], [53, 34, 3, 2, 'crate'], [72, 34, 3, 2, 'crate'],
  [39, 5, 10, 1, 'rack'], [39, 12, 2, 2, 'crate'], [47, 12, 2, 2, 'crate'],
  [56, 4, 5, 1, 'console'], [70, 4, 5, 1, 'console'],
  [58, 7, 2, 2, 'pillar'], [71, 7, 2, 2, 'pillar'], [58, 11, 2, 2, 'pillar'], [71, 11, 2, 2, 'pillar']
];
const solids = PROPS.map(p => ({ x: p[0] * T, y: p[1] * T, w: p[2] * T, h: p[3] * T }));

const ITEMS = [
  { id: 'l1', tx: 38, ty: 34, k: 'terminal', title: 'Reception Log // 03:12', text: '03:12 — Every signal in the building drops at once. 03:14 — Roll call: 14 heroes inside HQ. 03:15 — Roll call: zero. No alarms. No forced doors. Whoever did this had clearance.' },
  { id: 'l2', tx: 45, ty: 31, k: 'gadget', hid: true, title: "Captain Aegis's Badge", text: "A cracked comm badge, still warm. Last transmission: 'The archive — don't trust the archive. Crane has been —' then static. Check the dormitory wing: Nova's room was the first to open." },
  { id: 'b1', tx: 32, ty: 9, k: 'terminal', title: 'Dormitory Access Log', text: "Nova's door opened at 03:09 — from the inside. Her cot is untouched. Her journal: 'Crane keeps asking about our power signatures. Why would an archivist need resonance data?'" },
  { id: 'b2', tx: 22, ty: 9, k: 'card', hid: true, card: 'blue', title: 'BLUE KEYCARD', text: "Taped under Nova's cot. Opens the Research Lab in the north-west wing." },
  { id: 'm1', tx: 9, ty: 34, k: 'terminal', title: 'Medbay Scans', text: 'All 14 heroes spiked to 7.7 THz in the same second. These are not injuries — they are signatures being copied. The samples were drawn remotely.' },
  { id: 'm2', tx: 15, ty: 31, k: 'gadget', hid: true, title: 'Resonance Tuner', text: "A prototype tuner, hand-labelled 'PRISM — E.C.' It is calibrated to hero energy. Someone wanted our power, not our lives." },
  { id: 'lab1', tx: 14, ty: 10, k: 'terminal', title: 'Project PRISM', text: "Containment Prism, approved by Archivist Elias Crane and sealed from the Council. It converts hero energy into a stable power core. Test subjects: 'all available'." },
  { id: 'lab2', tx: 4, ty: 10, k: 'card', hid: true, card: 'red', title: 'RED KEYCARD', text: 'Hidden in the specimen drawer. Opens the Armory in the north wing.' },
  { id: 'h1', tx: 74, ty: 31, k: 'terminal', title: 'Hangar Flight Log', text: "02:00 — unmarked cargo 'PRISM CORE' arrives, signed for by E. Crane. 03:10 — the cargo is moved to the Control Room in a hurry. Nobody saw it leave." },
  { id: 'h2', tx: 55, ty: 31, k: 'gadget', hid: true, title: 'Torn Manifest', text: "The manifest names the Control Room as the Prism's anchor. Crane's override list ends with 'GREEN'. The last keycard must be in the Armory." },
  { id: 'a1', tx: 47, ty: 9, k: 'terminal', title: 'Armory Override', text: "Crane's override log: 'When the Prism is anchored the Control Room seals. Only a full-clearance sweep — Blue, Red and Green — can breach the door.' He has been planning this for months." },
  { id: 'a2', tx: 40, ty: 9, k: 'card', hid: true, card: 'green', title: 'GREEN KEYCARD', text: 'Locked in the plasma cabinet. Together with Blue and Red it opens the Control Room.' }
];
const TOTAL_CLUES = ITEMS.filter(i => i.k !== 'card').length;
$('clueCount').textContent = `CLUES 0 / ${TOTAL_CLUES}`;

/* ================= STATE ================= */
const G = { state: 'menu', sub: false, back: 'mainMenu', t: 0, time: 0, clues: 0, cards: { blue: false, red: false, green: false }, journal: [], shake: 0, flash: 0, bossStarted: false, endShown: false, freed: 0, near: null, room: -1 };
const S = { shake: true };
const P = { x: 0, y: 0, hw: 10, hp: 100, max: 100, face: -Math.PI / 2, inv: 0, dashT: 0, dashCd: 0, scanCd: 0, atkCd: 0, stepT: 0, dx: 0, dy: 0 };
const cam = { x: 0, y: 0 };
const mouse = { x: 0, y: 0, down: false };
const BC = { x: 65 * T, y: 8 * T };
const boss = {};
let items = [], doors = [], bolts = [], bullets = [], tels = [], parts = [], ghosts = [], pickups = [], scan = null, dlg = null, toastT = 0;
const keys = {}; let hit = {};

function resetBoss() {
  Object.assign(boss, { x: BC.x, y: BC.y, ox: 0, oy: 0, hp: 420, max: 420, active: false, dead: false, deadT: 0, cd: 1.5, phase: 1, flash: 0, t: 0, spiral: null, hitSnd: 0 });
}
function reset() {
  items = ITEMS.map(i => ({ ...i, revealed: false, taken: false, read: false }));
  doors = DOOR_DEFS.map(d => ({ ...d, open: false, sealed: false, px: d.x * T, py: d.y * T, pw: d.w * T, ph: d.h * T }));
  Object.assign(G, { clues: 0, time: 0, shake: 0, flash: 0, bossStarted: false, endShown: false, freed: 0, near: null, room: -1, journal: [], cards: { blue: false, red: false, green: false } });
  Object.assign(P, { x: 38 * T, y: 31 * T, hp: 100, face: -Math.PI / 2, inv: 0, dashT: 0, dashCd: 0, scanCd: 0, atkCd: 0, stepT: 0 });
  resetBoss();
  bolts = []; bullets = []; tels = []; parts = []; ghosts = []; pickups = []; scan = null; dlg = null;
  cam.x = clamp(P.x - W / 2, 0, MW * T - W); cam.y = clamp(P.y - H / 2, 0, MH * T - H);
  $('boss').classList.add('hidden'); $('dialog').classList.add('hidden'); $('prompt').classList.add('hidden');
  updateHud();
}

/* ================= COLLISION ================= */
function solidAt(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  return grid[ty][tx] === 1;
}
function wallHit(x, y) { // point test incl. closed doors (for projectiles)
  if (solidAt(x, y)) return true;
  for (const d of doors) if (!d.open && x > d.px && x < d.px + d.pw && y > d.py && y < d.py + d.ph) return true;
  return false;
}
function boxBlocked(x, y, hw) {
  if (solidAt(x - hw, y - hw) || solidAt(x + hw, y - hw) || solidAt(x - hw, y + hw) || solidAt(x + hw, y + hw)) return true;
  for (const d of doors) if (!d.open && x + hw > d.px && x - hw < d.px + d.pw && y + hw > d.py && y - hw < d.py + d.ph) return true;
  for (const s of solids) if (x + hw > s.x && x - hw < s.x + s.w && y + hw > s.y && y - hw < s.y + s.h) return true;
  return false;
}
function move(dx, dy) {
  if (!boxBlocked(P.x + dx, P.y, P.hw)) P.x += dx;
  if (!boxBlocked(P.x, P.y + dy, P.hw)) P.y += dy;
}

/* ================= UI HELPERS ================= */
const SCREENS = ['mainMenu', 'pauseMenu', 'settingsMenu', 'controlsMenu', 'journalMenu', 'defeatMenu', 'victoryMenu'];
function screen(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); }
function closeScreens() { SCREENS.forEach(s => $(s).classList.add('hidden')); }
function toast(msg, ms = 2800) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); toastT = ms / 1000; }
function say(lines, cb) { dlg = { lines, i: 0, pos: 0, cb, blip: 0 }; G.state = 'dialog'; $('dialog').classList.remove('hidden'); $('prompt').classList.add('hidden'); renderDlg(); }
function renderDlg() {
  const L = dlg.lines[dlg.i];
  $('dTitle').textContent = L.who; $('dText').textContent = L.text.slice(0, Math.floor(dlg.pos));
}
function dlgAdvance() {
  const L = dlg.lines[dlg.i];
  if (dlg.pos < L.text.length) { dlg.pos = L.text.length; renderDlg(); return; }
  Snd.play('click');
  dlg.i++;
  if (dlg.i >= dlg.lines.length) {
    const cb = dlg.cb; dlg = null; $('dialog').classList.add('hidden'); G.state = 'play'; if (cb) cb();
  } else { dlg.pos = 0; renderDlg(); }
}
function objText() {
  const c = G.cards;
  if (G.bossStarted) return boss.dead ? 'The League is free.' : 'Defeat THE CURATOR!  Dodge the telegraphed attacks and blast him.';
  if (!c.blue) return 'Investigate HQ. Read terminals — use Scan (Q) to reveal hidden evidence.';
  if (!doors[0].open) return 'Blue keycard found — open the Research Lab (north-west).';
  if (!c.red) return 'Search the Research Lab for more evidence.';
  if (!doors[1].open) return 'Red keycard found — open the Armory (north).';
  if (!c.green) return 'Search the Armory for the final keycard.';
  return 'All keycards collected — breach the Control Room (north-east).';
}
function updateHud() {
  $('hpFill').style.width = clamp(P.hp / P.max * 100, 0, 100) + '%';
  $('abDash').lastElementChild.style.height = (P.dashCd / 1.1 * 100) + '%';
  $('abScan').lastElementChild.style.height = (P.scanCd / 5 * 100) + '%';
  $('abAtk').lastElementChild.style.height = (P.atkCd / .26 * 100) + '%';
  $('clueCount').textContent = `CLUES ${G.clues} / ${TOTAL_CLUES}`;
  $('cBlue').classList.toggle('on', G.cards.blue); $('cRed').classList.toggle('on', G.cards.red); $('cGreen').classList.toggle('on', G.cards.green);
  $('objective').textContent = objText();
  if (boss.active && !boss.dead) $('bossFill').style.width = clamp(boss.hp / boss.max * 100, 0, 100) + '%';
  $('vignette').style.opacity = clamp(G.flash * 2, 0, 1);
}
function renderJournal() {
  const el = $('journalList'); el.innerHTML = '';
  if (!G.journal.length) { el.innerHTML = '<div class="none">No evidence collected yet.</div>'; return; }
  for (const j of G.journal) {
    const d = document.createElement('div'); d.className = 'e';
    const b = document.createElement('b'); b.textContent = j.title;
    const p = document.createElement('p'); p.textContent = j.text;
    d.append(b, p); el.append(d);
  }
}

/* ================= EFFECTS ================= */
function burst(x, y, c, n, sp, life = .6) {
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(sp * .3, sp); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * rnd(.6, 1), max: life, c, r: rnd(1.5, 3.5) }); }
}
function shake(n) { G.shake = Math.max(G.shake, n); }
function hurt(n) {
  if (P.inv > 0 || P.hp <= 0) return;
  P.hp -= n; P.inv = .9; G.flash = .35; shake(10); Snd.play('hurt'); burst(P.x, P.y, '#ff4b6e', 14, 160);
}
function updateFx(dt) {
  for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const g of ghosts) g.life -= dt;
  ghosts = ghosts.filter(g => g.life > 0);
  G.shake = Math.max(0, G.shake - dt * 30); G.flash = Math.max(0, G.flash - dt);
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  if (boss.dead) G.freed = Math.min(1, G.freed + dt * .5);
}

/* ================= INTERACTION ================= */
function examine(it) {
  const first = !it.read && !it.taken;
  if (it.k === 'card') {
    it.taken = true; G.cards[it.card] = true; Snd.play('card');
    G.journal.push({ title: it.title, text: it.text });
  } else {
    if (it.k === 'terminal') it.read = true; else it.taken = true;
    Snd.play('clue');
    if (first) {
      G.clues++; G.journal.push({ title: it.title, text: it.text });
      if (G.clues === TOTAL_CLUES) toast('All evidence collected. The picture is clear: Elias Crane.');
    }
  }
  say([{ who: it.title, text: it.text }], updateHud);
}
function useDoor(d) {
  const c = G.cards, ok = d.need === 'all' ? (c.blue && c.red && c.green) : c[d.need];
  if (ok) {
    d.open = true; Snd.play('unlock'); toast('Access granted — door unlocked.');
    burst(d.px + d.pw / 2, d.py + d.ph / 2, '#46e0ff', 24, 200);
  } else {
    Snd.play('denied');
    toast(d.need === 'all' ? 'Control Room needs the BLUE, RED and GREEN keycards.' : `Locked — requires the ${d.need.toUpperCase()} keycard.`);
  }
}
function findNear() {
  let near = null, nd = 50;
  for (const it of items) {
    if (it.taken || (it.hid && !it.revealed)) continue;
    const d = Math.hypot(P.x - (it.tx + .5) * T, P.y - (it.ty + .5) * T);
    if (d < nd) { nd = d; near = { type: 'item', it }; }
  }
  for (const d of doors) {
    if (d.open || d.sealed) continue;
    const dd = Math.hypot(P.x - clamp(P.x, d.px, d.px + d.pw), P.y - clamp(P.y, d.py, d.py + d.ph));
    if (dd < 46 && dd < nd + 10) { nd = dd; near = { type: 'door', d }; }
  }
  return near;
}
function promptText(n) {
  if (n.type === 'door') return `[E] ${n.d.need === 'all' ? 'Control Room door' : n.d.need.toUpperCase() + ' keycard door'}`;
  return n.it.k === 'terminal' ? '[E] Access terminal' : n.it.k === 'card' ? '[E] Pick up keycard' : '[E] Examine';
}

/* ================= BOSS ================= */
const ARENA = { x0: 56 * T, x1: 75 * T, y0: 5 * T, y1: 14 * T };
function bullet(x, y, a, sp, c = '#ff5fa8') { bullets.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6, life: 7, c }); }
function tele(kind, o, dur, fn) { tels.push({ kind, ...o, t: 0, d: dur, fn }); }
function aBurst() {
  const ph = boss.phase, n = 10 + ph * 4;
  Snd.play('warn');
  tele('ring', { r: 70 }, .9, () => {
    Snd.play('boom'); const off = rnd(0, TAU);
    for (let i = 0; i < n; i++) bullet(boss.x, boss.y, off + i * TAU / n, 165 + ph * 20);
    if (ph === 3) tele('none', {}, .35, () => { for (let i = 0; i < n; i++) bullet(boss.x, boss.y, off + (i + .5) * TAU / n, 190); });
  });
  boss.cd = .9 + 2.6 - ph * .35;
}
function aVolley() {
  const ph = boss.phase;
  Snd.play('warn');
  const fire = tl => {
    Snd.play('attack'); const n = 3 + ph * 2;
    for (let i = 0; i < n; i++) bullet(boss.x, boss.y, tl.a + (i - (n - 1) / 2) * .17, 330, '#ff7a5f');
  };
  tele('line', { a: Math.atan2(P.y - boss.y, P.x - boss.x) }, .85, tl => {
    fire(tl);
    if (ph >= 2) tele('none', {}, .3, () => fire({ a: Math.atan2(P.y - boss.y, P.x - boss.x) }));
  });
  boss.cd = .85 + 2.3 - ph * .3;
}
function aSlam() {
  const ph = boss.phase, cnt = ph + 1;
  for (let k = 0; k < cnt; k++) {
    tele('none', {}, k * .45, () => {
      const zx = clamp(k === 0 ? P.x : P.x + rnd(-150, 150), ARENA.x0, ARENA.x1), zy = clamp(k === 0 ? P.y : P.y + rnd(-110, 110), ARENA.y0, ARENA.y1);
      Snd.play('warn');
      tele('zone', { x: zx, y: zy, r: 64 }, 1.1, tl => {
        Snd.play('boom'); shake(9); burst(tl.x, tl.y, '#ff6a4b', 30, 260, .8);
        if (Math.hypot(P.x - tl.x, P.y - tl.y) < tl.r + 8) hurt(18);
      });
    });
  }
  boss.cd = cnt * .45 + 1.1 + 1.8 - ph * .2;
}
function aSpiral() {
  Snd.play('warn');
  tele('ring', { r: 55 }, .6, () => { boss.spiral = { t: 2.2, acc: 0, a: rnd(0, TAU) }; });
  boss.cd = .6 + 2.2 + 1.6;
}
function phaseShift(ph) {
  Snd.play('phase'); shake(14); boss.cd = 1.6; bullets = []; tels = [];
  burst(boss.x, boss.y, '#ff5fa8', 40, 300, .9);
  toast(ph === 2 ? "The Curator: 'The Prism feeds on your resolve!'" : "The Curator: 'Enough! Burn with them!'", 3200);
  pickups.push({ x: ARENA.x0 + 40, y: 9 * T }, { x: ARENA.x1 - 40, y: 9 * T });
}
function bossUpdate(dt) {
  boss.t += dt; boss.flash = Math.max(0, boss.flash - dt); boss.hitSnd = Math.max(0, boss.hitSnd - dt);
  const ph = boss.hp > boss.max * .66 ? 1 : boss.hp > boss.max * .33 ? 2 : 3;
  if (ph !== boss.phase) { boss.phase = ph; phaseShift(ph); }
  const tx = BC.x + Math.sin(boss.t * .7) * (110 + ph * 25) + boss.ox, ty = BC.y + Math.sin(boss.t * .9) * 26 + boss.oy;
  const k = Math.min(1, dt * (ph === 3 ? 4 : 2)); boss.x += (tx - boss.x) * k; boss.y += (ty - boss.y) * k;
  boss.cd -= dt;
  if (boss.cd <= 0 && !boss.spiral) {
    if (ph >= 2) { boss.ox = rnd(-150, 150); boss.oy = rnd(-40, 70); }
    const pool = ph === 1 ? ['burst', 'volley'] : ph === 2 ? ['burst', 'volley', 'slam'] : ['burst', 'volley', 'slam', 'spiral'];
    const a = pool[Math.floor(Math.random() * pool.length)];
    ({ burst: aBurst, volley: aVolley, slam: aSlam, spiral: aSpiral })[a]();
  }
  if (boss.spiral) {
    const s = boss.spiral; s.t -= dt; s.acc += dt;
    while (s.acc > .075) { s.acc -= .075; s.a += .42; bullet(boss.x, boss.y, s.a, 200, '#ff4b3e'); bullet(boss.x, boss.y, s.a + Math.PI, 200, '#ff4b3e'); }
    if (s.t <= 0) boss.spiral = null;
  }
  if (boss.hp <= 0) killBoss();
}
function killBoss() {
  boss.dead = true; boss.spiral = null;
  bullets.forEach(b => burst(b.x, b.y, b.c, 3, 120)); bullets = []; tels = [];
  Snd.play('shatter'); shake(25); burst(boss.x, boss.y, '#ff5fa8', 80, 420, 1.4); burst(boss.x, boss.y, '#ffffff', 40, 300, 1);
  Snd.setBoss(false); Snd.setIntensity(.1);
  $('boss').classList.add('hidden');
}
function startBossFight() {
  G.bossStarted = true;
  doors[2].open = false; doors[2].sealed = true; Snd.play('boom'); shake(8);
  toast('The door seals behind you!');
  say([
    { who: 'The Curator', text: 'Ah, the last of them. I wondered who would come back from patrol.' },
    { who: 'You', text: 'Elias Crane. The Archivist. You built the Prism — where is everyone?!' },
    { who: 'The Curator', text: 'Inside it. Every hero in the League, distilled into pure power. And now, yours.' }
  ], () => {
    boss.active = true; boss.cd = 1.4; $('boss').classList.remove('hidden');
    Snd.setBoss(true); Snd.setIntensity(1); updateHud();
  });
}

/* ================= UPDATE ================= */
function update(dt) {
  G.time += dt;
  P.inv = Math.max(0, P.inv - dt); P.dashCd = Math.max(0, P.dashCd - dt); P.scanCd = Math.max(0, P.scanCd - dt); P.atkCd = Math.max(0, P.atkCd - dt);
  let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const moving = mx || my;
  if (moving) { const l = Math.hypot(mx, my); mx /= l; my /= l; P.face = Math.atan2(my, mx); }

  if ((hit.ShiftLeft || hit.ShiftRight) && P.dashCd <= 0 && P.dashT <= 0) {
    P.dashT = .18; P.dashCd = 1.1; P.inv = Math.max(P.inv, .25);
    P.dx = moving ? mx : Math.cos(P.face); P.dy = moving ? my : Math.sin(P.face);
    Snd.play('dash');
  }
  if (P.dashT > 0) {
    P.dashT -= dt; move(P.dx * 540 * dt, P.dy * 540 * dt);
    ghosts.push({ x: P.x, y: P.y, a: P.face, life: .22 });
  } else {
    move(mx * 165 * dt, my * 165 * dt);
    if (moving) { P.stepT -= dt; if (P.stepT <= 0) { P.stepT = .32; Snd.play('step'); } } else P.stepT = 0;
  }

  if (hit.KeyQ && P.scanCd <= 0) { scan = { x: P.x, y: P.y, t: 0 }; P.scanCd = 5; Snd.play('scan'); }
  if (scan) {
    scan.t += dt; const r = 340 * Math.min(1, scan.t / .9);
    for (const it of items) if (it.hid && !it.revealed && Math.hypot(it.tx * T + 16 - scan.x, it.ty * T + 16 - scan.y) < r) { it.revealed = true; Snd.play('clue'); burst(it.tx * T + 16, it.ty * T + 16, '#46e0ff', 14, 120); toast('Hidden evidence revealed!', 1800); }
    if (boss.active) bullets = bullets.filter(b => { const k = Math.hypot(b.x - scan.x, b.y - scan.y) > r; if (!k) burst(b.x, b.y, b.c, 3, 90, .3); return k; });
    if (scan.t > 1.1) scan = null;
  }

  if ((keys.KeyF || keys.KeyJ || mouse.down) && P.atkCd <= 0) {
    let a = P.face;
    if (mouse.down) { a = Math.atan2(mouse.y + cam.y - P.y, mouse.x + cam.x - P.x); P.face = a; }
    bolts.push({ x: P.x + Math.cos(a) * 14, y: P.y + Math.sin(a) * 14, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: .9 });
    P.atkCd = .26; Snd.play('attack');
  }
  for (const b of bolts) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (wallHit(b.x, b.y)) { b.life = 0; burst(b.x, b.y, '#46e0ff', 5, 100, .3); }
    else if (boss.active && !boss.dead && Math.hypot(b.x - boss.x, b.y - boss.y) < 38) {
      b.life = 0; boss.hp -= 7; boss.flash = .12; burst(b.x, b.y, '#ff5fa8', 6, 140, .35);
      if (boss.hitSnd <= 0) { Snd.play('bossHit'); boss.hitSnd = .1; }
    }
  }
  bolts = bolts.filter(b => b.life > 0);

  // interaction
  G.near = findNear();
  const pr = $('prompt');
  if (G.near) { pr.textContent = promptText(G.near); pr.classList.remove('hidden'); } else pr.classList.add('hidden');
  if (G.near && (hit.KeyE || hit.Space)) { if (G.near.type === 'item') examine(G.near.it); else useDoor(G.near.d); }

  // sparkle hints for hidden evidence
  for (const it of items) if (it.hid && !it.revealed && Math.random() < dt * 2 && Math.hypot(P.x - it.tx * T - 16, P.y - it.ty * T - 16) < 180)
    parts.push({ x: it.tx * T + 16 + rnd(-8, 8), y: it.ty * T + 16 + rnd(-8, 8), vx: 0, vy: -16, life: .8, max: .8, c: '#46e0ff', r: 1.6 });

  // room label
  const rt = rmap[clamp(Math.floor(P.y / T), 0, MH - 1)][clamp(Math.floor(P.x / T), 0, MW - 1)];
  if (rt !== G.room) { G.room = rt; $('roomName').textContent = ROOMS[rt].name; }

  // boss trigger
  if (!G.bossStarted && P.x > 54 * T && P.x < 77 * T && P.y > 3 * T && P.y < 15 * T) startBossFight();

  if (boss.active && !boss.dead) {
    bossUpdate(dt);
    for (const t of tels) {
      t.t += dt;
      if (t.kind === 'line' && t.t < t.d * .7) t.a = Math.atan2(P.y - boss.y, P.x - boss.x);
    }
    const done = tels.filter(t => t.t >= t.d); tels = tels.filter(t => t.t < t.d);
    done.forEach(t => t.fn && t.fn(t));
    for (const b of bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (wallHit(b.x, b.y)) { b.life = 0; burst(b.x, b.y, b.c, 2, 80, .25); }
      else if (Math.hypot(b.x - P.x, b.y - P.y) < b.r + 9) { b.life = 0; hurt(10); }
    }
    bullets = bullets.filter(b => b.life > 0);
    for (const k of pickups) if (Math.hypot(k.x - P.x, k.y - P.y) < 24) { k.got = true; P.hp = Math.min(P.max, P.hp + 30); Snd.play('heal'); burst(k.x, k.y, '#6dffb0', 14, 120); }
    pickups = pickups.filter(k => !k.got);
    if (P.hp <= 0) { G.state = 'dead'; bullets = []; tels = []; $('prompt').classList.add('hidden'); screen('defeatMenu'); }
  }
  if (boss.dead && !G.endShown) {
    boss.deadT += dt;
    if (boss.deadT > 2.4) {
      G.endShown = true; doors[2].sealed = false; doors[2].open = true;
      say([
        { who: 'The Curator', text: 'Impossible... the Prism... it cannot... hold...' },
        { who: 'Narration', text: 'The Prism shatters in a wash of light. One by one, the heroes of the League step out of the glow — dazed, but alive.' },
        { who: 'Captain Aegis', text: "You found us. Every clue, every door. Welcome home, partner. Case closed." }
      ], victory);
    }
  }
  updateFx(dt); updateHud();
}
function victory() {
  G.state = 'end'; Snd.play('win');
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
  $('stats').textContent = `Time ${m}:${String(s).padStart(2, '0')}  ·  Clues ${G.clues}/${TOTAL_CLUES}`;
  screen('victoryMenu');
}

/* ================= RENDER ================= */
const PC = { bed: ['#31405f', '#8ea6d3'], med: ['#2d4a4a', '#dff7f5'], desk: ['#4a3b2a', '#7a644a'], crate: ['#4d513a', '#7a8058'], tube: ['#14313f', '#38e1ff'], rack: ['#4b3636', '#a06a6a'], console: ['#1f2c4a', '#46e0ff'], ship: ['#2c3447', '#6c7fa6'], pillar: ['#3a2a4f', '#b06bff'] };
function drawProp(p) {
  const [x, y, w, h, t] = p, X = x * T, Y = y * T, Wd = w * T, Hh = h * T, c = PC[t];
  cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(X + 3, Y + 5, Wd, Hh);
  cx.fillStyle = c[0]; cx.fillRect(X, Y, Wd, Hh);
  cx.strokeStyle = c[1]; cx.globalAlpha = .55; cx.lineWidth = 2; cx.strokeRect(X + 1, Y + 1, Wd - 2, Hh - 2); cx.globalAlpha = 1;
  const pu = .5 + .5 * Math.sin(G.t * 2 + x);
  if (t === 'bed') { cx.fillStyle = c[1]; cx.fillRect(X + 4, Y + 5, 18, Hh - 10); cx.fillStyle = '#3f5b8f'; cx.fillRect(X + 24, Y + 4, Wd - 28, Hh - 8); }
  else if (t === 'med') { cx.fillStyle = c[1]; cx.fillRect(X + 4, Y + 4, Wd - 8, Hh - 8); cx.fillStyle = '#e44'; cx.fillRect(X + Wd / 2 - 2, Y + 8, 4, Hh - 16); cx.fillRect(X + Wd / 2 - 8, Y + Hh / 2 - 2, 16, 4); }
  else if (t === 'tube') { for (let i = 0; i < w; i++) { cx.fillStyle = `rgba(56,225,255,${.25 + .3 * pu})`; cx.fillRect(X + i * T + 6, Y + 6, T - 12, Hh - 12); cx.fillStyle = '#9ff'; cx.fillRect(X + i * T + 8, Y + 8 + pu * 6, 4, 6); } }
  else if (t === 'console') { cx.fillStyle = `rgba(70,224,255,${.35 + .3 * pu})`; cx.fillRect(X + 4, Y + 4, Wd - 8, Hh - 12); }
  else if (t === 'rack') { for (let i = 0; i < w; i++) { cx.fillStyle = c[1]; cx.fillRect(X + i * T + 6, Y + 8, T - 12, 4); cx.fillStyle = '#2a1a1a'; cx.fillRect(X + i * T + 12, Y + 14, 3, 12); } }
  else if (t === 'ship') { cx.fillStyle = '#9db4e0'; cx.beginPath(); cx.ellipse(X + Wd - 40, Y + Hh / 2, 24, 16, 0, 0, TAU); cx.fill(); cx.fillStyle = c[1]; cx.fillRect(X + 20, Y + 10, Wd - 100, Hh - 20); }
  else if (t === 'desk') { cx.fillStyle = c[1]; cx.fillRect(X + 6, Y + 6, Wd - 12, Hh - 12); }
  else if (t === 'crate') { cx.beginPath(); cx.moveTo(X, Y); cx.lineTo(X + Wd, Y + Hh); cx.moveTo(X + Wd, Y); cx.lineTo(X, Y + Hh); cx.stroke(); }
  else if (t === 'pillar') { cx.fillStyle = `rgba(176,107,255,${.2 + .3 * pu})`; cx.fillRect(X + 8, Y + 8, Wd - 16, Hh - 16); }
}
function drawWorld() {
  const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(MW - 1, Math.ceil((cam.x + W) / T));
  const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(MH - 1, Math.ceil((cam.y + H) / T));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x * T, py = y * T;
    if (grid[y][x] === 0) {
      cx.fillStyle = ROOMS[rmap[y][x]].floor; cx.fillRect(px, py, T, T);
      if ((x + y) & 1) { cx.fillStyle = 'rgba(255,255,255,.022)'; cx.fillRect(px, py, T, T); }
      cx.fillStyle = 'rgba(120,170,255,.05)'; cx.fillRect(px, py, T, 1); cx.fillRect(px, py, 1, T);
      if (y > 0 && grid[y - 1][x] === 1) { cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(px, py, T, 9); }
    } else {
      cx.fillStyle = '#090c13'; cx.fillRect(px, py, T, T);
      if (y + 1 < MH && grid[y + 1][x] === 0) {
        cx.fillStyle = '#1d2638'; cx.fillRect(px, py, T, T);
        if (x % 2) { cx.fillStyle = 'rgba(255,255,255,.05)'; cx.fillRect(px, py + 4, 1, T - 8); }
        cx.fillStyle = '#3f5a85'; cx.fillRect(px, py + T - 3, T, 3);
      }
    }
  }
  // control room runes
  cx.strokeStyle = 'rgba(180,90,255,.28)'; cx.lineWidth = 2;
  for (const r of [70, 118]) { cx.beginPath(); cx.arc(BC.x, BC.y + 24, r, 0, TAU); cx.stroke(); }
  PROPS.forEach(drawProp);
  // doors
  for (const d of doors) {
    const col = d.need === 'blue' ? '#2f6bff' : d.need === 'red' ? '#ff3b4a' : '#b855ff';
    if (d.open) { cx.fillStyle = col; cx.globalAlpha = .25; cx.fillRect(d.px, d.py, d.pw, 4); cx.fillRect(d.px, d.py + d.ph - 4, d.pw, 4); cx.globalAlpha = 1; continue; }
    cx.save(); cx.shadowColor = col; cx.shadowBlur = 14;
    cx.fillStyle = '#10151f'; cx.fillRect(d.px, d.py, d.pw, d.ph);
    cx.fillStyle = col; cx.globalAlpha = .75;
    for (let i = 0; i < d.ph; i += 8) cx.fillRect(d.px, d.py + i, d.pw, 4);
    cx.globalAlpha = 1; cx.fillStyle = '#fff'; cx.fillRect(d.px + d.pw / 2 - 6, d.py + d.ph / 2 - 2, 12, 9);
    cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(d.px + d.pw / 2, d.py + d.ph / 2 - 2, 5, Math.PI, 0); cx.stroke();
    cx.restore();
  }
}
function drawItems() {
  for (const it of items) {
    if (it.taken || (it.hid && !it.revealed)) continue;
    const x = (it.tx + .5) * T, y = (it.ty + .5) * T, pu = .5 + .5 * Math.sin(G.t * 4 + it.tx);
    cx.save(); cx.translate(x, y);
    if (it.k === 'terminal') {
      cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(-11, -6, 26, 20);
      cx.fillStyle = '#1b2740'; cx.fillRect(-12, -9, 24, 18); cx.strokeStyle = it.read ? '#3b5a70' : '#46e0ff'; cx.lineWidth = 2; cx.strokeRect(-12, -9, 24, 18);
      cx.shadowColor = '#46e0ff'; cx.shadowBlur = it.read ? 0 : 10;
      cx.fillStyle = it.read ? '#2a5568' : `rgba(70,224,255,${.55 + .4 * pu})`; cx.fillRect(-9, -6, 18, 9);
    } else if (it.k === 'gadget') {
      cx.shadowColor = '#ffb347'; cx.shadowBlur = 12; cx.fillStyle = '#ffb347'; cx.beginPath(); cx.arc(0, 0, 7 + pu * 2, 0, TAU); cx.fill();
      cx.fillStyle = '#5a3a10'; cx.fillRect(-3, -3, 6, 6);
    } else {
      const c = { blue: '#3d7bff', red: '#ff4455', green: '#3ddc84' }[it.card];
      cx.shadowColor = c; cx.shadowBlur = 14; cx.fillStyle = c; cx.fillRect(-11, -7, 22, 14);
      cx.fillStyle = '#fff'; cx.fillRect(-8, -3, 8, 3); cx.fillRect(-8, 2, 14, 2);
    }
    if (it.hid) { cx.strokeStyle = `rgba(70,224,255,${.6 - .4 * pu})`; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(0, 0, 14 + pu * 8, 0, TAU); cx.stroke(); }
    cx.restore();
    if (!(it.k === 'terminal' && it.read)) { cx.fillStyle = '#46e0ff'; cx.beginPath(); const yy = y - 22 + Math.sin(G.t * 3) * 2; cx.moveTo(x, yy + 5); cx.lineTo(x - 4, yy); cx.lineTo(x + 4, yy); cx.fill(); }
  }
}
function drawPrism() {
  if (boss.dead) return;
  const t = G.t, x = BC.x, y = BC.y - 6;
  cx.save(); cx.translate(x, y);
  const g = cx.createRadialGradient(0, 0, 5, 0, 0, 110); g.addColorStop(0, 'rgba(200,100,255,.45)'); g.addColorStop(1, 'rgba(200,100,255,0)');
  cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, 110, 0, TAU); cx.fill();
  cx.fillStyle = 'rgba(120,60,200,.8)'; cx.strokeStyle = '#e9b8ff'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(0, -60); cx.lineTo(30, 0); cx.lineTo(0, 60); cx.lineTo(-30, 0); cx.closePath(); cx.fill(); cx.stroke();
  const cols = ['#ff4b6e', '#46e0ff', '#ffd166', '#6dffb0', '#ff9a3c', '#b36bff', '#ff6bd6'];
  for (let i = 0; i < 14; i++) { const a = t * .8 + i * TAU / 14, r = 78 + (i % 2) * 14; cx.fillStyle = cols[i % 7]; cx.beginPath(); cx.arc(Math.cos(a) * r, Math.sin(a) * r * .55, 3.5, 0, TAU); cx.fill(); }
  cx.restore();
}
function hero(x, y, c1, c2, s = 1) {
  cx.save(); cx.translate(x, y); cx.scale(s, s);
  cx.fillStyle = 'rgba(0,0,0,.4)'; cx.beginPath(); cx.ellipse(0, 10, 12, 5, 0, 0, TAU); cx.fill();
  cx.fillStyle = c2; cx.beginPath(); cx.moveTo(-9, -4); cx.lineTo(0, 16); cx.lineTo(9, -4); cx.fill();
  cx.fillStyle = c1; cx.beginPath(); cx.arc(0, 0, 10, 0, TAU); cx.fill();
  cx.fillStyle = '#f0cfa8'; cx.beginPath(); cx.arc(0, -4, 6, 0, TAU); cx.fill();
  cx.restore();
}
function drawFreed() {
  if (!boss.dead || G.freed <= 0) return;
  const cols = [['#ff4b6e', '#7a1a30'], ['#46e0ff', '#14566a'], ['#ffd166', '#7a5a10'], ['#6dffb0', '#146a3a'], ['#ff9a3c', '#7a3a10'], ['#b36bff', '#4a1a7a']];
  cx.globalAlpha = G.freed;
  cols.forEach((c, i) => { const x = BC.x - 150 + i * 60, y = BC.y + 70 + Math.sin(G.t * 2 + i) * 3; cx.shadowColor = c[0]; cx.shadowBlur = 20; hero(x, y, c[0], c[1], 1.4); });
  cx.globalAlpha = 1; cx.shadowBlur = 0;
}
function drawPlayer() {
  for (const g of ghosts) { cx.save(); cx.globalAlpha = g.life * 2; cx.translate(g.x, g.y); cx.rotate(g.a); cx.fillStyle = '#46e0ff'; cx.beginPath(); cx.arc(0, 0, 11, 0, TAU); cx.fill(); cx.restore(); }
  cx.save(); cx.translate(P.x, P.y);
  cx.fillStyle = 'rgba(0,0,0,.4)'; cx.beginPath(); cx.ellipse(0, 9, 12, 6, 0, 0, TAU); cx.fill();
  if (P.inv > 0 && Math.floor(G.t * 20) % 2) cx.globalAlpha = .45;
  cx.rotate(P.face);
  const w = Math.sin(G.t * 10) * 2;
  cx.fillStyle = '#d6336c'; cx.beginPath(); cx.moveTo(-3, -9); cx.lineTo(-21 + w, 0); cx.lineTo(-3, 9); cx.fill();
  cx.fillStyle = '#2a6df4'; cx.beginPath(); cx.arc(0, 0, 11, 0, TAU); cx.fill();
  cx.fillStyle = '#ffd166'; cx.beginPath(); cx.moveTo(1, -4); cx.lineTo(5, 0); cx.lineTo(1, 4); cx.lineTo(-3, 0); cx.fill();
  cx.fillStyle = '#f2c9a0'; cx.beginPath(); cx.arc(4, 0, 6, 0, TAU); cx.fill();
  cx.fillStyle = '#12306a'; cx.fillRect(4, -5, 4, 10);
  cx.fillStyle = '#7ff'; cx.fillRect(7, -3, 2, 6);
  cx.restore();
}
function drawBoss() {
  if (!boss.active || boss.dead) return;
  const ph = boss.phase, col = ['#b36bff', '#ff5fa8', '#ff4b3e'][ph - 1], t = G.t;
  cx.save(); cx.translate(boss.x, boss.y + Math.sin(t * 2) * 4);
  const g = cx.createRadialGradient(0, 0, 10, 0, 0, 95); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00');
  cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, 95, 0, TAU); cx.fill();
  cx.fillStyle = boss.flash > 0 ? '#fff' : '#1a1030'; cx.strokeStyle = col; cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(-32, 28); cx.lineTo(-18, -14); cx.quadraticCurveTo(0, -42, 18, -14); cx.lineTo(32, 28); cx.quadraticCurveTo(0, 42, -32, 28); cx.fill(); cx.stroke();
  cx.fillStyle = '#05020a'; cx.beginPath(); cx.ellipse(0, -10, 12, 14, 0, 0, TAU); cx.fill();
  cx.shadowColor = col; cx.shadowBlur = 12; cx.fillStyle = col; cx.fillRect(-7, -13, 5, 3); cx.fillRect(2, -13, 5, 3);
  for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * TAU / 6; cx.save(); cx.translate(Math.cos(a) * 54, Math.sin(a) * 24); cx.rotate(a); cx.fillStyle = col; cx.fillRect(-4, -4, 8, 8); cx.restore(); }
  cx.restore();
}
function drawTels() {
  for (const t of tels) {
    const p = Math.min(1, t.t / t.d);
    if (t.kind === 'ring') {
      cx.strokeStyle = `rgba(255,80,140,${.3 + .5 * p})`; cx.lineWidth = 3; cx.beginPath(); cx.arc(boss.x, boss.y, t.r * (2.4 - 1.4 * p), 0, TAU); cx.stroke();
      cx.fillStyle = `rgba(255,80,140,${.08 + .18 * p})`; cx.beginPath(); cx.arc(boss.x, boss.y, t.r * 1.2, 0, TAU); cx.fill();
    } else if (t.kind === 'zone') {
      cx.fillStyle = `rgba(255,70,50,${.1 + .12 * p})`; cx.beginPath(); cx.arc(t.x, t.y, t.r, 0, TAU); cx.fill();
      cx.fillStyle = `rgba(255,90,60,${.2 + .3 * p})`; cx.beginPath(); cx.arc(t.x, t.y, t.r * p, 0, TAU); cx.fill();
      cx.strokeStyle = '#ff6a4b'; cx.lineWidth = 2; cx.beginPath(); cx.arc(t.x, t.y, t.r, 0, TAU); cx.stroke();
    } else if (t.kind === 'line') {
      cx.strokeStyle = `rgba(255,70,90,${.25 + .55 * p})`; cx.lineWidth = 2 + 5 * p; cx.setLineDash([14, 10]);
      cx.beginPath(); cx.moveTo(boss.x, boss.y); cx.lineTo(boss.x + Math.cos(t.a) * 700, boss.y + Math.sin(t.a) * 700); cx.stroke(); cx.setLineDash([]);
    }
  }
}
function drawOverlays() {
  drawTels();
  cx.save(); cx.shadowBlur = 10;
  for (const b of bullets) { cx.shadowColor = b.c; cx.fillStyle = b.c; cx.beginPath(); cx.arc(b.x, b.y, b.r, 0, TAU); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(b.x, b.y, b.r * .4, 0, TAU); cx.fill(); }
  cx.shadowColor = '#46e0ff'; cx.fillStyle = '#bff8ff';
  for (const b of bolts) { cx.beginPath(); cx.arc(b.x, b.y, 4, 0, TAU); cx.fill(); }
  for (const k of pickups) { cx.shadowColor = '#6dffb0'; cx.fillStyle = '#6dffb0'; cx.fillRect(k.x - 3, k.y - 9, 6, 18); cx.fillRect(k.x - 9, k.y - 3, 18, 6); }
  cx.restore();
  for (const p of parts) { cx.globalAlpha = clamp(p.life / p.max, 0, 1); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, TAU); cx.fill(); }
  cx.globalAlpha = 1;
  if (scan) {
    const r = 340 * Math.min(1, scan.t / .9), a = clamp(1 - scan.t / 1.1, 0, 1);
    cx.strokeStyle = `rgba(70,224,255,${a})`; cx.lineWidth = 4; cx.beginPath(); cx.arc(scan.x, scan.y, r, 0, TAU); cx.stroke();
    cx.strokeStyle = `rgba(70,224,255,${a * .4})`; cx.lineWidth = 12; cx.beginPath(); cx.arc(scan.x, scan.y, r * .93, 0, TAU); cx.stroke();
  }
}
function hole(x, y, r, a = 1) {
  const g = lx.createRadialGradient(x, y, r * .15, x, y, r);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  lx.fillStyle = g; lx.beginPath(); lx.arc(x, y, r, 0, TAU); lx.fill();
}
function drawLight(lxp, lyp) {
  const inBoss = boss.active && !boss.dead;
  lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, H);
  lx.fillStyle = `rgba(3,5,10,${G.state === 'menu' ? .8 : inBoss ? .5 : .74})`; lx.fillRect(0, 0, W, H);
  lx.globalCompositeOperation = 'destination-out';
  hole(lxp, lyp, inBoss ? 420 : 330);
  if (G.state !== 'menu') {
    const ox = -cam.x + G.sx, oy = -cam.y + G.sy;
    if (scan) hole(scan.x + ox, scan.y + oy, 340 * Math.min(1, scan.t / .9), .7);
    if (inBoss) hole(boss.x + ox, boss.y + oy, 200);
    for (const b of bolts) hole(b.x + ox, b.y + oy, 60, .8);
    for (const it of items) if (it.hid && it.revealed && !it.taken) hole((it.tx + .5) * T + ox, (it.ty + .5) * T + oy, 60, .8);
    if (boss.dead) hole(BC.x + ox, BC.y + oy, 300);
  }
  lx.globalCompositeOperation = 'source-over';
  cx.drawImage(lc, 0, 0);
}
function draw() {
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#05070b'; cx.fillRect(0, 0, W, H);
  G.sx = 0; G.sy = 0;
  if (G.state === 'menu') {
    cam.x = clamp(1300 + Math.sin(G.t * .15) * 700, 0, MW * T - W); cam.y = 18 * T - 220;
  } else if (S.shake && G.shake > 0) { G.sx = rnd(-1, 1) * G.shake * .5; G.sy = rnd(-1, 1) * G.shake * .5; }
  cx.save(); cx.translate(-Math.round(cam.x + 0) + G.sx, -Math.round(cam.y) + G.sy);
  drawWorld(); drawPrism(); drawItems(); drawFreed();
  if (G.state !== 'menu') { drawBoss(); drawPlayer(); }
  cx.restore();
  if (G.state === 'menu') drawLight(W / 2 + Math.sin(G.t * .6) * 280, H / 2 + 70 + Math.sin(G.t * .9) * 30);
  else drawLight(P.x - cam.x + G.sx, P.y - cam.y + G.sy);
  cx.save(); cx.translate(-Math.round(cam.x) + G.sx, -Math.round(cam.y) + G.sy);
  if (G.state !== 'menu') drawOverlays();
  cx.restore();
}

/* ================= FLOW ================= */
function startGame() {
  reset(); closeScreens(); $('hud').classList.remove('hidden'); G.state = 'play';
  Snd.duck(false); Snd.startMusic(); Snd.setBoss(false); Snd.setIntensity(.12);
  say([
    { who: 'Narration', text: '04:07 AM. You step off the night patrol and into League HQ. The lobby lights are on. The coffee is still steaming. Nobody is here.' },
    { who: 'You', text: 'Hello? Captain Aegis? Nova? Fourteen heroes do not just vanish. Time to investigate.' }
  ], () => toast('Tip: press Q to emit a scan pulse and reveal hidden evidence.', 4200));
}
function toMenu() {
  reset(); G.state = 'menu'; G.sub = false; $('hud').classList.add('hidden'); screen('mainMenu');
  Snd.setBoss(false); Snd.setIntensity(0); Snd.duck(false);
}
function pause() { G.state = 'pause'; G.sub = false; screen('pauseMenu'); Snd.duck(true); $('prompt').classList.add('hidden'); }
function resume() { closeScreens(); G.state = 'play'; Snd.duck(false); }
const A = {
  start: startGame, resume,
  settings() { G.back = G.state === 'pause' ? 'pauseMenu' : 'mainMenu'; G.sub = true; screen('settingsMenu'); },
  controls() { G.back = G.state === 'pause' ? 'pauseMenu' : 'mainMenu'; G.sub = true; screen('controlsMenu'); },
  journal() { G.back = 'pauseMenu'; G.sub = true; renderJournal(); screen('journalMenu'); },
  back() { G.sub = false; screen(G.back); },
  quit: toMenu, menu: toMenu, again: startGame,
  retry() {
    P.hp = P.max; P.x = 65 * T; P.y = 13.5 * T; P.inv = 1.5;
    Object.assign(boss, { hp: boss.max, phase: 1, cd: 2, spiral: null, ox: 0, oy: 0, x: BC.x, y: BC.y });
    bullets = []; tels = []; pickups = []; closeScreens(); G.state = 'play'; Snd.setBoss(true); Snd.setIntensity(1);
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-action]');
  if (!b) return;
  Snd.init(); Snd.play('click');
  if (A[b.dataset.action]) A[b.dataset.action]();
});

/* ---------- settings ---------- */
function saveSet() { try { localStorage.setItem('vanished_set', JSON.stringify({ v: Snd.vol, s: S })); } catch (e) { /* ignore */ } }
(function loadSet() {
  try {
    const d = JSON.parse(localStorage.getItem('vanished_set') || 'null');
    if (d) { Object.assign(Snd.vol, d.v); Object.assign(S, d.s); }
  } catch (e) { /* ignore */ }
  const map = { sMaster: 'master', sBgm: 'bgm', sSfx: 'sfx' };
  for (const id in map) {
    const el = $(id), out = el.nextElementSibling; el.value = Math.round(Snd.vol[map[id]] * 100); out.textContent = el.value;
    el.addEventListener('input', () => { Snd.setVol(map[id], el.value / 100); out.textContent = el.value; saveSet(); });
    el.addEventListener('change', () => Snd.play('click'));
  }
  $('tMute').checked = !!Snd.vol.mute; $('tShake').checked = !!S.shake;
  $('tMute').addEventListener('change', e => { Snd.setVol('mute', e.target.checked); saveSet(); });
  $('tShake').addEventListener('change', e => { S.shake = e.target.checked; saveSet(); });
})();

/* ---------- input ---------- */
const BLOCK = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];
addEventListener('keydown', e => {
  if (BLOCK.includes(e.code) && (G.state === 'play' || G.state === 'dialog')) e.preventDefault();
  if (!keys[e.code]) hit[e.code] = true;
  keys[e.code] = true;
  if (!Snd.started) { Snd.started = true; Snd.init(); if (G.state === 'menu') { Snd.startMusic(); Snd.setIntensity(0); } }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; if (G.state === 'play') pause(); });
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; });
cv.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true; mouse.x = mouse.x || 0; const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; } });
addEventListener('mouseup', () => { mouse.down = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('pointerdown', () => { if (!Snd.started) { Snd.started = true; Snd.init(); if (G.state === 'menu') { Snd.startMusic(); Snd.setIntensity(0); } } });

/* ---------- loop ---------- */
function tick(dt) {
  G.t += dt;
  if (G.state === 'play') {
    if (hit.Escape || hit.KeyP) pause();
    else if (hit.Tab) { pause(); A.journal(); }
    else update(dt);
  } else if (G.state === 'dialog') {
    if (dlg) {
      const L = dlg.lines[dlg.i];
      if (dlg.pos < L.text.length) { const o = Math.floor(dlg.pos); dlg.pos += dt * 55; if (Math.floor(dlg.pos / 3) !== Math.floor(o / 3)) Snd.play('blip'); renderDlg(); }
      if (hit.KeyE || hit.Space || hit.Enter) dlgAdvance();
    }
    updateFx(dt); updateHud();
  } else if (G.state === 'pause') {
    if (hit.Escape || hit.KeyP) { if (G.sub) A.back(); else resume(); }
  } else if (G.state === 'menu') {
    if (hit.Escape && G.sub) A.back();
  } else if (G.state === 'dead' || G.state === 'end') {
    updateFx(dt);
  }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  tick(dt); draw(); hit = {};
  requestAnimationFrame(frame);
}
reset(); screen('mainMenu');
requestAnimationFrame(frame);

if (location.hash === '#debug') window.__v = { G, P, boss, A, keys, get items() { return items; }, get doors() { return doors; }, get bullets() { return bullets; }, get tels() { return tels; }, tick, draw, examine, useDoor, findNear, boxBlocked };
})();
