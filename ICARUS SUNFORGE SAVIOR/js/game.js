// ============================================================
//  GAME  –  Wave survival, Smash Bros arena format
// ============================================================

const STATE = {
  LOADING:    'loading',
  MENU:       'menu',
  PLAYING:    'playing',
  WAVE_INTRO: 'wave_intro',
  PAUSED:     'paused',
  GAME_OVER:  'game_over',
  WIN:        'win',
  SETTINGS:   'settings',
  CONTROLS:   'controls',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.state     = STATE.LOADING;
    this.prevState = STATE.MENU;

    this.lastTime = 0;
    this.score    = 0;

    // Arena objects
    this.platforms   = [];
    this.enemies     = [];
    this.projectiles = [];
    this.laserBeams  = [];
    this.particles   = new ParticleSystem();

    this.bgTheme = 0;
    this.mapName = '';

    // Wave state
    this.currentWave    = 0;
    this.waveIntroTimer = 0;
    this.WAVE_INTRO_DUR = 2800;

    // Player
    this.player = null;

    // Damage flash overlay
    this.damageFlash = 0;

    // Death / respawn
    this.respawnTimer  = 0;
    this.RESPAWN_DELAY = 2000;

    // Menu memory
    this._previousMenu = STATE.MENU;

    this._init();
  }

  _init() {
    this._simulateLoad();
  }

  // ── Loading screen ──────────────────────────────────────
  _simulateLoad() {
    const bar = document.getElementById('loading-bar');
    let progress = 0;
    const iv = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (bar) bar.style.width = Math.min(100, progress) + '%';
      if (progress >= 100) {
        clearInterval(iv);
        setTimeout(() => {
          const ls = document.getElementById('loading-screen');
          if (ls) {
            ls.classList.add('hidden');
            setTimeout(() => { ls.style.display = 'none'; }, 700);
          }
          Audio.init();
          this.state = STATE.MENU;
          Audio.playMusic('menu');
          this._startLoop();
        }, 400);
      }
    }, 80);
  }

  // ── Arena builder ────────────────────────────────────────
  _buildArena() {
    const mapIdx = Math.floor(Math.random() * ARENA_MAPS.length);
    const result = buildArena(mapIdx);
    this.platforms = result.platforms;
    this.bgTheme   = result.bgTheme;
    this.mapName   = result.mapName;
  }

  // ── Enemy factory ────────────────────────────────────────
  _makeEnemy(type, hpMult, x, y) {
    let e = null;
    switch (type) {
      case 'Drone':         e = new Drone(x, y);         break;
      case 'BladeWalker':   e = new BladeWalker(x, y);   break;
      case 'TurretNode':    e = new TurretNode(x, y);    break;
      case 'SolarEnforcer': e = new SolarEnforcer(x, y); break;
      case 'HelionPrime':   e = new HelionPrime(x, y);   break;
    }
    if (e && hpMult !== 1.0) {
      e.hp    = Math.round(e.hp    * hpMult);
      e.maxHp = Math.round(e.maxHp * hpMult);
    }
    return e;
  }

  // ── Spawn enemies for a wave ─────────────────────────────
  _spawnWave(waveIndex) {
    this.enemies     = [];
    this.projectiles = [];
    this.laserBeams  = [];

    const waveDefs = WAVES[waveIndex - 1] || [];
    const spawnXs  = [160, 300, 500, 640];

    waveDefs.forEach((def, i) => {
      const enemy = this._makeEnemy(def.type, def.hpMult,
        spawnXs[i % spawnXs.length], 80);
      if (!enemy) return;
      enemy.particles   = this.particles;
      enemy.projectiles = this.projectiles;
      if (enemy instanceof HelionPrime) enemy.laserBeams = this.laserBeams;
      this.enemies.push(enemy);
    });
  }

  // ── Start / Restart ──────────────────────────────────────
  startGame() {
    Input.reset();
    this.score        = 0;
    this.currentWave  = 0;
    this.damageFlash  = 0;
    this.respawnTimer = 0;
    this.particles.clear();

    this._buildArena();

    this.player = new Player(390, 150);
    this.player.particles   = this.particles;
    this.player.projectiles = this.projectiles;

    this._startNextWave();
  }

  // ── Advance to next wave ─────────────────────────────────
  _startNextWave() {
    this.currentWave++;

    if (this.currentWave > TOTAL_WAVES) {
      this._triggerVictory();
      return;
    }

    // Fully restore player
    if (this.player) {
      this.player.percent    = 0;
      this.player.energy     = this.player.maxEnergy;
      this.player.alive      = true;
      this.player.deathTimer = 0;
      this.player.invincible = false;
      this.player.invTimer   = 0;
      this.player.hurtTimer  = 0;
      this.player.stunTimer  = 0;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.x  = 390;
      this.player.y  = 150;
      this.player.onGround = false;
    }

    // New random arena each wave
    this._buildArena();

    // Re-link player projectile list after rebuild
    if (this.player) this.player.projectiles = this.projectiles;

    this._spawnWave(this.currentWave);

    // Show wave banner
    this.waveIntroTimer = this.WAVE_INTRO_DUR;
    this.state = STATE.WAVE_INTRO;
  }

  // ── Main Loop ────────────────────────────────────────────
  _startLoop() {
    const loop = (ts) => {
      try {
        const dt = Math.min(ts - this.lastTime, 50);
        this.lastTime = ts;
        this._update(dt);
        this._draw();
      } catch (e) {
        console.error('Game loop error:', e);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(ts => {
      this.lastTime = ts;
      requestAnimationFrame(loop);
    });
  }

  // ── Update dispatcher ────────────────────────────────────
  _update(dt) {
    switch (this.state) {
      case STATE.MENU:       this._updateMenu(dt);      break;
      case STATE.WAVE_INTRO: this._updateWaveIntro(dt); break;
      case STATE.PLAYING:    this._updatePlaying(dt);   break;
      case STATE.PAUSED:     this._updatePaused(dt);    break;
      case STATE.GAME_OVER:  this._updateGameOver(dt);  break;
      case STATE.WIN:        this._updateWin(dt);       break;
      case STATE.SETTINGS:   this._updateSettings(dt);  break;
      case STATE.CONTROLS:   this._updateControls(dt);  break;
    }
    Input.flush();
  }

  // ── Menu states ──────────────────────────────────────────
  _updateMenu(dt) {
    const items = UI.MAIN_ITEMS;
    if (Input.pressed('ArrowUp')   || Input.pressed('KeyW')) UI.navigateMenu(-1, items);
    if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) UI.navigateMenu( 1, items);
    if (Input.enter()) {
      Audio.sfx.menuSelect();
      const idx = UI.getMenuIndex();
      if (idx === 0) { UI.resetMenuIndex(); this.startGame(); }
      if (idx === 1) { this._previousMenu = STATE.MENU; this.state = STATE.SETTINGS; }
      if (idx === 2) { this._previousMenu = STATE.MENU; this.state = STATE.CONTROLS; }
      if (idx === 3) { window.location.href = '../index.html'; }
    }
  }

  _updatePaused(dt) {
    const items = UI.PAUSE_ITEMS;
    if (Input.pause()) { this.state = STATE.PLAYING; Audio.sfx.menuBeep(); return; }
    if (Input.pressed('ArrowUp')   || Input.pressed('KeyW')) UI.navigateMenu(-1, items);
    if (Input.pressed('ArrowDown') || Input.pressed('KeyS')) UI.navigateMenu( 1, items);
    if (Input.enter()) {
      Audio.sfx.menuSelect();
      const idx = UI.getMenuIndex();
      if (idx === 0) { this.state = STATE.PLAYING; }
      if (idx === 1) { this._previousMenu = STATE.PAUSED; this.state = STATE.SETTINGS; }
      if (idx === 2) { this._previousMenu = STATE.PAUSED; this.state = STATE.CONTROLS; }
      if (idx === 3) { UI.resetMenuIndex(); this.startGame(); }
      if (idx === 4) { UI.resetMenuIndex(); this.state = STATE.MENU; Audio.playMusic('menu'); }
      if (idx === 5) { window.location.href = '../index.html'; }
    }
  }

  _updateSettings(dt) {
    if (Input.pause() || Input.pressed('Escape')) {
      this.state = this._previousMenu;
      Audio.sfx.menuBeep();
      return;
    }
    if (Input.pressed('ArrowUp')    || Input.pressed('KeyW')) UI.navigateSettings(-1);
    if (Input.pressed('ArrowDown')  || Input.pressed('KeyS')) UI.navigateSettings( 1);
    if (Input.pressed('ArrowLeft')  || Input.pressed('KeyA')) UI.adjustSetting(-1);
    if (Input.pressed('ArrowRight') || Input.pressed('KeyD')) UI.adjustSetting( 1);
    if (Input.enter() && UI.getSettingsIndex() === 3) {
      this.state = this._previousMenu;
      Audio.sfx.menuSelect();
    }
  }

  _updateControls(dt) {
    if (Input.pause() || Input.enter() || Input.pressed('Escape')) {
      this.state = this._previousMenu;
      Audio.sfx.menuBeep();
    }
  }

  _updateGameOver(dt) {
    if (Input.enter()) { UI.resetMenuIndex(); this.startGame(); }
    if (Input.pause())  { UI.resetMenuIndex(); this.state = STATE.MENU; Audio.playMusic('menu'); }
  }

  _updateWin(dt) {
    if (Input.enter() || Input.pause()) {
      UI.resetMenuIndex();
      this.state = STATE.MENU;
      Audio.playMusic('menu');
    }
  }

  // ── Wave intro countdown ─────────────────────────────────
  _updateWaveIntro(dt) {
    for (const p of this.platforms) p.update(dt);
    this.particles.update(dt);

    this.waveIntroTimer -= dt;
    if (this.waveIntroTimer <= 0) {
      this.state = STATE.PLAYING;
      Audio.playMusic(this.currentWave === TOTAL_WAVES ? 'boss' : 'combat');
    }
  }

  // ── Main gameplay update ─────────────────────────────────
  _updatePlaying(dt) {
    if (Input.pause()) {
      this.state = STATE.PAUSED;
      UI.resetMenuIndex();
      Audio.sfx.menuBeep();
      return;
    }

    Audio.resume();

    if (this.damageFlash > 0) this.damageFlash -= dt * 0.006;

    // Update platforms
    for (const p of this.platforms) p.update(dt);

    // Update player
    if (this.player.alive) {
      this.player.update(dt, this.platforms);
    } else {
      this.player.deathTimer += dt;
    }

    // Particles
    this.particles.update(dt);

    // Projectiles
    this._updateProjectiles(dt);

    // Laser beams
    this._updateLaserBeams(dt);

    // Enemies
    this._updateEnemies(dt);

    // Collision
    this._checkProjectileHits();
    this._checkSwordHits();
    this._checkEnemyContact();

    // Blast zone KO
    this._checkBlastZone();

    // Respawn / death flow
    if (!this.player.alive) {
      this.respawnTimer += dt;
      if (this.respawnTimer >= this.RESPAWN_DELAY) {
        this.respawnTimer = 0;
        if (this.player.stocks > 0) {
          this.player.stocks--;
          this.player.respawn(390, 150);
        } else {
          this.state = STATE.GAME_OVER;
          Audio.stopMusic();
        }
      }
    }

    // All enemies defeated → next wave
    if (this.enemies.length === 0 && this.player.alive) {
      this._startNextWave();
    }
  }

  // ── Blast zone ───────────────────────────────────────────
  _checkBlastZone() {
    if (!this.player.alive) return;
    const p = this.player;
    if (p.x + p.w < BLAST_LEFT  ||
        p.x       > BLAST_RIGHT ||
        p.y       < BLAST_TOP   ||
        p.y       > BLAST_BOTTOM) {
      p.alive = false;
      p.deathTimer = 0;
      this.particles.explosion(p.cx, p.cy, 2);
      Audio.sfx.enemyDie();
      this.respawnTimer = 0;
    }
  }

  // ── Projectile update ────────────────────────────────────
  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (!p.alive) { this.projectiles.splice(i, 1); continue; }

      // Cull if too far off-screen
      if (p.x < BLAST_LEFT - 100 || p.x > BLAST_RIGHT + 100 ||
          p.y < BLAST_TOP  - 100 || p.y > BLAST_BOTTOM + 100) {
        p.alive = false; this.projectiles.splice(i, 1); continue;
      }

      // Solid platform collision
      for (const plat of this.platforms) {
        if (plat.type !== 'solid' || !plat.isSolid()) continue;
        if (rectsOverlap(
          p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size,
          plat.x, plat.y, plat.w, plat.h
        )) {
          this.particles.impact(p.x, p.y);
          p.hit();
          break;
        }
      }
    }
  }

  // ── Laser beam update ────────────────────────────────────
  _updateLaserBeams(dt) {
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i];
      beam.update(dt);
      if (!beam.alive) { this.laserBeams.splice(i, 1); continue; }

      if (beam.owner !== 'player' && this.player.alive && !this.player.invincible) {
        if (beam.hitsRect(this.player.x, this.player.y, this.player.w, this.player.h)) {
          this._playerHurt(beam.damage, 0);
          this.damageFlash = 1;
        }
      }
      this.particles.bossLaser(beam.endX, beam.endY);
    }
  }

  // ── Enemy update ─────────────────────────────────────────
  _updateEnemies(dt) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy instanceof HelionPrime && !enemy.laserBeams) {
        enemy.laserBeams = this.laserBeams;
      }
      enemy.update(dt, this.platforms, this.player);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.score += this.enemies[i].score || 100;
        this.enemies.splice(i, 1);
      }
    }
  }

  // ── Projectile hits ──────────────────────────────────────
  _checkProjectileHits() {
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const proj = this.projectiles[pi];
      if (!proj.alive) continue;

      if (proj.owner === 'player') {
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (rectsOverlap(
            proj.x - proj.size * 0.5, proj.y - proj.size * 0.5, proj.size, proj.size,
            enemy.x, enemy.y, enemy.w, enemy.h
          )) {
            const kbDir = proj.vx > 0 ? 1 : -1;
            enemy.takeDamage(proj.damage, kbDir);
            this.score += 10;
            proj.hit();
            break;
          }
        }
      } else {
        if (this.player.alive && !this.player.invincible) {
          if (rectsOverlap(
            proj.x - proj.size * 0.5, proj.y - proj.size * 0.5, proj.size, proj.size,
            this.player.x + 2, this.player.y + 2, this.player.w - 4, this.player.h - 4
          )) {
            const kbDir = proj.vx > 0 ? 1 : -1;
            const res   = this._playerHurt(proj.damage, kbDir);
            if (res !== 'dodge') proj.hit();
          }
        }
      }
    }
  }

  // ── Sword hits ───────────────────────────────────────────
  _checkSwordHits() {
    const sw = this.player.getSwordHitbox();
    if (!sw) return;
    const swingId = this.player.swingId;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (rectsOverlap(sw.x, sw.y, sw.w, sw.h, enemy.x, enemy.y, enemy.w, enemy.h)) {
        if (enemy._lastSwingId !== swingId) {
          const kbDir = this.player.swingFacingRight ? 1 : -1;
          enemy.takeDamage(sw.damage, kbDir);
          enemy._lastSwingId = swingId;
          this.score += 20;
        }
      }
    }
  }

  // ── Enemy contact damage ─────────────────────────────────
  _checkEnemyContact() {
    if (!this.player.alive || this.player.invincible) return;
    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.contactDmg) continue;
      if (rectsOverlap(
        this.player.x + 2, this.player.y + 2, this.player.w - 4, this.player.h - 4,
        enemy.x, enemy.y, enemy.w, enemy.h
      )) {
        const kbDir = this.player.cx < enemy.cx ? -1 : 1;
        this._playerHurt(enemy.contactDmg, kbDir);
      }
    }
  }

  // ── Player hurt helper ───────────────────────────────────
  _playerHurt(amount, kbDir = 0) {
    const res = this.player.takeDamage(amount, kbDir);
    if (res === 'parry') {
      this.particles.explosion(this.player.cx, this.player.cy, 1.4);
      Audio.sfx.victory();
      for (const e of this.enemies) {
        const dx = e.cx - this.player.cx;
        const dy = e.cy - this.player.cy;
        if (dx * dx + dy * dy < 380 * 380) {
          e.stunTimer = 650;
          this.particles.spark(e.cx, e.cy);
        }
      }
    } else if (res === 'hit') {
      this.damageFlash = 1;
    }
    return res;
  }

  // ── Victory ──────────────────────────────────────────────
  _triggerVictory() {
    this.state = STATE.WIN;
    Audio.stopMusic();
    Audio.sfx.victory();
    Audio.playMusic('win');
  }

  // ── DRAW ─────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 800, 600);

    switch (this.state) {
      case STATE.LOADING:
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 600);
        break;
      case STATE.MENU:
        this._drawMenu(ctx);
        break;
      case STATE.WAVE_INTRO:
        this._drawGameScene(ctx);
        this._drawWaveIntro(ctx);
        break;
      case STATE.PLAYING:
      case STATE.PAUSED:
        this._drawGameScene(ctx);
        break;
      case STATE.GAME_OVER:
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 600);
        UI.drawGameOver(ctx, this.score, this.currentWave, 16);
        break;
      case STATE.WIN:
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 600);
        UI.drawWin(ctx, this.score, 16);
        break;
      case STATE.SETTINGS:
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 600);
        UI.drawSettings(ctx, 16);
        break;
      case STATE.CONTROLS:
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 600);
        UI.drawControls(ctx);
        break;
    }
  }

  _drawMenu(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 600);
    const t  = Date.now() * 0.001;
    ctx.save();
    ctx.globalAlpha = Math.sin(t) * 0.06 + 0.07;
    const grad = ctx.createRadialGradient(400, 300, 20, 400, 300, 400);
    grad.addColorStop(0, '#ff8c00');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();
    UI.drawMenu(ctx, 16, false);
  }

  _drawGameScene(ctx) {
    // Background
    drawBackground(ctx, this.bgTheme);

    // Platforms
    for (const p of this.platforms) p.draw(ctx);

    // Particles behind entities
    this.particles.draw(ctx);

    // Projectiles
    for (const p of this.projectiles) { if (p.alive) p.draw(ctx); }

    // Laser beams
    for (const b of this.laserBeams) b.draw(ctx);

    // Enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.draw(ctx);
      if (e._drawStun) e._drawStun(ctx);
      if (!e.isBoss)   UI.drawEnemyBar(ctx, e);
    }

    // Player
    if (this.player && (this.player.alive || this.player.deathTimer < 1400)) {
      this.player.draw(ctx);
    }

    // Vignette overlay
    drawForeground(ctx);

    // Boss bar (full-width)
    const boss = this.enemies.find(e => e.isBoss && e.alive);
    if (boss) UI.drawBossBar(ctx, boss);

    // Damage flash
    if (this.damageFlash > 0) UI.drawDamageFlash(ctx, this.damageFlash);

    // HUD
    if (this.player) {
      UI.drawHUD(ctx, this.player, this.currentWave, TOTAL_WAVES, this.score, 0);
    }

    // Map label
    if (this.mapName) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.font = "bold 11px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#88aacc';
      ctx.fillText(this.mapName, 400, 542);
      ctx.restore();
    }

    // KO / respawn overlay
    if (this.player && !this.player.alive) {
      const a = Math.min(1, this.respawnTimer / 1200) * 0.65;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 600);
      ctx.restore();
      if (this.respawnTimer > 300) {
        const ta = Math.min(1, (this.respawnTimer - 300) / 600) * 0.95;
        ctx.save(); ctx.globalAlpha = ta;
        ctx.font = "bold 26px 'Courier New'";
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff2200';
        ctx.shadowBlur = 12; ctx.shadowColor = '#ff0000';
        ctx.fillText('KO!', 400, 290);
        if (this.player.stocks > 0) {
          ctx.font = "bold 14px 'Courier New'";
          ctx.fillStyle = '#ff8c00';
          ctx.shadowBlur = 0;
          ctx.fillText(
            `${this.player.stocks} STOCK${this.player.stocks !== 1 ? 'S' : ''} REMAINING`,
            400, 322
          );
        }
        ctx.restore();
      }
    }

    // Pause menu overlay
    if (this.state === STATE.PAUSED) {
      UI.drawMenu(ctx, 16, true);
    }
  }

  _drawWaveIntro(ctx) {
    const elapsed = this.WAVE_INTRO_DUR - this.waveIntroTimer;
    let alpha;
    const FADE_IN  = 400;
    const FADE_OUT = 400;
    if (elapsed < FADE_IN) {
      alpha = elapsed / FADE_IN;
    } else if (this.waveIntroTimer < FADE_OUT) {
      alpha = this.waveIntroTimer / FADE_OUT;
    } else {
      alpha = 1;
    }
    UI.drawWaveBanner(ctx, this.currentWave, TOTAL_WAVES, alpha);
  }
}

// ── Boot ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  window._game = new Game();
});

// ── Canvas scaling (4:3, fills window) ───────────────────────
(function scaleCanvas() {
  function resize() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const scale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
    canvas.style.width  = Math.round(800 * scale) + 'px';
    canvas.style.height = Math.round(600 * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('load',   resize);
  resize();
})();
