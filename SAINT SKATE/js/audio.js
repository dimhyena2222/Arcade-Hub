/* ═══════════════════════════════════════════════
   SAINT SKATE — Audio System (Web Audio API)
   Fully synthesized — no audio files required
═══════════════════════════════════════════════ */

const AudioSys = (() => {
  let ctx = null;
  let masterGain, sfxGain, musicGain;
  let musicOscillators = [];
  let rollNode = null;
  let grindNode = null;

  const settings = { music: 0.6, sfx: 0.8 };

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain(); masterGain.gain.value = 1.0;
      sfxGain    = ctx.createGain(); sfxGain.gain.value = settings.sfx;
      musicGain  = ctx.createGain(); musicGain.gain.value = settings.music;
      sfxGain.connect(masterGain);
      musicGain.connect(masterGain);
      masterGain.connect(ctx.destination);
    } catch(e) { console.warn('AudioContext unavailable'); }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ─── Low-level helpers ─────────────────── */
  function playTone(freq, type, duration, gainVal, dest) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(gainVal || 0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function playNoise(duration, gainVal, lowFreq, highFreq) {
    if (!ctx) return;
    const bufSize = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = ((lowFreq || 100) + (highFreq || 400)) / 2;
    filter.Q.value = 0.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainVal || 0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(sfxGain);
    src.start();
    return src;
  }

  /* ─── SFX ───────────────────────────────── */
  function sfxOllie() {
    if (!ctx) return;
    // Pop: short transient
    playNoise(0.06, 0.8, 200, 800);
    // Tail pop tone
    playTone(120, 'square', 0.12, 0.4);
    // Whoosh up
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime + 0.05);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.15, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g); g.connect(sfxGain);
    osc.start(ctx.currentTime + 0.05);
    osc.stop(ctx.currentTime + 0.25);
  }

  function sfxLand() {
    if (!ctx) return;
    playNoise(0.15, 0.6, 80, 300);
    playTone(80, 'square', 0.1, 0.3);
  }

  function sfxFlipTrick() {
    if (!ctx) return;
    sfxOllie();
    // Flick — rapid repeating click
    for (let i = 0; i < 3; i++) {
      const t = ctx.currentTime + 0.08 + i * 0.04;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900 - i * 100, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + 0.05);
    }
  }

  function sfxGrabTrick() {
    if (!ctx) return;
    sfxOllie();
    playTone(200, 'triangle', 0.3, 0.25);
  }

  function sfxBail() {
    if (!ctx) return;
    playNoise(0.4, 0.9, 50, 600);
    playTone(60, 'sawtooth', 0.3, 0.5);
    playTone(45, 'square', 0.5, 0.3);
  }

  function sfxGrindStart() {
    if (!ctx) return;
    stopGrind();
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 280;
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 2;
    g.gain.value = 0.18;
    // Slight vibrato
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 18;
    lfoG.gain.value = 30;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    lfo.start();
    osc.connect(filter); filter.connect(g); g.connect(sfxGain);
    osc.start();
    grindNode = { osc, lfo, g };
  }

  function stopGrind() {
    if (!grindNode) return;
    try {
      grindNode.g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      grindNode.osc.stop(ctx.currentTime + 0.06);
      grindNode.lfo.stop(ctx.currentTime + 0.06);
    } catch(e) {}
    grindNode = null;
  }

  function sfxRespect() {
    if (!ctx) return;
    const notes = [440, 550, 660, 880];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + 0.3);
    });
  }

  function sfxMissionComplete() {
    if (!ctx) return;
    const melody = [260, 330, 390, 520, 650];
    melody.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.1;
      playTone(freq, 'triangle', 0.35, 0.35);
    });
    playNoise(0.3, 0.2, 100, 400);
  }

  function sfxSpin() {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(g); g.connect(sfxGain);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }

  /* ─── Board Roll Loop ────────────────────── */
  function startRoll(speed) {
    if (!ctx) return;
    stopRoll();
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 60 + speed * 20;
    filter.type = 'lowpass';
    filter.frequency.value = 300 + speed * 100;

    // Rumble noise
    const bufSize = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buf;
    noiseNode.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 200;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04 * speed;

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(sfxGain);

    osc.connect(filter); filter.connect(g);
    g.gain.value = Math.min(0.12, speed * 0.04);
    g.connect(sfxGain);
    osc.start();
    noiseNode.start();
    rollNode = { osc, noiseNode, g, noiseGain };
  }

  function updateRoll(speed) {
    if (!rollNode || !ctx) return;
    if (speed < 0.1) { stopRoll(); return; }
    rollNode.osc.frequency.setTargetAtTime(60 + speed * 20, ctx.currentTime, 0.1);
    rollNode.g.gain.setTargetAtTime(Math.min(0.12, speed * 0.04), ctx.currentTime, 0.1);
    rollNode.noiseGain.gain.setTargetAtTime(0.04 * speed, ctx.currentTime, 0.1);
  }

  function stopRoll() {
    if (!rollNode || !ctx) return;
    try {
      rollNode.g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      rollNode.osc.stop(ctx.currentTime + 0.12);
      rollNode.noiseNode.stop(ctx.currentTime + 0.12);
    } catch(e) {}
    rollNode = null;
  }

  /* ─── Ambient Music (lo-fi urban drone) ─── */
  function startAmbient() {
    if (!ctx) return;
    stopAmbient();
    // Bass drone
    const bass = ctx.createOscillator();
    const bassG = ctx.createGain();
    bass.type = 'sawtooth';
    bass.frequency.value = 55;
    bassG.gain.value = 0.06;
    bass.connect(bassG); bassG.connect(musicGain);
    bass.start();

    // Pad chords — cycle through Cmin voicing
    const chordNotes = [130.8, 155.6, 185.0, 220.0];
    const pads = chordNotes.map(freq => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.value = 0.025;
      osc.connect(g); g.connect(musicGain);
      osc.start();
      return { osc, g };
    });

    // Arpeggiated high notes
    const arpNotes  = [261.6, 311.1, 369.9, 440, 523.2, 369.9, 311.1];
    let arpIdx = 0;
    const arpInterval = setInterval(() => {
      if (!ctx) { clearInterval(arpInterval); return; }
      const freq = arpNotes[arpIdx % arpNotes.length];
      arpIdx++;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(g); g.connect(musicGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    }, 280);

    musicOscillators = [bass, ...pads.map(p => p.osc)];
    musicOscillators._interval = arpInterval;
  }

  function startIntenseAmbient() {
    // For Mission 3 — slightly faster arp + louder
    stopAmbient();
    if (!ctx) return;
    const bass = ctx.createOscillator();
    const bassG = ctx.createGain();
    bass.type = 'sawtooth'; bass.frequency.value = 55;
    bassG.gain.value = 0.08;
    bass.connect(bassG); bassG.connect(musicGain); bass.start();

    const arpNotes = [261.6, 311.1, 369.9, 440, 523.2, 622.3, 523.2, 440];
    let arpIdx = 0;
    const arpInterval = setInterval(() => {
      if (!ctx) { clearInterval(arpInterval); return; }
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = arpNotes[arpIdx % arpNotes.length];
      arpIdx++;
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(g); g.connect(musicGain);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }, 180);

    musicOscillators = [bass];
    musicOscillators._interval = arpInterval;
  }

  function stopAmbient() {
    if (musicOscillators._interval) {
      clearInterval(musicOscillators._interval);
    }
    musicOscillators.forEach(o => { try { o.stop(); } catch(e){} });
    musicOscillators = [];
  }

  /* ─── Volume setters ─────────────────────── */
  function setMusicVol(v) {
    settings.music = v;
    if (musicGain) musicGain.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
  }
  function setSfxVol(v) {
    settings.sfx = v;
    if (sfxGain) sfxGain.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
  }

  return {
    init, resume,
    sfxOllie, sfxLand, sfxFlipTrick, sfxGrabTrick,
    sfxBail, sfxGrindStart, stopGrind,
    sfxRespect, sfxMissionComplete, sfxSpin,
    startRoll, updateRoll, stopRoll,
    startAmbient, startIntenseAmbient, stopAmbient,
    setMusicVol, setSfxVol
  };
})();
