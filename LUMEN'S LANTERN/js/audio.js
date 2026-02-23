/* ============================================================
   LUMEN'S LANTERN — Audio Manager
   Generates ambient music and SFX via Web Audio API.
   ============================================================ */

const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  let ambientNodes = [];
  let chimeTimer = null;
  let _enabled = true;

  // Pentatonic C-major scale (two octaves) for gentle chimes
  const CHIME_FREQS = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
  // Warm Dm-add9 drone chord: D3 F3 A3 C4 E4
  const DRONE_FREQS = [146.83, 174.61, 220.00, 261.63, 329.63];

  // ── Init ────────────────────────────────────────────────────
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }

  // ── Ambient Pad ─────────────────────────────────────────────
  function startAmbient() {
    if (!ctx || !_enabled) return;
    stopAmbient();

    DRONE_FREQS.forEach((freq, i) => {
      const osc    = ctx.createOscillator();
      const gNode  = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Alternate sine / triangle for warmth
      osc.type = (i % 2 === 0) ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Tiny LFO for organic shimmer
      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.08 + i * 0.04, ctx.currentTime);
      lfoGain.gain.setValueAtTime(1.2, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);   // modulate detune, not frequency
      lfo.start();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      filter.Q.setValueAtTime(0.5, ctx.currentTime);

      // Gentle volume per partial – higher partials softer
      const vol = 0.055 - i * 0.008;
      gNode.gain.setValueAtTime(0, ctx.currentTime);
      gNode.gain.linearRampToValueAtTime(Math.max(vol, 0.01), ctx.currentTime + 3);

      osc.connect(filter);
      filter.connect(gNode);
      gNode.connect(masterGain);
      osc.start();

      ambientNodes.push(osc, gNode, lfo, lfoGain);
    });

    scheduleChime();
  }

  function stopAmbient() {
    ambientNodes.forEach(n => { try { n.stop(); } catch (_) {} try { n.disconnect(); } catch (_) {} });
    ambientNodes = [];
    if (chimeTimer) { clearTimeout(chimeTimer); chimeTimer = null; }
  }

  // ── Chimes ──────────────────────────────────────────────────
  function scheduleChime() {
    const delay = 3500 + Math.random() * 6000;
    chimeTimer = setTimeout(() => {
      if (_enabled && ctx) _playChime();
      scheduleChime();
    }, delay);
  }

  function _playChime() {
    // Play 1-2 random pentatonic notes with a lush tail
    const count = Math.random() < 0.4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const freq    = CHIME_FREQS[Math.floor(Math.random() * CHIME_FREQS.length)];
      const t       = ctx.currentTime + i * 0.18;
      const osc     = ctx.createOscillator();
      const gNode   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gNode.gain.setValueAtTime(0, t);
      gNode.gain.linearRampToValueAtTime(0.14, t + 0.02);
      gNode.gain.exponentialRampToValueAtTime(0.001, t + 2.8);
      osc.connect(gNode);
      gNode.connect(masterGain);
      osc.start(t);
      osc.stop(t + 2.8);
    }
  }

  // ── SFX ─────────────────────────────────────────────────────
  function playSFX(type) {
    if (!ctx || !_enabled) return;
    switch (type) {
      case 'collect':  _sfxCollect();  break;
      case 'hit':      _sfxHit();      break;
      case 'lantern':  _sfxLantern();  break;
      case 'complete': _sfxComplete(); break;
      case 'jump':     _sfxJump();     break;
    }
  }

  function _sfxCollect() {
    [880, 1108.73, 1318.51].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.1;
      _ding(freq, 0.18, 0.45, t);
    });
  }

  function _sfxHit() {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.35);
    g.gain.setValueAtTime(0.28, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  }

  function _sfxJump() {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  }

  function _sfxLantern() {
    [261.63, 329.63, 392, 523.25].forEach((freq, i) => {
      _ding(freq, 0.24, 1.8, ctx.currentTime + i * 0.18);
    });
  }

  function _sfxComplete() {
    [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      _ding(freq, 0.2, 1.5, ctx.currentTime + i * 0.14);
    });
  }

  function _ding(freq, vol, duration, startTime) {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g); g.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ── Toggle ──────────────────────────────────────────────────
  function toggle() {
    _enabled = !_enabled;
    if (_enabled) {
      masterGain.gain.setValueAtTime(0.35, ctx.currentTime);
      startAmbient();
    } else {
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(stopAmbient, 500);
    }
    return _enabled;
  }

  function isEnabled() { return _enabled; }

  return { init, startAmbient, stopAmbient, playSFX, toggle, isEnabled };
})();
