/* ============================================================
   LUMEN'S LANTERN — Main Game Controller
   ============================================================ */

// ── State constants ──────────────────────────────────────────
const STATE = { TITLE: 0, INTRO: 1, PLAYING: 2, MISSION_COMPLETE: 3, GAME_OVER: 4, VICTORY: 5 };

// ── Game object ───────────────────────────────────────────────
const Game = (() => {

  // Canvas
  let canvas, ctx, cycleCanvas, cyclectx;
  let W, H;

  // State
  let state        = STATE.TITLE;
  let levelIndex   = 0;
  let levelData    = null;

  // Entities
  let player       = null;
  let crystals     = [];
  let embers       = [];
  let mirrors      = [];
  let lantern      = null;
  let shadows      = [];
  let lightBeam    = null;
  let particles    = [];

  // Camera
  let camX = 0;

  // Day-Night cycle (0..1, loops over CYCLE_DURATION seconds)
  let cycleTime   = 0.15;
  const CYCLE_DUR = 90;

  // Input
  const keys      = {};
  let   jumpPress = false;   // edge-trigger for jump

  // Flash overlay (for damage / complete effects)
  let flashColor = 'rgba(255,255,255,0)';
  let flashAlpha = 0;

  // Parallax tree buffers (generated per level)
  let treesBack  = [];   // 0.25x scroll
  let treesMid   = [];   // 0.55x scroll

  // Stars (used for cave + night levels)
  let stars = [];

  // ── Public entry ────────────────────────────────────────────
  function init() {
    canvas      = document.getElementById('gameCanvas');
    ctx         = canvas.getContext('2d');
    cycleCanvas = document.getElementById('cycleCanvas');
    cyclectx    = cycleCanvas.getContext('2d');
    W = canvas.width;
    H = canvas.height;

    _generateStars();

    // UI buttons
    document.getElementById('start-btn').addEventListener('click', () => {
      AudioManager.init();
      AudioManager.startAmbient();
      levelIndex = 0;
      _showIntro();
    });

    document.getElementById('music-btn').addEventListener('click', () => {
      const on = AudioManager.toggle();
      document.getElementById('music-btn').textContent = `♪ Music: ${on ? 'ON' : 'OFF'}`;
    });

    document.getElementById('play-btn').addEventListener('click', _startLevel);

    document.getElementById('next-btn').addEventListener('click', () => {
      levelIndex++;
      if (levelIndex >= LEVELS.length) {
        _showScreen('victory-screen');
        state = STATE.VICTORY;
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('controls-hint').classList.add('hidden');
        AudioManager.playSFX('complete');
      } else {
        _showIntro();
      }
    });

    document.getElementById('retry-btn').addEventListener('click', () => {
      _showIntro();
    });

    document.getElementById('replay-btn').addEventListener('click', () => {
      levelIndex = 0;
      cycleTime  = 0.15;
      _showIntro();
    });

    // Input
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if ((e.code === 'Space' || e.code === 'ArrowUp') && state === STATE.PLAYING) {
        if (!jumpPress) { player.jump(); }
        jumpPress = true;
      }
      if (e.code === 'Space') e.preventDefault();
    });

    window.addEventListener('keyup', e => {
      keys[e.code] = false;
      if (e.code === 'Space' || e.code === 'ArrowUp') jumpPress = false;
    });

    // Start loop
    let lastTime = 0;
    function loop(ts) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      _update(dt);
      _render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
  }

  // ── Load level ───────────────────────────────────────────────
  function _loadLevel() {
    levelData = LEVELS[levelIndex];
    cycleTime = 0.15;
    particles = [];

    // Player
    player = new Player(levelData.spawnX, levelData.spawnY);

    // Crystals
    crystals = levelData.crystals.map(c => new Crystal(c.x, c.y, c.color));

    // Embers
    embers = levelData.embers.map(e => new Ember(e.x, e.y));

    // Mirrors
    mirrors = levelData.mirrors.map(m => new Mirror(m.x, m.y));

    // Light beam
    if (levelData.beamWaypoints.length > 0) {
      lightBeam = new LightBeam(levelData.beamWaypoints);
    } else {
      lightBeam = null;
    }

    // Lantern
    lantern = new Lantern(levelData.lantern.x, levelData.lantern.y, true);

    // Shadow creatures
    shadows = levelData.shadows.map(s =>
      new ShadowCreature(s.x, s.y, s.left, s.right)
    );

    // Generate parallax trees
    _buildTrees(levelData);

    // Camera
    camX = 0;
  }

  function _buildTrees(ld) {
    treesBack = ld.trees.map(t => ({ ...t, layer: 0 }));
    treesMid  = ld.trees.map(t => ({
      x:    t.x + 60 + (Math.abs(t.x * 7 + t.tall * 3) % 120),
      tall: t.tall * 0.65,
      type: t.type,
      layer: 1,
    }));
  }

  function _generateStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x:    Math.random() * 2850,
        y:    20 + Math.random() * 280,
        r:    0.5 + Math.random() * 1.5,
        blink: Math.random() * Math.PI * 2,
      });
    }
  }

  // ── UI helpers ───────────────────────────────────────────────
  function _showScreen(id) {
    ['title-screen','level-intro','mission-complete','game-over','victory-screen']
      .forEach(s => document.getElementById(s).classList.add('hidden'));
    if (id) document.getElementById(id).classList.remove('hidden');
  }

  function _showIntro() {
    state = STATE.INTRO;
    _loadLevel();
    const ld = levelData;
    document.getElementById('level-number').textContent      = `FOREST ${ld.id} OF ${LEVELS.length}`;
    document.getElementById('level-name-big').textContent    = ld.name;
    document.getElementById('level-flavour').textContent     = ld.flavour;
    document.getElementById('level-mission-text').textContent = ld.mission;
    _showScreen('level-intro');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controls-hint').classList.add('hidden');
  }

  function _startLevel() {
    state = STATE.PLAYING;
    _showScreen(null);
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('controls-hint').classList.remove('hidden');
    _updateHUD();
  }

  function _updateHUD() {
    const ld = levelData;

    // Mission text
    document.getElementById('mission-desc').textContent = ld.mission;

    // Progress
    let progress = '';
    if (crystals.length > 0) {
      const got = crystals.filter(c => c.collected).length;
      progress = `Crystals: ${got} / ${crystals.length}`;
      if (got === crystals.length && !lantern.lit) progress += '  ✦ Find the lantern!';
    } else if (embers.length > 0) {
      const got = embers.filter(e => e.collected).length;
      progress = `Embers: ${got} / ${embers.length}`;
      if (got === embers.length && !lantern.lit) progress += '  ✦ Find the lantern!';
    } else if (mirrors.length > 0) {
      const got = mirrors.filter(m => m.activated).length;
      progress = `Mirrors: ${got} / ${mirrors.length}`;
      if (got === mirrors.length && !lantern.lit) progress += '  ✦ Touch the lantern!';
    }
    document.getElementById('mission-progress').textContent = progress;

    // Glow charges
    const chargeEl = document.getElementById('glow-charges');
    chargeEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const orb = document.createElement('div');
      orb.className = 'glow-orb' + (i < player.glowCharges ? '' : ' lost');
      chargeEl.appendChild(orb);
    }
  }

  function _drawCycleClock() {
    const c = cyclectx;
    const r = 25;
    c.clearRect(0, 0, 60, 60);

    const angle = cycleTime * Math.PI * 2 - Math.PI / 2;
    const body  = _getCycleColors(cycleTime);

    // Background circle
    c.fillStyle = body.bg;
    c.beginPath(); c.arc(30, 30, r, 0, Math.PI * 2); c.fill();

    // Arc band (day portion highlight)
    c.strokeStyle = body.arc;
    c.lineWidth    = 3;
    c.globalAlpha  = 0.5;
    c.beginPath(); c.arc(30, 30, r - 3, -Math.PI / 2, angle); c.stroke();
    c.globalAlpha  = 1;

    // Sun or moon indicator
    const ix = 30 + Math.cos(angle) * (r - 6);
    const iy = 30 + Math.sin(angle) * (r - 6);
    c.fillStyle   = body.orb;
    c.shadowBlur  = 6;
    c.shadowColor = body.orb;
    c.beginPath(); c.arc(ix, iy, 5, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
  }

  function _getCycleColors(t) {
    // t: 0=dawn, 0.25=day, 0.5=dusk, 0.75=night
    if (t < 0.25) {
      return { bg: '#1a1030', arc: '#ffaa40', orb: '#ffd060' };
    } else if (t < 0.5) {
      return { bg: '#0a1828', arc: '#60aaff', orb: '#fffbe0' };
    } else if (t < 0.75) {
      return { bg: '#1a0a20', arc: '#ff7040', orb: '#ffaa60' };
    } else {
      return { bg: '#04060e', arc: '#4060c0', orb: '#c0d8ff' };
    }
  }

  // ── Mission logic ─────────────────────────────────────────────
  function _checkMission() {
    const ld = levelData;
    let goalReady = false;

    if (crystals.length > 0) {
      goalReady = crystals.every(c => c.collected);
    } else if (embers.length > 0) {
      goalReady = embers.every(e => e.collected);
    } else if (mirrors.length > 0) {
      goalReady = mirrors.every(m => m.activated);
    }

    if (goalReady && !lantern.lit) {
      lantern.light();
      AudioManager.playSFX('lantern');
      _flash('#ffe080', 0.35);
    }

    // Touch the lantern when it's lit → win!
    if (lantern.lit) {
      const pb = player.getBounds();
      const lb = lantern.getBounds();
      if (aabbOverlap(pb, lb)) {
        _missionComplete();
      }
    }
  }

  function _missionComplete() {
    state = STATE.MISSION_COMPLETE;
    AudioManager.playSFX('complete');
    _flash('#ffe080', 0.5);

    // Burst of particles at lantern
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      particles.push(new Particle(
        lantern.x, lantern.y,
        Math.cos(angle) * speed, Math.sin(angle) * speed - 80,
        Math.random() < 0.5 ? '#ffd060' : '#ffaa30',
        2 + Math.random() * 3, 1.5
      ));
    }

    const msg = [
      'The Mossy Lantern glows warmly again.',
      'Starlight fills the Crystal Cavern once more.',
      'The Great Lantern banishes the shadows forever.',
    ][levelIndex] || 'The forest brightens.';
    document.getElementById('complete-msg').textContent = msg;

    _showScreen('mission-complete');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controls-hint').classList.add('hidden');
  }

  function _flash(color, strength) {
    flashColor = color;
    flashAlpha = strength;
  }

  // ── Update ────────────────────────────────────────────────────
  function _update(dt) {
    cycleTime = (cycleTime + dt / CYCLE_DUR) % 1;
    flashAlpha = Math.max(0, flashAlpha - dt * 1.8);

    if (state !== STATE.PLAYING) return;

    const ld = levelData;

    // Player
    player.applyInput(keys, dt);
    player.update(dt, ld.platforms, ld.worldWidth);

    // Camera – smooth follow, clamped
    const targetCamX = player.getCenterX() - W / 2;
    camX += (targetCamX - camX) * Math.min(dt * 8, 1);
    camX  = Math.max(0, Math.min(ld.worldWidth - W, camX));

    // Crystals
    crystals.forEach(c => {
      c.update(dt, particles);
      if (!c.collected) {
        const pb = player.getBounds();
        const cb = c.getBounds();
        if (aabbOverlap(pb, cb)) {
          c.collected = true;
          AudioManager.playSFX('collect');
          _flash('#a0f8ff', 0.25);
          for (let i = 0; i < 16; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 30 + Math.random() * 80;
            particles.push(new Particle(c.x, c.y,
              Math.cos(ang)*spd, Math.sin(ang)*spd - 60,
              c.color, 2 + Math.random()*2, 1.0));
          }
        }
      }
    });

    // Embers
    embers.forEach(e => {
      e.update(dt);
      if (!e.collected) {
        const pb = player.getBounds();
        const eb = e.getBounds();
        if (aabbOverlap(pb, eb)) {
          e.collected = true;
          AudioManager.playSFX('collect');
          _flash('#ff8840', 0.25);
          for (let i = 0; i < 16; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 40 + Math.random() * 90;
            particles.push(new Particle(e.x, e.y,
              Math.cos(ang)*spd, Math.sin(ang)*spd - 70,
              Math.random() < 0.5 ? '#ff8830' : '#ffee50',
              2 + Math.random()*2, 1.1));
          }
        }
      }
    });

    // Mirrors – activate by standing on them
    mirrors.forEach(m => {
      m.update(dt);
      if (!m.activated) {
        const pb = player.getBounds();
        // Player feet near mirror area
        const mb = m.getBounds();
        if (aabbOverlap(pb, mb)) {
          m.activated = true;
          AudioManager.playSFX('collect');
          _flash('#80eeff', 0.25);
          for (let i = 0; i < 12; i++) {
            const ang = Math.random() * Math.PI * 2;
            particles.push(new Particle(m.x, m.y - 20,
              Math.cos(ang) * 60, Math.sin(ang) * 60 - 40,
              '#80eeff', 2, 0.9));
          }
        }
      }
    });

    // Light beam
    if (lightBeam) {
      const activatedCount = mirrors.filter(m => m.activated).length;
      lightBeam.update(dt, activatedCount, mirrors.length);
    }

    // Lantern
    lantern.update(dt);

    // Shadow creatures
    shadows.forEach(s => {
      s.update(dt);
      const pb = player.getBounds();
      const sb = s.getBounds();
      if (aabbOverlap(pb, sb)) {
        if (player.takeDamage(1)) {
          _flash('#6600aa', 0.35);
        }
      }
    });

    // Particles
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);

    // Stars blink
    stars.forEach(s => s.blink += dt * (1.5 + s.r));

    // Mission check
    _checkMission();

    // HUD
    _updateHUD();
    _drawCycleClock();

    // Game over
    if (player.dead) {
      state = STATE.GAME_OVER;
      _showScreen('game-over');
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('controls-hint').classList.add('hidden');
    }
  }

  // ── Render ────────────────────────────────────────────────────
  function _render() {
    if (!levelData && state !== STATE.TITLE) return;

    ctx.clearRect(0, 0, W, H);

    if (state === STATE.TITLE) {
      _drawTitleBackground();
      return;
    }

    _drawBackground();
    _drawPlatforms();
    if (lightBeam) lightBeam.draw(ctx, camX, mirrors.filter(m => m.activated).length);
    mirrors.forEach(m => m.draw(ctx, camX));
    crystals.forEach(c => c.draw(ctx, camX, cycleTime));
    embers.forEach(e => e.draw(ctx, camX));
    lantern.draw(ctx, camX);
    shadows.forEach(s => s.draw(ctx, camX));
    if (state === STATE.PLAYING || state === STATE.MISSION_COMPLETE) {
      player.draw(ctx, camX);
    }
    particles.forEach(p => p.draw(ctx, camX));
    _drawVignette();
    _drawFlash();
  }

  // ── Background ────────────────────────────────────────────────
  function _drawTitleBackground() {
    // Animated starry forest for title screen
    const t   = cycleTime;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#04060e');
    grad.addColorStop(1, '#0e1620');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.save();
    stars.forEach(s => {
      const alpha = 0.4 + Math.sin(s.blink) * 0.35;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#c8e0ff';
      ctx.beginPath();
      ctx.arc(s.x % W, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Title trees silhouette
    _drawSilhouetteTrees(ctx, 0, '#0a0f18');
  }

  function _drawBackground() {
    const ld  = levelData;
    const t   = cycleTime;

    // Sky gradient – blend with daynight phase
    const skyShift = _getCycleShift(t);
    const topColor    = _blendHex(ld.skyTop,    skyShift.top,    skyShift.w);
    const bottomColor = _blendHex(ld.skyBottom, skyShift.bottom, skyShift.w);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, topColor);
    grad.addColorStop(0.7, bottomColor);
    grad.addColorStop(1, ld.groundColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars (cave/night levels always; other levels only at night phase)
    const showStars = ld.theme === 'cave' || ld.theme === 'night' || t > 0.65 || t < 0.1;
    if (showStars) {
      const starAlpha = ld.theme === 'cave' ? 0.8 : Math.max(0, t > 0.65 ? (t - 0.65) / 0.1 : (0.1 - t) / 0.1 * 0.8);
      ctx.save();
      stars.forEach(s => {
        if (s.x - camX * 0.15 < -10 || s.x - camX * 0.15 > W + 10) return;
        const alpha = (0.4 + Math.sin(s.blink) * 0.35) * starAlpha;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = ld.theme === 'cave' ? '#a0c8ff' : '#e8f0ff';
        ctx.beginPath();
        ctx.arc(s.x - camX * 0.15, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Back trees (parallax 0.25x)
    _drawParallaxTrees(treesBack, camX * 0.25, ld, 0.5);

    // Mid trees (parallax 0.55x)
    _drawParallaxTrees(treesMid,  camX * 0.55, ld, 0.75);

    // Mist bands
    ctx.save();
    ctx.fillStyle = ld.mistColor;
    [360, 390, 410].forEach((my, i) => {
      const bx = ((camX * 0.3 + i * 250) % (W + 300)) - 150;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(bx, my, 220, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function _drawParallaxTrees(treeArr, scrollX, ld, alphaFactor) {
    treeArr.forEach(t => {
      const sx = t.x - scrollX;
      if (sx < -160 || sx > W + 60) return;
      _drawTree(ctx, sx, 450, t.tall, t.type, ld.theme, alphaFactor);
    });
  }

  function _drawTree(ctx, x, groundY, tall, type, theme, alpha) {
    ctx.save();
    ctx.globalAlpha = 0.6 * alpha;

    if (type === 2) {
      // Stalactite (cave)
      ctx.fillStyle = '#1a2550';
      ctx.beginPath();
      ctx.moveTo(x - 20, 0);
      ctx.lineTo(x + 20, 0);
      ctx.lineTo(x, tall);
      ctx.closePath();
      ctx.fill();
    } else {
      const trunkH = tall * 0.35;
      const foliageH = tall - trunkH;

      // Trunk
      const trunkColor = theme === 'night'  ? '#0a0c18' :
                         theme === 'cave'   ? '#10182e' :
                                             '#1a2a10';
      ctx.fillStyle = trunkColor;
      ctx.fillRect(x - 5, groundY - trunkH, 10, trunkH);

      // Foliage
      const foliageColor = theme === 'night' ? '#080e1a' :
                           theme === 'cave'  ? '#0d1a30' :
                                              '#182812';
      ctx.fillStyle = foliageColor;

      if (type === 1) {
        // Pine triangle
        ctx.beginPath();
        ctx.moveTo(x, groundY - trunkH - foliageH);
        ctx.lineTo(x + foliageH * 0.45, groundY - trunkH);
        ctx.lineTo(x - foliageH * 0.45, groundY - trunkH);
        ctx.closePath();
        ctx.fill();
      } else {
        // Round
        ctx.beginPath();
        ctx.arc(x, groundY - trunkH - foliageH * 0.5, foliageH * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function _drawSilhouetteTrees(ctx, scrollX, color) {
    const positions = [60, 140, 240, 340, 450, 570, 660, 750];
    positions.forEach((x, i) => {
      const h = 80 + (i % 3) * 30;
      _drawTree(ctx, x, H, h, i % 2, 'night', 1);
    });
  }

  function _drawPlatforms() {
    const ld = levelData;
    ld.platforms.forEach(p => {
      const sx = p.x - camX;
      if (sx + p.w < 0 || sx > W) return;  // culling

      ctx.save();

      // Ground platform (tall rectangles)
      if (p.h >= 40) {
        const gc = ld.groundColor;
        ctx.fillStyle = gc;
        ctx.fillRect(sx, p.y, p.w, p.h);
        // Grassy / rocky top strip
        ctx.fillStyle = ld.groundTop;
        ctx.fillRect(sx, p.y, p.w, 6);
        // Subtle bump texture
        for (let bx = sx; bx < sx + p.w; bx += 28) {
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.beginPath();
          ctx.arc(bx + 14, p.y + 3, 10, Math.PI, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Floating platform
        const theme = ld.theme;
        const baseColor  = theme === 'night'  ? '#1a1c30' :
                           theme === 'cave'   ? '#1a2040' :
                                               '#2c4420';
        const topColor   = theme === 'night'  ? '#282a44' :
                           theme === 'cave'   ? '#2a3060' :
                                               '#4a7030';
        const glowColor  = theme === 'night'  ? 'rgba(80,60,160,0.2)' :
                           theme === 'cave'   ? 'rgba(60,80,200,0.2)' :
                                               'rgba(80,160,60,0.2)';

        // Glow under platform
        ctx.shadowBlur  = 12;
        ctx.shadowColor = glowColor;
        ctx.fillStyle   = baseColor;
        _roundRect(ctx, sx, p.y, p.w, p.h, 5);
        ctx.fill();

        // Top highlight strip
        ctx.shadowBlur = 0;
        ctx.fillStyle  = topColor;
        _roundRect(ctx, sx, p.y, p.w, 5, 3);
        ctx.fill();

        // Moss / crystal dots on top
        const dotColor = theme === 'cave'  ? 'rgba(100,160,255,0.4)' :
                         theme === 'night' ? 'rgba(100,80,200,0.4)'  :
                                            'rgba(120,220,80,0.4)';
        ctx.fillStyle = dotColor;
        ctx.shadowBlur = 6;
        ctx.shadowColor = dotColor;
        for (let dx = sx + 10; dx < sx + p.w - 10; dx += 22) {
          ctx.beginPath();
          ctx.arc(dx, p.y + 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });
  }

  function _drawVignette() {
    const grad = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function _drawFlash() {
    if (flashAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle   = flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── Colour helpers ────────────────────────────────────────────
  function _getCycleShift(t) {
    // Returns {top, bottom, w} modifier colours
    if (t < 0.1 || t > 0.9) {          // dawn / pre-dawn
      return { top: '#ff8040', bottom: '#ffc060', w: 0.18 };
    } else if (t < 0.35) {              // morning
      return { top: '#204060', bottom: '#406080', w: 0.1 };
    } else if (t < 0.6) {               // midday
      return { top: '#102030', bottom: '#204050', w: 0.05 };
    } else if (t < 0.75) {              // dusk
      return { top: '#600020', bottom: '#a04020', w: 0.2 };
    } else {                            // night
      return { top: '#060010', bottom: '#0a0820', w: 0.15 };
    }
  }

  function _blendHex(base, shift, weight) {
    const br = parseInt(base.slice(1,3),16), bg = parseInt(base.slice(3,5),16), bb = parseInt(base.slice(5,7),16);
    const sr = parseInt(shift.slice(1,3),16), sg = parseInt(shift.slice(3,5),16), sb = parseInt(shift.slice(5,7),16);
    const r  = Math.round(br + (sr - br) * weight);
    const g  = Math.round(bg + (sg - bg) * weight);
    const b  = Math.round(bb + (sb - bb) * weight);
    return `rgb(${r},${g},${b})`;
  }

  // ── Helper (shared with entities) ─────────────────────────────
  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return { init };

})();

// ── Bootstrap ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => Game.init());
