/* VANISHED — procedural Web Audio engine. Everything is synthesized; no external assets. */
const Snd = (() => {
  let ctx, master, bgmG, sfxG, musicBus, noiseBuf;
  const vol = { master: 0.8, bgm: 0.55, sfx: 0.8, mute: false };
  let musicOn = false, timer = null, step = 0, nextT = 0;
  let intensity = 0, target = 0, boss = false, ducked = false;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); bgmG = ctx.createGain(); sfxG = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    bgmG.connect(master); sfxG.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(bgmG);
    const dly = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    dly.delayTime.value = 0.36; fb.gain.value = 0.38; wet.gain.value = 0.35;
    musicBus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(bgmG);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVol(true);
  }

  function applyVol(instant) {
    if (!ctx) return;
    const t = ctx.currentTime, k = instant ? 0.001 : 0.05;
    master.gain.setTargetAtTime(vol.mute ? 0 : vol.master, t, k);
    bgmG.gain.setTargetAtTime(vol.bgm * (ducked ? 0.35 : 1) * 0.6, t, 0.1);
    sfxG.gain.setTargetAtTime(vol.sfx, t, k);
  }

  function tone(f, d, o = {}) {
    if (!ctx) return;
    const t = o.at ?? ctx.currentTime, osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + d);
    const v = o.v ?? 0.3, a = o.a ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g);
    if (o.lp) {
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp;
      g.connect(fl); fl.connect(o.dest || sfxG);
    } else g.connect(o.dest || sfxG);
    osc.start(t); osc.stop(t + d + 0.05);
  }

  function noise(d, o = {}) {
    if (!ctx) return;
    const t = o.at ?? ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + d);
    f.Q.value = o.q || 1;
    g.gain.setValueAtTime(o.v ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxG);
    src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05);
  }

  /* ---------- SFX ---------- */
  const S = {
    click() { tone(700, .05, { type: 'square', v: .1 }); tone(1050, .06, { type: 'square', v: .08, at: ctx.currentTime + .045 }); },
    step() { noise(.07, { f0: 260 + Math.random() * 180, v: .16 }); },
    dash() { noise(.28, { ft: 'bandpass', f0: 500, f1: 3200, q: 2, v: .35 }); tone(260, .22, { type: 'sawtooth', to: 900, v: .12 }); },
    scan() { tone(180, .9, { type: 'sine', to: 1500, v: .22, a: .05 }); tone(360, .9, { type: 'triangle', to: 3000, v: .08 }); noise(.6, { ft: 'highpass', f0: 3000, v: .05 }); },
    clue() { tone(880, .12, { v: .22 }); tone(1320, .2, { v: .2, at: ctx.currentTime + .1 }); },
    card() { [660, 880, 1100, 1760].forEach((f, i) => tone(f, .16, { type: 'triangle', v: .2, at: ctx.currentTime + i * .07 })); },
    unlock() {
      noise(.08, { ft: 'highpass', f0: 2000, v: .3 }); tone(110, .25, { type: 'square', to: 70, v: .2 });
      tone(440, .18, { type: 'triangle', v: .2, at: ctx.currentTime + .15 }); tone(660, .3, { type: 'triangle', v: .2, at: ctx.currentTime + .28 });
      noise(.35, { f0: 600, f1: 200, v: .2, at: ctx.currentTime + .1 });
    },
    denied() { tone(160, .14, { type: 'square', v: .2 }); tone(120, .22, { type: 'square', v: .2, at: ctx.currentTime + .15 }); },
    attack() { tone(1100, .14, { type: 'sawtooth', to: 220, v: .16 }); noise(.1, { ft: 'highpass', f0: 2500, v: .12 }); },
    bossHit() { tone(200, .15, { type: 'square', to: 60, v: .2 }); noise(.12, { f0: 1800, f1: 300, v: .25 }); },
    hurt() { tone(330, .3, { type: 'sawtooth', to: 70, v: .3 }); noise(.2, { f0: 900, f1: 200, v: .3 }); },
    warn() { tone(300, .7, { to: 900, v: .2, a: .3 }); tone(305, .7, { type: 'sawtooth', to: 910, v: .04, a: .3 }); },
    boom() { noise(.6, { f0: 1200, f1: 60, v: .6 }); tone(90, .5, { to: 30, v: .5 }); },
    phase() { tone(80, 1.2, { type: 'sawtooth', to: 300, v: .3, a: .4, lp: 900 }); noise(1, { ft: 'bandpass', f0: 300, f1: 2000, q: 3, v: .25 }); },
    shatter() {
      noise(1.4, { f0: 6000, f1: 200, v: .55 });
      for (let i = 0; i < 8; i++) tone(1500 - i * 120, .5, { type: 'triangle', to: 200, v: .12, at: ctx.currentTime + i * .05 });
      tone(60, 1.4, { to: 25, v: .5 });
    },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .6, { type: 'triangle', v: .2, at: ctx.currentTime + i * .14 })); },
    heal() { tone(520, .15, { v: .2 }); tone(780, .25, { v: .2, at: ctx.currentTime + .1 }); },
    blip() { tone(520 + Math.random() * 80, .03, { type: 'square', v: .04 }); }
  };
  function play(name) { if (!ctx || vol.mute) return; if (S[name]) S[name](); }

  /* ---------- Procedural music ---------- */
  const PROG = [{ r: 45, n: [57, 60, 64] }, { r: 41, n: [57, 60, 64, 65] }, { r: 48, n: [60, 64, 67] }, { r: 43, n: [59, 62, 67] }];
  const BOSS = [{ r: 45, n: [57, 60, 64] }, { r: 41, n: [57, 60, 65] }, { r: 38, n: [57, 62, 65] }, { r: 40, n: [56, 59, 64] }];

  function pad(notes, t, len) {
    notes.forEach(n => [-7, 7].forEach(det => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = boss ? 'sawtooth' : 'triangle'; o.frequency.value = mtof(n); o.detune.value = det;
      f.type = 'lowpass'; f.frequency.value = 500 + intensity * 1200;
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.05, t + len * .35); g.gain.linearRampToValueAtTime(.0001, t + len * 1.05);
      o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + len * 1.1);
    }));
  }

  function playStep(s, t, sd) {
    const P = boss ? BOSS : PROG, ch = P[Math.floor(s / 16) % P.length], p = s % 16, I = intensity;
    if (p === 0) pad(ch.n, t, sd * 16);
    // bass
    if (I < .35 ? (p === 0 || p === 8) : p % 2 === 0)
      tone(mtof(ch.r), sd * (I < .35 ? 7 : 1.6), { at: t, type: I > .35 ? 'sawtooth' : 'sine', v: .24, a: .02, lp: I > .35 ? 300 + I * 500 : 220, dest: musicBus });
    // arpeggio
    const every = I < .3 ? 4 : I < .7 ? 2 : 1;
    if (p % every === 0) {
      const a = ch.n.concat(ch.n.map(x => x + 12)), idx = Math.floor(s / every) % a.length;
      tone(mtof(a[idx] + (I > .6 ? 12 : 0)), .35, { at: t, type: I > .6 ? 'square' : 'triangle', v: .04 + .06 * I, lp: 2400, dest: musicBus });
    }
    // drums (only when tension rises)
    if (I > .5) {
      if (p % 4 === 0) tone(150, .18, { at: t, to: 40, v: .5, dest: bgmG });
      if (p === 4 || p === 12) noise(.14, { at: t, ft: 'highpass', f0: 1800, v: .25, dest: bgmG });
      if (p % 2 === 1 || I > .8) noise(.04, { at: t, ft: 'highpass', f0: 7000, v: .07, dest: bgmG });
    }
  }

  function tick() {
    if (!musicOn || !ctx) return;
    intensity += (target - intensity) * 0.08;
    const bpm = 84 + intensity * 46, sd = 60 / bpm / 4;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.25) { playStep(step, nextT, sd); nextT += sd; step++; }
  }

  return {
    vol, init, play, applyVol,
    setVol(k, v) { vol[k] = v; applyVol(); },
    startMusic() { if (!ctx || musicOn) return; musicOn = true; step = 0; nextT = ctx.currentTime + 0.1; timer = setInterval(tick, 60); },
    stopMusic() { musicOn = false; clearInterval(timer); },
    setIntensity(v) { target = v; },
    setBoss(b) { if (boss !== b) { boss = b; step = Math.ceil(step / 16) * 16; } },
    duck(b) { ducked = b; applyVol(); }
  };
})();
