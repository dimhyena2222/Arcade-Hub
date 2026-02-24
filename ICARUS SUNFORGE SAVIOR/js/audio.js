// ============================================================
//  AUDIO MANAGER  –  Pure Web Audio API, no external files
// ============================================================
const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain  = null;
  let sfxGain    = null;
  let musicNodes = [];
  let currentTrack = null;

  const VOLUMES = { master: 0.7, music: 0.45, sfx: 0.65 };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain(); masterGain.gain.value = VOLUMES.master;
    musicGain  = ctx.createGain(); musicGain.gain.value  = VOLUMES.music;
    sfxGain    = ctx.createGain(); sfxGain.gain.value    = VOLUMES.sfx;
    musicGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);
  }

  // --- Utility ---
  function playTone(freq, type, dur, vol = 0.5, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  function playNoise(dur, vol = 0.3, hipass = 1000) {
    if (!ctx) return;
    const bufSize = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hipass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filter); filter.connect(g); g.connect(sfxGain);
    src.start(); src.stop(ctx.currentTime + dur);
  }

  // --- SFX ---
  const SFX = {
    jump() {
      playTone(220, 'square', 0.08, 0.4);
      playTone(440, 'square', 0.06, 0.2, 0.04);
    },
    land() {
      playNoise(0.06, 0.25, 800);
      playTone(80,  'sine', 0.07, 0.3);
    },
    shoot() {
      playTone(600, 'square', 0.04, 0.3);
      playTone(300, 'sawtooth', 0.08, 0.15, 0.02);
      playNoise(0.05, 0.1, 3000);
    },
    sword() {
      playTone(900, 'sawtooth', 0.05, 0.35);
      playTone(450, 'sawtooth', 0.12, 0.2, 0.01);
      playNoise(0.06, 0.2, 2000);
    },
    swordCharge() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.6);
      g.gain.setValueAtTime(0.1, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + 0.7);
    },
    swordChargeFire() {
      playTone(1500, 'sawtooth', 0.03, 0.5);
      playTone(750,  'sawtooth', 0.15, 0.35, 0.02);
      playNoise(0.08, 0.3, 1500);
    },
    hit() {
      playNoise(0.08, 0.35, 500);
      playTone(150, 'square', 0.06, 0.3);
    },
    enemyDie() {
      playTone(600, 'square', 0.05, 0.3);
      playTone(300, 'square', 0.08, 0.25, 0.04);
      playTone(150, 'square', 0.1,  0.2,  0.08);
      playNoise(0.1, 0.2, 800);
    },
    playerHit() {
      playNoise(0.12, 0.4, 300);
      playTone(200, 'sawtooth', 0.08, 0.3);
      playTone(100, 'sawtooth', 0.12, 0.2, 0.04);
    },
    dash() {
      playTone(300, 'square', 0.04, 0.25);
      playTone(600, 'square', 0.03, 0.15, 0.02);
      playNoise(0.04, 0.15, 4000);
    },
    bossHit() {
      playNoise(0.1, 0.4, 200);
      playTone(100, 'sawtooth', 0.1, 0.4);
    },
    bossPhase() {
      for (let i = 0; i < 5; i++) {
        playTone(200 + i * 120, 'square', 0.08, 0.3, i * 0.07);
      }
      playNoise(0.3, 0.4, 100);
    },
    victory() {
      const notes = [262, 330, 392, 523, 659, 784];
      notes.forEach((n, i) => playTone(n, 'square', 0.25, 0.35, i * 0.12));
    },
    checkpoint() {
      playTone(523, 'square', 0.1, 0.3);
      playTone(659, 'square', 0.1, 0.3, 0.1);
      playTone(784, 'square', 0.15, 0.35, 0.2);
    },
    menuBeep() {
      playTone(440, 'square', 0.05, 0.2);
    },
    menuSelect() {
      playTone(660, 'square', 0.05, 0.3);
      playTone(880, 'square', 0.04, 0.25, 0.04);
    },
    footstep() {
      playNoise(0.03, 0.12, 2000);
    },
    plasma() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, t);
      osc.frequency.linearRampToValueAtTime(40, t + 0.3);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + 0.32);
    }
  };

  // --- MUSIC ENGINE (procedural synth) ---
  let musicPlaying = false;
  let musicInterval = null;

  const TRACKS = {
    menu: {
      bpm: 80, notes: [
        [220, 'square', 0.3], [277, 'square', 0.3], [330, 'square', 0.4],
        [440, 'square', 0.5], [330, 'square', 0.3], [220, 'square', 0.4],
        [277, 'square', 0.3], [185, 'square', 0.6]
      ],
      bass: [55, 55, 69, 55, 55, 55, 69, 46],
      pad: true
    },
    combat: {
      bpm: 145, notes: [
        [440, 'sawtooth', 0.2], [494, 'sawtooth', 0.2], [523, 'sawtooth', 0.3],
        [587, 'sawtooth', 0.2], [523, 'sawtooth', 0.2], [440, 'sawtooth', 0.2],
        [370, 'sawtooth', 0.3], [330, 'sawtooth', 0.4]
      ],
      bass: [110, 110, 138, 110, 110, 138, 110, 82],
      pad: false
    },
    boss: {
      bpm: 170, notes: [
        [880, 'sawtooth', 0.2], [698, 'sawtooth', 0.2], [587, 'sawtooth', 0.3],
        [523, 'sawtooth', 0.2], [440, 'sawtooth', 0.2], [370, 'sawtooth', 0.2],
        [330, 'sawtooth', 0.3], [294, 'sawtooth', 0.4]
      ],
      bass: [110, 87, 73, 82, 110, 87, 73, 65],
      pad: false
    },
    win: {
      bpm: 90, notes: [
        [523, 'square', 0.4], [659, 'square', 0.4], [784, 'square', 0.5],
        [1047,'square', 0.6], [784, 'square', 0.4], [659, 'square', 0.4],
        [523, 'square', 0.5], [392, 'square', 0.6]
      ],
      bass: [131, 131, 165, 131, 131, 165, 131, 98],
      pad: true
    }
  };

  let trackStep = 0;
  let activeTrackName = null;

  function stopMusic() {
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    musicNodes.forEach(n => { try { n.stop(); } catch(e){} });
    musicNodes = [];
    activeTrackName = null;
  }

  function playMusic(name) {
    if (!ctx || name === activeTrackName) return;
    stopMusic();
    if (!TRACKS[name]) return;
    activeTrackName = name;
    trackStep = 0;
    const track = TRACKS[name];
    const beatMs = (60 / track.bpm) * 1000;

    function tick() {
      if (!ctx) return;
      const i = trackStep % track.notes.length;
      const [freq, type, dur] = track.notes[i];
      const bassFreq = track.bass[i];

      // Melody
      {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.5);
        osc.connect(g); g.connect(musicGain);
        osc.start(t); osc.stop(t + dur * 0.5 + 0.05);
        musicNodes.push(osc);
      }
      // Bass
      {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = bassFreq;
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.7);
        osc.connect(g); g.connect(musicGain);
        osc.start(t); osc.stop(t + dur * 0.7 + 0.05);
        musicNodes.push(osc);
      }
      // Pad (ambient drone)
      if (track.pad && trackStep % 8 === 0) {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 110;
        const t = ctx.currentTime;
        const padDur = beatMs * 8 / 1000;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.3);
        g.gain.setValueAtTime(0.08, t + padDur - 0.4);
        g.gain.linearRampToValueAtTime(0, t + padDur);
        osc.connect(g); g.connect(musicGain);
        osc.start(t); osc.stop(t + padDur);
        musicNodes.push(osc);
      }
      trackStep++;
    }

    tick();
    musicInterval = setInterval(tick, beatMs);
  }

  return {
    init,
    sfx: SFX,
    playMusic,
    stopMusic,
    setMasterVol(v) { if (masterGain) masterGain.gain.value = v; VOLUMES.master = v; },
    setMusicVol(v)  { if (musicGain)  musicGain.gain.value  = v; VOLUMES.music  = v; },
    setSfxVol(v)    { if (sfxGain)    sfxGain.gain.value    = v; VOLUMES.sfx    = v; },
    getMasterVol()  { return VOLUMES.master; },
    getMusicVol()   { return VOLUMES.music; },
    getSfxVol()     { return VOLUMES.sfx; },
    resume()        { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  };
})();
