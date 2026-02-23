/* ============================================================
   LUMEN'S LANTERN — Audio Manager
   Slow lo-fi beat: 76 BPM, swung 16ths, warm chord pad,
   kick/snare/hi-hat, punchy bass plucks, vinyl crackle layer.
   ============================================================ */

const AudioManager = (() => {
  let ctx        = null;
  let masterGain = null;
  let _enabled   = true;
  let _playing   = false;

  // ── Scheduler state ─────────────────────────────────────────
  let _schedTimer = null;
  let _nextBeat   = 0;    // ctx.currentTime of next scheduled 16th-note
  let _beatIndex  = 0;    // 0-15 position within a bar
  let _barIndex   = 0;    // bar count (used to pick chord)

  const BPM      = 76;
  const STEP     = 60 / BPM / 4;   // one 16th-note = ~0.197 s
  const LOOKAHEAD = 0.12;           // schedule up to 120 ms ahead
  const INTERVAL  = 60;            // scheduler tick (ms)

  // ── Chord loop: Am9 → Fmaj7 → Cmaj7 → G7sus2 ───────────────
  // Each chord lasts 2 bars (32 16th steps). Frequencies in Hz.
  const CHORDS = [
    { root: 110.00, notes: [110.00, 130.81, 164.81, 196.00, 246.94] },  // Am9
    { root:  87.31, notes: [ 87.31, 110.00, 130.81, 164.81, 220.00] },  // Fmaj7
    { root:  65.41, notes: [ 65.41,  82.41,  98.00, 123.47, 164.81] },  // Cmaj7
    { root:  98.00, notes: [ 98.00, 123.47, 146.83, 174.61, 196.00] },  // G7sus2
  ];
  const CHORD_BARS  = 2;
  const CHORD_STEPS = CHORD_BARS * 16;

  // ── 16-step drum patterns (1 bar, loops) ────────────────────
  //   Positions: 0  1  2  3 | 4  5  6  7 | 8  9 10 11 |12 13 14 15
  const KICK   = [1, 0, 0, 0,  0, 0, 1, 0,  1, 0, 0, 0,  0, 0, 0, 0];
  const SNARE  = [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 1, 0];
  const HAT_CL = [1, 0, 1, 0,  1, 0, 1, 0,  1, 0, 1, 0,  1, 0, 1, 0];
  const HAT_OP = [0, 0, 0, 0,  0, 0, 0, 1,  0, 0, 0, 0,  0, 0, 0, 0];

  // Bass semitone offsets above chord root (one per 4-step group)
  const BASS_STEPS = [0, 4, 8, 12];   // fire on step 0, 4, 8, 12
  const BASS_SEMI  = [0, 0, 7, 5];    // root, root, fifth, fourth

  // Vinyl crackle source
  let _crackleNode = null;

  // ── Init ────────────────────────────────────────────────────
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.55, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }

  // ── Ambient (beat) start / stop ──────────────────────────────
  function startAmbient() {
    if (!ctx || !_enabled || _playing) return;
    _playing   = true;
    _nextBeat  = ctx.currentTime + 0.08;
    _beatIndex = 0;
    _barIndex  = 0;
    _startCrackle();
    _tick();
  }

  function stopAmbient() {
    _playing = false;
    clearTimeout(_schedTimer);
    _stopCrackle();
  }

  // ── Scheduler tick ───────────────────────────────────────────
  function _tick() {
    if (!_playing) return;
    const now = ctx.currentTime;

    while (_nextBeat < now + LOOKAHEAD) {
      _scheduleStep(_beatIndex, _nextBeat);

      // Schedule chord pad on every bar start
      if (_beatIndex === 0) {
        _scheduleChord(_nextBeat);
      }

      _beatIndex = (_beatIndex + 1) % 16;
      if (_beatIndex === 0) _barIndex++;
      _nextBeat += STEP;
    }

    _schedTimer = setTimeout(_tick, INTERVAL);
  }

  // ── Step sequencer ───────────────────────────────────────────
  function _scheduleStep(step, t) {
    // Swing: push odd 16ths ~8% of a step later for that lo-fi feel
    const ts = t + (step % 2 === 1 ? STEP * 0.08 : 0);

    if (KICK[step])   _kick(ts);
    if (SNARE[step])  _snare(ts);
    if (HAT_CL[step]) _hat(ts, false);
    if (HAT_OP[step]) _hat(ts, true);

    // Bass on steps 0, 4, 8, 12
    const bassSlot = BASS_STEPS.indexOf(step);
    if (bassSlot !== -1) {
      const chord   = _currentChord();
      const freq    = chord.root * Math.pow(2, BASS_SEMI[bassSlot] / 12);
      _bass(ts, freq);
    }
  }

  function _currentChord() {
    const idx = Math.floor(_barIndex / CHORD_BARS) % CHORDS.length;
    return CHORDS[idx];
  }

  // ── Kick drum ────────────────────────────────────────────────
  function _kick(t) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.28);
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.40);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(t); osc.stop(t + 0.42);
  }

  // ── Snare drum ───────────────────────────────────────────────
  function _snare(t) {
    // Noise body
    const src  = ctx.createBufferSource();
    src.buffer = _noiseBuffer(0.25);
    const bp   = ctx.createBiquadFilter();
    bp.type    = 'bandpass';
    bp.frequency.setValueAtTime(1200, t);
    bp.Q.setValueAtTime(0.7, t);
    const g    = ctx.createGain();
    g.gain.setValueAtTime(0.34, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(bp); bp.connect(g); g.connect(masterGain);
    src.start(t); src.stop(t + 0.25);

    // Tonal crack
    const osc  = ctx.createOscillator();
    const og   = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.09);
    og.gain.setValueAtTime(0.2, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(og); og.connect(masterGain);
    osc.start(t); osc.stop(t + 0.14);
  }

  // ── Hi-hat ────────────────────────────────────────────────────
  function _hat(t, open) {
    const dur  = open ? 0.20 : 0.055;
    const src  = ctx.createBufferSource();
    src.buffer = _noiseBuffer(dur + 0.02);
    const hp   = ctx.createBiquadFilter();
    hp.type    = 'highpass';
    hp.frequency.setValueAtTime(open ? 4800 : 8500, t);
    const g    = ctx.createGain();
    g.gain.setValueAtTime(open ? 0.13 : 0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp); hp.connect(g); g.connect(masterGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ── Bass pluck ───────────────────────────────────────────────
  function _bass(t, freq) {
    const osc  = ctx.createOscillator();
    const lp   = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(340, t);
    lp.Q.setValueAtTime(1.4, t);
    // Punchy pluck: fast attack, medium decay, holds quietly
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.44, t + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.11);
    gain.gain.exponentialRampToValueAtTime(0.001, t + STEP * 3.4);
    osc.connect(lp); lp.connect(gain); gain.connect(masterGain);
    osc.start(t); osc.stop(t + STEP * 3.4 + 0.04);
  }

  // ── Chord pad (scheduled once per bar) ───────────────────────
  function _scheduleChord(t) {
    const chord = _currentChord();
    const dur   = STEP * 16 * CHORD_BARS + 0.6;   // fade over 2 bars + tail

    chord.notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const lfo  = ctx.createOscillator();
      const lfog = ctx.createGain();
      const lp   = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      // Per-voice wobble for warmth
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.45 + i * 0.11, t);
      lfog.gain.setValueAtTime(2.8, t);
      lfo.connect(lfog); lfog.connect(osc.detune);
      lfo.start(t); lfo.stop(t + dur + 0.1);

      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(680 + i * 55, t);
      lp.Q.setValueAtTime(0.35, t);

      // Slow fade in / cross-fade out
      const vol = Math.max(0.008, 0.052 - i * 0.007);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 1.4);
      gain.gain.setValueAtTime(vol, t + dur - 0.9);
      gain.gain.linearRampToValueAtTime(0.001, t + dur);

      osc.connect(lp); lp.connect(gain); gain.connect(masterGain);
      osc.start(t); osc.stop(t + dur + 0.06);
    });
  }

  // ── Vinyl crackle ─────────────────────────────────────────────
  function _startCrackle() {
    if (_crackleNode) return;
    const buf    = _noiseBuffer(3.0);
    _crackleNode = ctx.createBufferSource();
    _crackleNode.buffer = buf;
    _crackleNode.loop   = true;
    const lp   = ctx.createBiquadFilter();
    lp.type    = 'lowpass';
    lp.frequency.setValueAtTime(280, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.022, ctx.currentTime);
    _crackleNode.connect(lp); lp.connect(gain); gain.connect(masterGain);
    _crackleNode.start();
  }

  function _stopCrackle() {
    if (_crackleNode) {
      try { _crackleNode.stop(); } catch (_) {}
      _crackleNode = null;
    }
  }

  // ── White noise buffer ─────────────────────────────────────
  function _noiseBuffer(duration) {
    const len = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── Toggle ──────────────────────────────────────────────────
  function toggle() {
    _enabled = !_enabled;
    if (_enabled) {
      masterGain.gain.setValueAtTime(0.55, ctx.currentTime);
      startAmbient();
    } else {
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(stopAmbient, 600);
    }
    return _enabled;
  }

  function isEnabled() { return _enabled; }

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

  function _ding(freq, vol, duration, startTime) {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g); g.connect(masterGain);
    osc.start(startTime); osc.stop(startTime + duration);
  }

  function _sfxCollect() {
    [880, 1108.73, 1318.51].forEach((freq, i) => _ding(freq, 0.18, 0.45, ctx.currentTime + i * 0.1));
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
    [261.63, 329.63, 392, 523.25].forEach((freq, i) => _ding(freq, 0.24, 1.8, ctx.currentTime + i * 0.18));
  }

  function _sfxComplete() {
    [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((freq, i) => _ding(freq, 0.2, 1.5, ctx.currentTime + i * 0.14));
  }

  return { init, startAmbient, stopAmbient, playSFX, toggle, isEnabled };
})();
