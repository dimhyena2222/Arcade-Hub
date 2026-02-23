/* ============================================================
   LUMEN'S LANTERN — Main Game Controller (v2 — Solara Arc)
   ============================================================ */

const STATE = { TITLE:0, INTRO:1, PLAYING:2, MISSION_COMPLETE:3, GAME_OVER:4, VICTORY:5 };

const Game = (() => {

  let canvas, ctx, cycleCanvas, cyclectx, W, H;

  let state = STATE.TITLE, levelIndex = 0, levelData = null;

  // ── Entities ─────────────────────────────────────────────────
  let player, crystals=[], embers=[], mirrors=[], lantern, shadows=[], lightBeam, particles=[];
  // v2 entities
  let coins=[], pipes=[], glintwickNPC=null, vineAnchors=[], shadowBrambles=[], solara=null;

  // ── Camera ───────────────────────────────────────────────────
  let camX = 0;

  // ── Day-night cycle ──────────────────────────────────────────
  let cycleTime = 0.15;
  const CYCLE_DUR = 90;

  // ── Input ────────────────────────────────────────────────────
  const keys = {};
  let prevKeys = {};

  // ── Flash overlay ────────────────────────────────────────────
  let flashColor = 'rgba(255,255,255,0)', flashAlpha = 0;

  // ── Stars ────────────────────────────────────────────────────
  let stars = [];

  // ── Shop ─────────────────────────────────────────────────────
  let shopOpen      = false;
  let totalCoins    = 0;        // session-wide currency
  let nearGlintwick = false;

  // ── Vine dash ────────────────────────────────────────────────
  let nearVine = null;
  let interactHint = '';

  // ── Underground ──────────────────────────────────────────────
  let underground = {
    active: false, room: null,
    entryPipeX: 0, surfaceCamX: 0, surfacePlayerX: 0, surfacePlayerY: 0,
  };
  let underCoins   = [];
  let underExitPipe = null;

  // ── Public entry ─────────────────────────────────────────────
  function init() {
    canvas      = document.getElementById('gameCanvas');
    ctx         = canvas.getContext('2d');
    cycleCanvas = document.getElementById('cycleCanvas');
    cyclectx    = cycleCanvas.getContext('2d');
    W = canvas.width; H = canvas.height;

    _generateStars();

    document.getElementById('start-btn').addEventListener('click', () => {
      AudioManager.init(); AudioManager.startAmbient();
      levelIndex = 0; _showIntro();
    });
    document.getElementById('music-btn').addEventListener('click', () => {
      const on = AudioManager.toggle();
      document.getElementById('music-btn').textContent = `♪ Music: ${on?'ON':'OFF'}`;
    });
    document.getElementById('play-btn').addEventListener('click', _startLevel);
    document.getElementById('next-btn').addEventListener('click', () => {
      levelIndex++;
      if (levelIndex >= LEVELS.length) {
        _showScreen('victory-screen'); state = STATE.VICTORY;
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('controls-hint').classList.add('hidden');
        AudioManager.playSFX('complete');
      } else { _showIntro(); }
    });
    document.getElementById('retry-btn').addEventListener('click', () => _showIntro());
    document.getElementById('replay-btn').addEventListener('click', () => {
      levelIndex = 0; cycleTime = 0.15; totalCoins = 0; _showIntro();
    });

    // Shop buttons
    document.getElementById('buy-doubleJump').addEventListener('click', () => _buyAbility('doubleJump'));
    document.getElementById('buy-vineSwing').addEventListener('click',  () => _buyAbility('vineSwing'));
    document.getElementById('shop-close-btn').addEventListener('click', _closeShop);

    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'Space')  e.preventDefault();
      if (e.code === 'Escape' && shopOpen) _closeShop();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    let lastTime = 0;
    function loop(ts) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
      _update(dt); _render(); requestAnimationFrame(loop);
    }
    requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
  }

  // ── Terrain ──────────────────────────────────────────────────
  function _smoothstep(a, b, t) {
    t = Math.max(0, Math.min(1, t)); t = t*t*(3-2*t); return a+(b-a)*t;
  }

  function getGroundY(worldX) {
    const pts = underground.active ? underground.room.terrain : levelData.terrain;
    if (!pts || !pts.length) return H - 60;
    if (worldX <= pts[0].x) return pts[0].y;
    if (worldX >= pts[pts.length-1].x) return pts[pts.length-1].y;
    for (let i = 0; i < pts.length-1; i++) {
      if (worldX >= pts[i].x && worldX <= pts[i+1].x) {
        return _smoothstep(pts[i].y, pts[i+1].y, (worldX-pts[i].x)/(pts[i+1].x-pts[i].x));
      }
    }
    return H - 60;
  }

  // ── Load level ───────────────────────────────────────────────
  function _loadLevel() {
    levelData = LEVELS[levelIndex];
    cycleTime = 0.15; particles = [];
    const ld = levelData;

    const spawnGroundY = getGroundY(ld.spawnX);
    player = new Player(ld.spawnX, spawnGroundY);

    // Carry purchased abilities across levels
    if (player && levelIndex > 0) {
      // abilities persist via closure — but Player.reset() wipes them.
      // Re-apply from shop purchased flags.
      player.abilities.doubleJump = _purchased.doubleJump;
      player.abilities.vineSwing  = _purchased.vineSwing;
    }

    crystals = ld.crystals.map(c => new Crystal(c.x, c.y, c.color));
    embers   = ld.embers.map(e => new Ember(e.x, e.y));
    mirrors  = ld.mirrors.map(m => new Mirror(m.x, (m.y!==undefined)?m.y:getGroundY(m.x)-30));
    lightBeam = (ld.beamWaypoints&&ld.beamWaypoints.length) ? new LightBeam(ld.beamWaypoints) : null;
    lantern   = new Lantern(ld.lantern.x, ld.lantern.y, true);
    shadows   = ld.shadows.map(s => new ShadowCreature(s.x,(s.y!==undefined)?s.y:getGroundY(s.x)-28,s.left,s.right));

    // v2 entities
    coins         = (ld.coins         ||[]).map(c => new Coin(c.x, c.y));
    pipes         = (ld.pipes         ||[]).map(p => new Pipe(p.x, getGroundY(p.x), p.type||'pipe', p.zoneId||0));
    glintwickNPC  = ld.glintwick ? new GlintwickNPC(ld.glintwick.x, getGroundY(ld.glintwick.x)) : null;
    vineAnchors   = (ld.vineAnchors   ||[]).map(v => new VineAnchor(v.x, v.y));
    shadowBrambles= (ld.shadowBrambles||[]).map(b => new ShadowBramble(b.x, getGroundY(b.x), b.w));
    solara        = ld.solara ? new Solara(ld.solara.x, ld.solara.y) : null;

    // Reset underground
    underground.active = false; underground.room = null;
    underCoins = []; underExitPipe = null;
    camX = 0;
  }

  // Purchased abilities persist across the session
  const _purchased = { doubleJump: false, vineSwing: false };

  function _generateStars() {
    stars = [];
    for (let i = 0; i < 140; i++) {
      stars.push({ x:Math.random()*3200, y:10+Math.random()*300, r:0.4+Math.random()*1.6, blink:Math.random()*Math.PI*2 });
    }
  }

  // ── UI helpers ───────────────────────────────────────────────
  function _showScreen(id) {
    ['title-screen','level-intro','mission-complete','game-over','victory-screen']
      .forEach(s => document.getElementById(s).classList.add('hidden'));
    if (id) document.getElementById(id).classList.remove('hidden');
  }

  function _showIntro() {
    state = STATE.INTRO; _loadLevel();
    const ld = levelData;
    document.getElementById('level-number').textContent       = `FOREST ${ld.id} OF ${LEVELS.length}`;
    document.getElementById('level-name-big').textContent     = ld.name;
    document.getElementById('level-flavour').textContent      = ld.flavour;
    document.getElementById('level-mission-text').textContent = ld.mission;
    _showScreen('level-intro');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controls-hint').classList.add('hidden');
  }

  function _startLevel() {
    state = STATE.PLAYING; _showScreen(null);
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('controls-hint').classList.remove('hidden');
    _updateHUD();
  }

  function _updateHUD() {
    const ld = levelData;
    document.getElementById('mission-desc').textContent = ld.mission;

    let progress = '';
    if (crystals.length > 0) {
      const got = crystals.filter(c=>c.collected).length;
      progress = `Crystals: ${got} / ${crystals.length}`;
      if (got===crystals.length && !lantern.lit) progress += '  ✦ Find the lantern!';
    } else if (embers.length > 0) {
      const got = embers.filter(e=>e.collected).length;
      progress = `Embers: ${got} / ${embers.length}`;
      if (got===embers.length && !lantern.lit) progress += '  ✦ Find the lantern!';
      if (solara && !solara.freed && got===embers.length) progress += '  ✦ Solara is FREE!';
    } else if (mirrors.length > 0) {
      const got = mirrors.filter(m=>m.activated).length;
      progress = `Mirrors: ${got} / ${mirrors.length}`;
      if (got===mirrors.length && !lantern.lit) progress += '  ✦ Touch the lantern!';
    }
    document.getElementById('mission-progress').textContent = progress;

    const chargeEl = document.getElementById('glow-charges');
    chargeEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const orb = document.createElement('div');
      orb.className = 'glow-orb' + (i < player.glowCharges ? '' : ' lost');
      chargeEl.appendChild(orb);
    }

    // Coin counter
    document.getElementById('coin-count-hud').textContent = `🌕 ${totalCoins}`;
  }

  function _drawCycleClock() {
    const c = cyclectx, r = 25;
    c.clearRect(0,0,60,60);
    const angle = cycleTime*Math.PI*2 - Math.PI/2;
    const body  = _getCycleColors(cycleTime);
    c.fillStyle = body.bg; c.beginPath(); c.arc(30,30,r,0,Math.PI*2); c.fill();
    c.strokeStyle = body.arc; c.lineWidth=3; c.globalAlpha=0.5;
    c.beginPath(); c.arc(30,30,r-3,-Math.PI/2,angle); c.stroke(); c.globalAlpha=1;
    const ix=30+Math.cos(angle)*(r-6), iy=30+Math.sin(angle)*(r-6);
    c.fillStyle=body.orb; c.shadowBlur=6; c.shadowColor=body.orb;
    c.beginPath(); c.arc(ix,iy,5,0,Math.PI*2); c.fill(); c.shadowBlur=0;
  }

  function _getCycleColors(t) {
    if (t<0.25) return {bg:'#1a1030',arc:'#ffaa40',orb:'#ffd060'};
    if (t<0.5)  return {bg:'#0a1828',arc:'#60aaff',orb:'#fffbe0'};
    if (t<0.75) return {bg:'#1a0a20',arc:'#ff7040',orb:'#ffaa60'};
    return              {bg:'#04060e',arc:'#4060c0',orb:'#c0d8ff'};
  }

  // ── Mission logic ─────────────────────────────────────────────
  function _checkMission() {
    let goalReady = false;
    if (crystals.length>0)     goalReady = crystals.every(c=>c.collected);
    else if (embers.length>0)  goalReady = embers.every(e=>e.collected);
    else if (mirrors.length>0) goalReady = mirrors.every(m=>m.activated);

    if (goalReady && !lantern.lit) {
      lantern.light(); AudioManager.playSFX('lantern'); _flash('#ffe080',0.35);
    }
    if (lantern.lit && aabbOverlap(player.getBounds(), lantern.getBounds())) {
      _missionComplete();
    }
  }

  function _missionComplete() {
    state = STATE.MISSION_COMPLETE; AudioManager.playSFX('complete'); _flash('#ffe080',0.5);
    for (let i=0;i<40;i++) {
      const ang=Math.random()*Math.PI*2, spd=40+Math.random()*120;
      particles.push(new Particle(lantern.x,lantern.y,Math.cos(ang)*spd,Math.sin(ang)*spd-80,
        Math.random()<0.5?'#ffd060':'#ffaa30', 2+Math.random()*3, 1.5));
    }
    const msg = [
      'The Mossy Lantern glows warmly again. Glintwick winks knowingly.',
      'Starlight fills the Crystal Cavern once more. Solara was here…',
      'Solara soars free! The Shadow Canopy blooms with light forever.',
    ][levelIndex] || 'The forest brightens.';
    document.getElementById('complete-msg').textContent = msg;
    _showScreen('mission-complete');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('controls-hint').classList.add('hidden');
  }

  function _flash(color, strength) { flashColor = color; flashAlpha = strength; }

  // ── Update ────────────────────────────────────────────────────
  function _update(dt) {
    cycleTime  = (cycleTime + dt/CYCLE_DUR) % 1;
    flashAlpha = Math.max(0, flashAlpha - dt*1.8);
    if (state !== STATE.PLAYING) return;
    if (shopOpen) return;   // freeze world while shopping

    const ld = levelData;

    player.applyInput(keys, dt);
    const activeWorldWidth = underground.active ? W : ld.worldWidth;
    player.update(dt, getGroundY, activeWorldWidth);

    // Camera
    if (underground.active) {
      camX = 0;
    } else {
      const targetCamX = player.getCenterX() - W/2;
      camX += (targetCamX - camX) * Math.min(dt*8, 1);
      camX  = Math.max(0, Math.min(ld.worldWidth - W, camX));
    }

    // Key edge detection
    const downJustPressed = keys['ArrowDown']  && !prevKeys['ArrowDown'];
    const upJustPressed   = keys['ArrowUp']    && !prevKeys['ArrowUp'];
    const eJustPressed    = (keys['KeyE']||keys['KeyZ']) && !(prevKeys['KeyE']||prevKeys['KeyZ']);

    // ── Coins ───────────────────────────────────────────────────
    const activeCoinList = underground.active ? underCoins : coins;
    activeCoinList.forEach(c => {
      c.update(dt);
      if (!c.collected && aabbOverlap(player.getBounds(), c.getBounds())) {
        c.collected = true; totalCoins++; AudioManager.playSFX('collect'); _flash('#ffd040',0.15);
        for (let i=0;i<8;i++) {
          const ang=Math.random()*Math.PI*2;
          particles.push(new Particle(c.x,c.y,Math.cos(ang)*60,Math.sin(ang)*60-30,'#ffd040',2,0.7));
        }
      }
    });

    // ── Pipes ───────────────────────────────────────────────────
    pipes.forEach(p => p.update(dt));
    if (underExitPipe) underExitPipe.update(dt);

    // Pipe entry/exit on Down press
    if (downJustPressed) {
      if (underground.active && underExitPipe) {
        const pb = player.getBounds();
        const ep = {...underExitPipe.getBounds(), x:underExitPipe.getBounds().x-25, w:underExitPipe.getBounds().w+50};
        if (aabbOverlap(pb, ep)) { _exitUnderground(); }
      } else {
        const enterPipe = pipes.find(p => {
          const pb = player.getBounds();
          const pp = {...p.getBounds(), x:p.getBounds().x-25, w:p.getBounds().w+50};
          return aabbOverlap(pb, pp);
        });
        if (enterPipe) { _enterUnderground(enterPipe); }
      }
    }

    // ── Glintwick & Shop ────────────────────────────────────────
    if (glintwickNPC && !underground.active) {
      glintwickNPC.update(dt);
      nearGlintwick = Math.abs(player.getCenterX() - glintwickNPC.x) < 80;
      if (upJustPressed && nearGlintwick) { _openShop(); return; }
    } else {
      nearGlintwick = false;
    }

    // ── Vine anchors & Vine Dash ────────────────────────────────
    vineAnchors.forEach(v => v.update(dt));
    nearVine = null;
    if (player.abilities.vineSwing && !underground.active) {
      nearVine = vineAnchors.find(v => {
        const dx = player.getCenterX()-v.x, dy = player.getCenterY()-v.y;
        return Math.sqrt(dx*dx+dy*dy) < 80;
      });
      if (eJustPressed && nearVine) { _vineDash(nearVine); }
    }

    // ── Interaction hint ────────────────────────────────────────
    interactHint = '';
    if (underground.active && underExitPipe) {
      const pb = player.getBounds();
      const ep = {...underExitPipe.getBounds(), x:underExitPipe.getBounds().x-25, w:underExitPipe.getBounds().w+50};
      if (aabbOverlap(pb, ep)) interactHint = '↓  Exit underground';
    } else {
      const nearPipe = pipes.find(p => {
        const pb = player.getBounds();
        const pp = {...p.getBounds(), x:p.getBounds().x-25, w:p.getBounds().w+50};
        return aabbOverlap(pb, pp);
      });
      if (nearPipe)        interactHint = '↓  Enter secret grove';
      else if (nearGlintwick) interactHint = '↑  Shop with Glintwick';
      else if (nearVine)   interactHint = 'E  Vine Dash!';
    }

    // ── Shadow brambles ─────────────────────────────────────────
    shadowBrambles.forEach(b => b.update(dt));
    shadowBrambles = shadowBrambles.filter(b => !b.dead);

    // ── Solara rescue ────────────────────────────────────────────
    if (solara) {
      solara.update(dt);
      if (!solara.freed && embers.length>0 && embers.every(e=>e.collected)) {
        solara.free(); shadowBrambles.forEach(b => b.dissolve());
        _flash('#8090ff', 0.35); AudioManager.playSFX('lantern');
      }
    }

    // ── Crystals ────────────────────────────────────────────────
    crystals.forEach(c => {
      c.update(dt, particles);
      if (!c.collected && aabbOverlap(player.getBounds(), c.getBounds())) {
        c.collected = true; AudioManager.playSFX('collect'); _flash('#a0f8ff',0.25);
        for (let i=0;i<16;i++) {
          const ang=Math.random()*Math.PI*2,spd=30+Math.random()*80;
          particles.push(new Particle(c.x,c.y,Math.cos(ang)*spd,Math.sin(ang)*spd-60,c.color,2+Math.random()*2,1.0));
        }
      }
    });

    // ── Embers ──────────────────────────────────────────────────
    embers.forEach(e => {
      e.update(dt);
      if (!e.collected && aabbOverlap(player.getBounds(), e.getBounds())) {
        e.collected = true; AudioManager.playSFX('collect'); _flash('#ff8840',0.25);
        for (let i=0;i<16;i++) {
          const ang=Math.random()*Math.PI*2,spd=40+Math.random()*90;
          particles.push(new Particle(e.x,e.y,Math.cos(ang)*spd,Math.sin(ang)*spd-70,
            Math.random()<0.5?'#ff8830':'#ffee50',2+Math.random()*2,1.1));
        }
      }
    });

    // ── Mirrors ─────────────────────────────────────────────────
    mirrors.forEach(m => {
      m.update(dt);
      if (!m.activated && aabbOverlap(player.getBounds(), m.getBounds())) {
        m.activated=true; AudioManager.playSFX('collect'); _flash('#80eeff',0.25);
        for (let i=0;i<12;i++) {
          const ang=Math.random()*Math.PI*2;
          particles.push(new Particle(m.x,m.y-20,Math.cos(ang)*60,Math.sin(ang)*60-40,'#80eeff',2,0.9));
        }
      }
    });

    if (lightBeam) lightBeam.update(dt, mirrors.filter(m=>m.activated).length, mirrors.length);
    lantern.update(dt);

    // ── Shadows ─────────────────────────────────────────────────
    shadows.forEach(s => {
      s.update(dt);
      if (aabbOverlap(player.getBounds(), s.getBounds()) && player.takeDamage(1)) _flash('#6600aa',0.35);
    });

    // Shadow brambles block passage (push player back)
    shadowBrambles.forEach(b => {
      if (!b.dead && aabbOverlap(player.getBounds(), b.getBounds())) {
        // Push player out of bramble
        player.vx *= -0.5; player.vy = -80;
        if (Math.random() < 0.05) player.takeDamage(1);
      }
    });

    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    stars.forEach(s => s.blink += dt*(1.5+s.r));

    _checkMission();
    _updateHUD();
    _drawCycleClock();

    if (player.dead) {
      state = STATE.GAME_OVER;
      _showScreen('game-over');
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('controls-hint').classList.add('hidden');
    }

    // Save key edge state
    prevKeys = { ...keys };
  }

  // ── Render ────────────────────────────────────────────────────
  function _render() {
    if (!levelData && state !== STATE.TITLE) return;
    ctx.clearRect(0,0,W,H);
    if (state === STATE.TITLE) { _drawTitleBackground(); return; }

    if (underground.active) {
      _drawUndergroundBg();
      _drawTerrainFill();
      underCoins.forEach(c => c.draw(ctx, 0));
      if (underExitPipe) underExitPipe.draw(ctx, 0);
      if (state===STATE.PLAYING||state===STATE.MISSION_COMPLETE) player.draw(ctx, 0);
      particles.forEach(p => p.draw(ctx, 0));
      _drawVignette(); _drawFlash();
      _drawInteractHint();
      return;
    }

    // Surface diorama render (back to front)
    _drawSky();
    _drawStars();
    _drawTreeLayer(levelData.farTrees,  camX*0.10, levelData, 0.38);
    _drawTreeLayer(levelData.midTrees,  camX*0.40, levelData, 0.65);
    _drawMist();
    _drawTerrainFill();
    _drawDetails();

    // World entities
    vineAnchors.forEach(v => v.draw(ctx, camX));
    shadowBrambles.forEach(b => b.draw(ctx, camX));
    if (solara) solara.draw(ctx, camX);
    if (lightBeam) lightBeam.draw(ctx, camX, mirrors.filter(m=>m.activated).length);
    mirrors.forEach(m => m.draw(ctx, camX));
    crystals.forEach(c => c.draw(ctx, camX, cycleTime));
    embers.forEach(e => e.draw(ctx, camX));
    lantern.draw(ctx, camX);
    shadows.forEach(s => s.draw(ctx, camX));
    coins.forEach(c => c.draw(ctx, camX));
    pipes.forEach(p => p.draw(ctx, camX));
    if (glintwickNPC) glintwickNPC.draw(ctx, camX, nearGlintwick);

    if (state===STATE.PLAYING||state===STATE.MISSION_COMPLETE) player.draw(ctx, camX);
    particles.forEach(p => p.draw(ctx, camX));

    // Foreground over player
    _drawTreeLayer(levelData.closeTrees, camX*0.82, levelData, 0.85);
    _drawFoliageLayer(levelData.foliage, camX*0.88, levelData);

    _drawVignette(); _drawFlash();
    _drawInteractHint();
  }

  // ── Shop functions ────────────────────────────────────────────
  function _openShop() {
    shopOpen = true;
    document.getElementById('shop-panel').classList.remove('hidden');
    _updateShopButtons();
  }

  function _closeShop() {
    shopOpen = false;
    document.getElementById('shop-panel').classList.add('hidden');
  }

  function _updateShopButtons() {
    document.getElementById('shop-coin-count').textContent = totalCoins;
    const djBtn = document.getElementById('buy-doubleJump');
    const vsBtn = document.getElementById('buy-vineSwing');

    if (_purchased.doubleJump) {
      djBtn.textContent = '✓ Owned'; djBtn.disabled = true; djBtn.classList.add('owned');
    } else if (totalCoins < 10) {
      djBtn.textContent = 'Need 10 🌕'; djBtn.disabled = true; djBtn.classList.remove('owned');
    } else {
      djBtn.textContent = 'Buy  10 🌕'; djBtn.disabled = false; djBtn.classList.remove('owned');
    }
    if (_purchased.vineSwing) {
      vsBtn.textContent = '✓ Owned'; vsBtn.disabled = true; vsBtn.classList.add('owned');
    } else if (totalCoins < 15) {
      vsBtn.textContent = 'Need 15 🌕'; vsBtn.disabled = true; vsBtn.classList.remove('owned');
    } else {
      vsBtn.textContent = 'Buy  15 🌕'; vsBtn.disabled = false; vsBtn.classList.remove('owned');
    }
  }

  function _buyAbility(type) {
    const costs = { doubleJump: 10, vineSwing: 15 };
    const cost = costs[type];
    if (!cost || totalCoins < cost || _purchased[type]) return;
    totalCoins -= cost;
    _purchased[type] = true;
    player.abilities[type] = true;
    AudioManager.playSFX('collect');
    _flash('#a0ff60', 0.28);
    _updateShopButtons();
    _updateHUD();
  }

  // ── Underground functions ─────────────────────────────────────
  function _enterUnderground(pipe) {
    const zone = (levelData.underground||[])[pipe.zoneId||0];
    if (!zone) return;
    underground.active       = true;
    underground.room         = zone;
    underground.entryPipeX   = pipe.x;
    underground.surfaceCamX  = camX;
    underground.surfacePlayerX = player.x;
    underground.surfacePlayerY = player.y;
    camX = 0;
    const spawnX = zone.spawnX || 60;
    const spawnGY = getGroundY(spawnX);
    player.x = spawnX; player.y = spawnGY - 30;
    player.vx = 0; player.vy = 0;
    underCoins    = (zone.coins||[]).map(c => new Coin(c.x, c.y));
    const exitX   = zone.exitX || 720;
    underExitPipe = new Pipe(exitX, getGroundY(exitX), zone.type||'pipe', 0);
    underExitPipe.isExit = true;
    _flash('#002808', 0.65);
  }

  function _exitUnderground() {
    underground.active = false;
    camX     = underground.surfaceCamX;
    player.x = underground.surfacePlayerX;
    player.y = underground.surfacePlayerY;
    player.vx = 0; player.vy = -140;
    underCoins = []; underExitPipe = null;
    underground.room = null;
    _flash('#60ff40', 0.32);
  }

  // ── Vine dash ─────────────────────────────────────────────────
  function _vineDash(vine) {
    const dx = vine.x - player.getCenterX(), dy = vine.y - player.getCenterY();
    const dist = Math.sqrt(dx*dx+dy*dy) || 1;
    player.vx = (dx/dist)*300 + player.facing*100;
    player.vy = Math.min((dy/dist)*300 - 90, -110);
    player.floating = false; player.onGround = false;
    AudioManager.playSFX('collect'); _flash('#60ff30', 0.18);
    for (let i=0; i<12; i++) {
      const ang=Math.random()*Math.PI*2;
      particles.push(new Particle(vine.x,vine.y,Math.cos(ang)*55,Math.sin(ang)*55-25,'#80ff40',1.5,0.7));
    }
  }

  // ── Drawing: sky, stars, trees, terrain, details ──────────────
  function _drawSky() {
    const ld=levelData,t=cycleTime, shift=_getCycleShift(t);
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,    _blendHex(ld.skyTop,    shift.top,    shift.w));
    grad.addColorStop(0.65, _blendHex(ld.skyBottom, shift.bottom, shift.w));
    grad.addColorStop(1,    ld.groundFill||'#1a2a10');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  }

  function _drawStars() {
    const ld=levelData,t=cycleTime;
    const show=ld.theme==='cave'||ld.theme==='night'||t>0.65||t<0.1;
    if (!show) return;
    const sa=ld.theme==='cave'?0.8:ld.theme==='night'?0.9:t>0.65?Math.min(1,(t-0.65)/0.1):Math.min(1,(0.1-t)/0.1)*0.8;
    ctx.save();
    stars.forEach(s => {
      const sx=s.x-camX*0.08;
      if (sx<-4||sx>W+4) return;
      ctx.globalAlpha=(0.4+Math.sin(s.blink)*0.35)*sa;
      ctx.fillStyle=ld.theme==='cave'?'#a0c8ff':'#e8f0ff';
      ctx.beginPath(); ctx.arc(sx,s.y,s.r,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  function _drawTreeLayer(trees, scrollX, ld, alpha) {
    if (!trees||!trees.length) return;
    trees.forEach(t => {
      const sx=t.x-scrollX;
      if (sx<-250||sx>W+250) return;
      _drawLayerTree(ctx, sx, getGroundY(t.x), t.type, t.scale||1, ld.theme, alpha);
    });
  }

  function _drawLayerTree(c, sx, groundY, type, scale, theme, alpha) {
    c.save(); c.globalAlpha=alpha;
    const h=120*scale;
    if (type==='stala') {
      const w=18*scale; c.fillStyle='#101830';
      c.beginPath(); c.moveTo(sx-w,0); c.lineTo(sx+w,0); c.lineTo(sx,h*0.9); c.closePath(); c.fill();
      c.globalAlpha=alpha*0.4; c.fillStyle='#4080ff';
      c.beginPath(); c.arc(sx,h*0.88,3*scale,0,Math.PI*2); c.fill();
    } else if (type==='crystal') {
      const w=10*scale; c.fillStyle='#0d1828';
      c.beginPath(); c.moveTo(sx,groundY-h); c.lineTo(sx+w,groundY-h*0.3); c.lineTo(sx+w*0.5,groundY);
      c.lineTo(sx-w*0.5,groundY); c.lineTo(sx-w,groundY-h*0.3); c.closePath(); c.fill();
      c.globalAlpha=alpha*0.35; c.fillStyle='#60a0ff';
      c.beginPath(); c.moveTo(sx-2*scale,groundY-h); c.lineTo(sx+3*scale,groundY-h*0.4); c.lineTo(sx,groundY); c.closePath(); c.fill();
    } else if (type==='pine') {
      const trunkH=h*0.28;
      c.fillStyle=theme==='night'?'#080c18':theme==='cave'?'#0c1428':'#152010';
      c.fillRect(sx-5*scale,groundY-trunkH,10*scale,trunkH);
      const fh=h-trunkH;
      c.fillStyle=theme==='night'?'#070b16':theme==='cave'?'#0a1226':'#102008';
      for (let tier=0;tier<3;tier++) {
        const ty=groundY-trunkH-fh*(0.35+tier*0.22), tw=(fh*0.5-tier*fh*0.1)*scale;
        c.beginPath(); c.moveTo(sx,groundY-trunkH-fh*(0.35+tier*0.22)-fh*0.3);
        c.lineTo(sx+tw,ty); c.lineTo(sx-tw,ty); c.closePath(); c.fill();
      }
    } else if (type==='oak') {
      const trunkH=h*0.32;
      c.fillStyle=theme==='night'?'#090d1a':theme==='cave'?'#0d1530':'#162412';
      c.fillRect(sx-6*scale,groundY-trunkH,12*scale,trunkH);
      const fh=(h-trunkH)*scale, fBase=groundY-trunkH;
      c.fillStyle=theme==='night'?'#06091a':theme==='cave'?'#0a1225':'#0e2008';
      [[-0.15,0],[0.15,0.12],[0,-0.18]].forEach(([dx,dy]) => {
        c.beginPath(); c.arc(sx+dx*fh,fBase-fh*(0.45+dy),fh*0.42,0,Math.PI*2); c.fill();
      });
    } else {
      const trunkH=h*0.3;
      c.fillStyle=theme==='night'?'#090d1a':theme==='cave'?'#0c1228':'#152010';
      c.fillRect(sx-5*scale,groundY-trunkH,10*scale,trunkH);
      const fh=(h-trunkH)*scale;
      c.fillStyle=theme==='night'?'#07091a':theme==='cave'?'#0a1226':'#101e08';
      c.beginPath(); c.arc(sx,groundY-trunkH-fh*0.5,fh*0.52,0,Math.PI*2); c.fill();
    }
    c.restore();
  }

  function _drawFoliageLayer(foliage, scrollX, ld) {
    if (!foliage||!foliage.length) return;
    foliage.forEach(f => {
      const sx=f.x-scrollX;
      if (sx+f.w<-80||sx>W+80) return;
      ctx.save();
      const baseY=f.y!==undefined?f.y:55, w=f.w;
      const c1=ld.theme==='night'?'rgba(6,8,20,0.72)':ld.theme==='cave'?'rgba(8,12,28,0.68)':'rgba(10,20,8,0.70)';
      const c2=ld.theme==='night'?'rgba(8,10,28,0.55)':ld.theme==='cave'?'rgba(10,18,40,0.52)':'rgba(14,28,10,0.55)';
      const segs=Math.max(2,Math.ceil(w/90));
      for (let i=0;i<segs;i++) {
        const cx=sx+(i+0.5)*(w/segs), cy=baseY+(i%3)*8, rx=(w/segs)*0.65, ry=28+(i%2)*14;
        ctx.fillStyle=i%2===0?c1:c2;
        ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    });
  }

  function _drawMist() {
    const ld=levelData; ctx.save();
    ctx.fillStyle=ld.mistColor||'rgba(180,220,200,0.10)';
    [0.55,0.68,0.80].forEach((yFrac,i) => {
      ctx.globalAlpha=0.42+i*0.07;
      ctx.beginPath(); ctx.ellipse(((camX*0.28+i*290)%(W+400))-200, H*yFrac, 240+i*30, 20+i*4, 0, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  function _drawTerrainFill() {
    const pts = underground.active ? underground.room.terrain : levelData.terrain;
    const ld  = underground.active ? underground.room : levelData;
    if (!pts||pts.length<2) return;
    const activeCamX = underground.active ? 0 : camX;
    ctx.save();
    const x0=pts[0].x-activeCamX;
    ctx.beginPath(); ctx.moveTo(x0,H+10); ctx.lineTo(x0,pts[0].y);
    for (let i=0;i<pts.length-1;i++) {
      const ax=pts[i].x-activeCamX,ay=pts[i].y,bx=pts[i+1].x-activeCamX,by=pts[i+1].y,mx=(ax+bx)/2;
      ctx.bezierCurveTo(mx,ay,mx,by,bx,by);
    }
    const xN=pts[pts.length-1].x-activeCamX; ctx.lineTo(xN,H+10); ctx.closePath();
    const grad=ctx.createLinearGradient(0,280,0,H);
    grad.addColorStop(0,    ld.groundTop  ||'#2a4420');
    grad.addColorStop(0.12, ld.groundFill ||'#1a2a12');
    grad.addColorStop(1,    ld.groundFill ||'#141e0c');
    ctx.fillStyle=grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0,pts[0].y);
    for (let i=0;i<pts.length-1;i++) {
      const ax=pts[i].x-activeCamX,ay=pts[i].y,bx=pts[i+1].x-activeCamX,by=pts[i+1].y,mx=(ax+bx)/2;
      ctx.bezierCurveTo(mx,ay,mx,by,bx,by);
    }
    ctx.lineWidth=3.5; ctx.strokeStyle=ld.groundTop||'#4a7030';
    ctx.shadowBlur=7; ctx.shadowColor=ld.groundTop||'#4a7030'; ctx.stroke(); ctx.shadowBlur=0;
    ctx.restore();
  }

  function _drawDetails() {
    const ld=levelData; if (!ld.details) return;
    ld.details.forEach(d => {
      const sx=d.x-camX; if (sx<-100||sx>W+100) return;
      _drawDetail(d, sx, getGroundY(d.x));
    });
  }

  function _drawDetail(d, sx, gy) {
    ctx.save();
    switch(d.type) {
      case 'flowers': {
        const cols=d.color?[d.color]:['#ff9ad0','#ffcc60','#a0e8ff','#d0ff80'], n=d.count||5;
        for (let i=0;i<n;i++) {
          const fx=sx+(i-n/2)*14, fy=gy-4-(i%2)*5;
          ctx.strokeStyle='#60a040'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(fx,gy); ctx.lineTo(fx,fy); ctx.stroke();
          ctx.fillStyle=cols[i%cols.length]; ctx.shadowBlur=6; ctx.shadowColor=cols[i%cols.length];
          ctx.beginPath(); ctx.arc(fx,fy,3.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        break;
      }
      case 'mushroom': {
        const mw=d.w||14;
        ctx.fillStyle='#d0c8a0'; ctx.fillRect(sx-mw*0.2,gy-mw*0.9,mw*0.4,mw*0.9);
        const cc=d.color||'#cc4020'; ctx.fillStyle=cc; ctx.shadowBlur=8; ctx.shadowColor=cc;
        ctx.beginPath(); ctx.arc(sx,gy-mw*0.9,mw*0.6,Math.PI,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle='rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(sx-mw*0.2,gy-mw,1.8,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx+mw*0.18,gy-mw*1.1,1.5,0,Math.PI*2); ctx.fill();
        break;
      }
      case 'stream': {
        const sw=d.w||60; ctx.globalAlpha=0.55;
        const sg=ctx.createLinearGradient(sx-sw/2,0,sx+sw/2,0);
        sg.addColorStop(0,'transparent'); sg.addColorStop(0.3,'#80c8ff'); sg.addColorStop(0.7,'#60b0e8'); sg.addColorStop(1,'transparent');
        ctx.fillStyle=sg; ctx.beginPath(); ctx.ellipse(sx,gy+2,sw/2,5,0,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=0.3; ctx.strokeStyle='#a0e0ff'; ctx.lineWidth=1;
        for (let r=0;r<3;r++) { ctx.beginPath(); ctx.ellipse(sx,gy+2,sw*0.15+r*8,2.5+r,0,0,Math.PI*2); ctx.stroke(); }
        break;
      }
      case 'moss': {
        const mw=d.w||40; ctx.globalAlpha=0.65; ctx.fillStyle=d.color||'#2a5820';
        ctx.beginPath(); ctx.ellipse(sx,gy,mw/2,6,0,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=0.4; ctx.fillStyle='#3a7028';
        for (let b=-mw/2+6;b<mw/2;b+=9) { ctx.beginPath(); ctx.arc(sx+b,gy-3,4,Math.PI,Math.PI*2); ctx.fill(); }
        break;
      }
      case 'pool': {
        const pw=d.w||50; ctx.globalAlpha=0.50;
        const pg=ctx.createRadialGradient(sx,gy+2,0,sx,gy+2,pw/2);
        pg.addColorStop(0,'#90d8ff'); pg.addColorStop(0.6,'#4090c0'); pg.addColorStop(1,'transparent');
        ctx.fillStyle=pg; ctx.beginPath(); ctx.ellipse(sx,gy+2,pw/2,pw*0.18,0,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=0.25; ctx.strokeStyle='#c0eeff'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.ellipse(sx,gy+2,pw*0.3,pw*0.1,0,0,Math.PI*2); ctx.stroke();
        break;
      }
      case 'cavecrystal': {
        const ch=d.w||22, cc=d.color||'#40a0ff';
        ctx.fillStyle=cc; ctx.shadowBlur=14; ctx.shadowColor=cc; ctx.globalAlpha=0.85;
        [[0,1],[-8,0.7],[9,0.8]].forEach(([ox,sc]) => {
          const cw=5*sc,cH=ch*sc;
          ctx.beginPath(); ctx.moveTo(sx+ox,gy-cH); ctx.lineTo(sx+ox+cw,gy-cH*0.4); ctx.lineTo(sx+ox+cw*0.4,gy);
          ctx.lineTo(sx+ox-cw*0.4,gy); ctx.lineTo(sx+ox-cw,gy-cH*0.4); ctx.closePath(); ctx.fill();
        });
        ctx.shadowBlur=0; break;
      }
    }
    ctx.restore();
  }

  function _drawUndergroundBg() {
    const room=underground.room;
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,room.skyTop||'#050a08'); grad.addColorStop(0.5,room.skyBottom||'#08100a');
    grad.addColorStop(1,room.groundFill||'#1a2a10');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    // Decorative stalactites from ceiling
    ctx.fillStyle=room.groundTop||'#1a2810';
    const sc=8;
    for (let i=0;i<sc;i++) {
      const sx=(i+0.5)*(W/sc)+Math.sin(i*2.3+1)*28;
      const sh=22+Math.abs(Math.sin(i*1.7+2))*36;
      const sw=7+Math.abs(Math.sin(i*3.1))*4;
      ctx.shadowBlur=8; ctx.shadowColor=room.groundTop||'#1a2810';
      ctx.beginPath(); ctx.moveTo(sx-sw,0); ctx.lineTo(sx+sw,0); ctx.lineTo(sx,sh); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur=0;
    // Room name label
    ctx.save(); ctx.fillStyle='rgba(0,0,0,0.55)';
    _roundRect(ctx,W/2-90,7,180,21,8); ctx.fill();
    ctx.fillStyle='rgba(160,255,110,0.75)';
    ctx.shadowBlur=6; ctx.shadowColor='#70ff30';
    ctx.font='bold 10px Quicksand, sans-serif'; ctx.textAlign='center';
    ctx.fillText('◆  '+room.name+'  ◆', W/2, 22); ctx.shadowBlur=0; ctx.restore();
  }

  function _drawInteractHint() {
    if (!interactHint || state!==STATE.PLAYING) return;
    ctx.save();
    ctx.font='bold 11px Quicksand, sans-serif'; ctx.textAlign='center';
    const tw=ctx.measureText(interactHint).width+26;
    ctx.fillStyle='rgba(0,0,0,0.62)';
    _roundRect(ctx, W/2-tw/2, H-50, tw, 23, 10); ctx.fill();
    ctx.fillStyle='rgba(190,255,130,0.88)';
    ctx.shadowBlur=7; ctx.shadowColor='#70ff30';
    ctx.fillText(interactHint, W/2, H-34); ctx.shadowBlur=0; ctx.restore();
  }

  function _drawTitleBackground() {
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#04060e'); grad.addColorStop(1,'#0e1620');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    ctx.save();
    stars.forEach(s => {
      ctx.globalAlpha=0.4+Math.sin(s.blink)*0.35; ctx.fillStyle='#c8e0ff';
      ctx.beginPath(); ctx.arc(s.x%W,s.y,s.r,0,Math.PI*2); ctx.fill();
    });
    ctx.restore(); ctx.save(); ctx.globalAlpha=0.85;
    [{x:60,h:130,t:'pine'},{x:155,h:100,t:'round'},{x:240,h:155,t:'pine'},{x:360,h:90,t:'round'},
     {x:455,h:120,t:'pine'},{x:555,h:140,t:'oak'},{x:660,h:100,t:'pine'},{x:755,h:130,t:'round'}]
      .forEach(tr => _drawLayerTree(ctx, tr.x, H, tr.t, tr.h/120, 'night', 1.0));
    ctx.restore();
  }

  function _drawVignette() {
    const grad=ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.75);
    grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(1,'rgba(0,0,0,0.48)');
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  }

  function _drawFlash() {
    if (flashAlpha<=0) return;
    ctx.save(); ctx.globalAlpha=flashAlpha; ctx.fillStyle=flashColor; ctx.fillRect(0,0,W,H); ctx.restore();
  }

  // ── Colour helpers ────────────────────────────────────────────
  function _getCycleShift(t) {
    if (t<0.1||t>0.9) return {top:'#ff8040',bottom:'#ffc060',w:0.18};
    if (t<0.35)        return {top:'#204060',bottom:'#406080',w:0.10};
    if (t<0.6)         return {top:'#102030',bottom:'#204050',w:0.05};
    if (t<0.75)        return {top:'#600020',bottom:'#a04020',w:0.20};
    return                    {top:'#060010',bottom:'#0a0820',w:0.15};
  }

  function _blendHex(base, shift, weight) {
    const br=parseInt(base.slice(1,3),16),bg=parseInt(base.slice(3,5),16),bb=parseInt(base.slice(5,7),16);
    const sr=parseInt(shift.slice(1,3),16),sg=parseInt(shift.slice(3,5),16),sb=parseInt(shift.slice(5,7),16);
    return `rgb(${Math.round(br+(sr-br)*weight)},${Math.round(bg+(sg-bg)*weight)},${Math.round(bb+(sb-bb)*weight)})`;
  }

  return { init };

})();

window.addEventListener('DOMContentLoaded', () => Game.init());
