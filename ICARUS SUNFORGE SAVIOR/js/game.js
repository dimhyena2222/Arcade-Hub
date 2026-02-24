// ============================================================
//  GAME  –  Main loop, state machine, collision, scoring
// ============================================================

// ── Game States ───────────────────────────────────────────
const STATE = {
  LOADING:    'loading',
  MENU:       'menu',
  PLAYING:    'playing',
  PAUSED:     'paused',
  GAME_OVER:  'game_over',
  WIN:        'win',
  SETTINGS:   'settings',
  CONTROLS:   'controls',
};

// ── Section names ─────────────────────────────────────────
const SECTION_NAMES = [
  'OUTER SOLAR RAMPARTS',
  'ENERGY PROCESSING LAYER',
  'CORE DESCENT SHAFT',
  'SUNFORGE CORE',
];

class Game {
  constructor() {
    this.canvas  = document.getElementById('gameCanvas');
    this.ctx     = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.state   = STATE.LOADING;
    this.prevState = STATE.MENU;

    // Timing
    this.lastTime    = 0;
    this.timer       = 0;   // play time ms
    this.score       = 0;
    this.scoreAnim   = 0;

    // Level data
    this.platforms   = [];
    this.enemies     = [];
    this.projectiles = [];
    this.laserBeams  = [];
    this.pickups     = [];
    this.particles   = new ParticleSystem();

    // Player
    this.player = null;

    // Camera
    this.camera = new Camera(800, 600, WORLD_W, WORLD_H);

    // Boss reference
    this.activeBoss = null;

    // Section
    this.currentSection = 0;

    // Transition
    this.transitionAlpha = 0;
    this.transitionDir   = 0;  // 1 = fade in, -1 = fade out
    this.transitionName  = '';
    this.transitionTimer = 0;

    // Damage flash
    this.damageFlash = 0;

    // Plasma hazard (final boss phase 3+)
    this.plasmaY     = WORLD_H + 200;
    this.plasmaRising = false;

    // Death/respawn
    this.respawnTimer = 0;

    // Controls screen state remember
    this._previousMenu = STATE.MENU;

    this._init();
  }

  _init() {
    this._simulateLoad();
  }

  _simulateLoad() {
    const bar = document.getElementById('loading-bar');
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      bar.style.width = Math.min(100, progress) + '%';
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const loading = document.getElementById('loading-screen');
          loading.classList.add('hidden');
          setTimeout(() => { loading.style.display = 'none'; }, 700);
          Audio.init();
          this.state = STATE.MENU;
          Audio.playMusic('menu');
          this._startLoop();
        }, 400);
      }
    }, 80);
  }

  // ── Level Setup ───────────────────────────────────────────
  _buildWorld() {
    const { platforms, enemyDefs, pickupDefs } = buildLevel();
    this.platforms = platforms;

    this.enemies = [];
    for (const def of enemyDefs) {
      const enemy = this._spawnEnemy(def.type, def.x, def.y);
      if (enemy) {
        enemy.particles  = this.particles;
        enemy.projectiles = this.projectiles;
        this.enemies.push(enemy);
      }
    }

    this.pickups = [];
    for (const def of pickupDefs) {
      if (def.type === 'health') this.pickups.push(new HealthPickup(def.x, def.y, def.amount));
      if (def.type === 'energy') this.pickups.push(new EnergyPickup(def.x, def.y, def.amount));
      if (def.type === 'ability') this.pickups.push(new AbilityPickup(def.x, def.y, def.subtype));
    }

    // Find boss reference
    this.activeBoss = this.enemies.find(e => e.isBoss && e instanceof HelionPrime) || null;
  }

  _spawnEnemy(type, x, y) {
    switch (type) {
      case 'Drone':         return new Drone(x, y);
      case 'BladeWalker':   return new BladeWalker(x, y);
      case 'TurretNode':    return new TurretNode(x, y);
      case 'SolarEnforcer': return new SolarEnforcer(x, y);
      case 'HelionPrime':   return new HelionPrime(x, y);
      default: return null;
    }
  }

  // ── Game Start / Restart ──────────────────────────────────
  startGame() {
    this.timer    = 0;
    this.score    = 0;
    this.projectiles = [];
    this.laserBeams  = [];
    this.particles.clear();
    this.plasmaY     = WORLD_H + 200;
    this.plasmaRising = false;
    this.currentSection = 0;
    this.activeBoss     = null;
    this.damageFlash    = 0;

    this.message      = null;
    this.messageSub   = null;
    this.messageTimer = 0;

    this._buildWorld();

    // Spawn player on ground (Section 0)
    this.player = new Player(150, 468);
    this.player.particles   = this.particles;
    this.player.projectiles = this.projectiles;

    this.camera.snapTo(this.player.x, this.player.y);

    this.state = STATE.PLAYING;
    Audio.playMusic('combat');

    // Fade in
    this.transitionAlpha = 1;
    this.transitionDir   = -1;
    this.transitionName  = SECTION_NAMES[0];
    this.transitionTimer = 2500;
  }

  // ── Main Loop ────────────────────────────────────────────
  _startLoop() {
    const loop = (timestamp) => {
      const dt = Math.min(timestamp - this.lastTime, 50); // cap at 50ms (20fps min)
      this.lastTime = timestamp;
      this._update(dt);
      this._draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(ts => { this.lastTime = ts; requestAnimationFrame(loop); });
  }

  // ── Update ────────────────────────────────────────────────
  _update(dt) {
    switch (this.state) {
      case STATE.MENU:      this._updateMenu(dt);     break;
      case STATE.PLAYING:   this._updatePlaying(dt);  break;
      case STATE.PAUSED:    this._updatePaused(dt);   break;
      case STATE.GAME_OVER: this._updateGameOver(dt); break;
      case STATE.WIN:       this._updateWin(dt);      break;
      case STATE.SETTINGS:  this._updateSettings(dt); break;
      case STATE.CONTROLS:  this._updateControls(dt); break;
    }
    Input.flush();
  }

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
      if (idx === 3) { window.location.href = '../index.html'; } // ARCADE HUB
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
      if (idx === 0) { this.state = STATE.PLAYING; }   // Resume
      if (idx === 1) { this._previousMenu = STATE.PAUSED; this.state = STATE.SETTINGS; }
      if (idx === 2) { this._previousMenu = STATE.PAUSED; this.state = STATE.CONTROLS; }
      if (idx === 3) { UI.resetMenuIndex(); this.startGame(); }
      if (idx === 4) { UI.resetMenuIndex(); this.state = STATE.MENU; Audio.playMusic('menu'); }
      if (idx === 5) { window.location.href = '../index.html'; } // ARCADE HUB
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
    if (Input.enter()) {
      if (UI.getSettingsIndex() === 3) {
        this.state = this._previousMenu;
        Audio.sfx.menuSelect();
      }
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

  _updatePlaying(dt) {
    if (Input.pause()) {
      this.state = STATE.PAUSED;
      UI.resetMenuIndex();
      Audio.sfx.menuBeep();
      return;
    }

    // Resume audio context on first interaction
    Audio.resume();

    this.timer += dt;

    // Transition overlay
    if (this.transitionDir !== 0) {
      this.transitionAlpha += this.transitionDir * dt * 0.002;
      if (this.transitionAlpha >= 1) { this.transitionAlpha = 1; this.transitionDir = 0; }
      if (this.transitionAlpha <= 0) { this.transitionAlpha = 0; this.transitionDir = 0; }
    }
    this.transitionTimer -= dt;

    // Damage flash
    if (this.damageFlash > 0) this.damageFlash -= dt * 0.006;
    if (this.messageTimer > 0) this.messageTimer -= dt;

    // ── PLATFORMS ──────────────────────────────────────────
    for (const p of this.platforms) {
      p.update(dt);
      // Laser hazard check
      if (p.type === 'laser' && p.laserOn && this.player.alive) {
        if (rectsOverlap(
          this.player.x, this.player.y, this.player.w, this.player.h,
          p.x, p.y, p.w, p.h
        )) {
          this._playerHurt(20);
        }
      }
    }

    // ── PLAYER ─────────────────────────────────────────────
    this.player.update(dt, this.platforms);

    // Hazard platform contact
    for (const p of this.platforms) {
      if (p.type === 'hazard' && this.player.alive) {
        if (rectsOverlap(
          this.player.x, this.player.y + this.player.h - 4, this.player.w, 4,
          p.x, p.y, p.w, p.h
        )) {
          if (this._playerHurt(15) === 'hit') {
            this.player.vy = -200;
          }
        }
      }
    }

    // ── CAMERA ─────────────────────────────────────────────
    this.camera.follow(this.player, dt);

    // ── SECTION DETECTION ──────────────────────────────────
    const newSection = this._getSectionAt(this.player.x);
    if (newSection !== this.currentSection) {
      this.currentSection = newSection;
      this._onSectionEnter(newSection);
    }

    // ── PARTICLES ──────────────────────────────────────────
    this.particles.update(dt);

    // ── PROJECTILES ────────────────────────────────────────
    this._updateProjectiles(dt);

    // ── LASER BEAMS ────────────────────────────────────────
    this._updateLaserBeams(dt);

    // ── ENEMIES ────────────────────────────────────────────
    this._updateEnemies(dt);

    // ── PICKUPS ────────────────────────────────────────────
    this._updatePickups(dt);

    // ── PLAYER PROJECTILE HIT ──────────────────────────────
    this._checkProjectileHits();

    // ── SWORD HIT ──────────────────────────────────────────
    this._checkSwordHits();

    // ── ENEMY CONTACT ──────────────────────────────────────
    this._checkEnemyContact();

    // ── PLASMA RISING (boss phase 3+) ──────────────────────
    this._updatePlasma(dt);

    // ── FALL DEATH ──────────────────────────────────────────
    if (this.player.y > WORLD_H + 300) {
      this.player.hp = 0;
      this.player.alive = false;
    }

    // ── DEATH HANDLING ──────────────────────────────────────
    if (!this.player.alive) {
      this.respawnTimer += dt;
      if (this.respawnTimer >= 2200) {
        this.respawnTimer = 0;
        this.state = STATE.GAME_OVER;
        Audio.stopMusic();
      }
    }
  }

  // ── On section enter ─────────────────────────────────────
  _onSectionEnter(section) {
    this.transitionAlpha = 0.6;
    this.transitionDir   = -1;
    this.transitionName  = SECTION_NAMES[section] || '';
    this.transitionTimer = 4000; // Longer transition time

    if (section === 3) {
      Audio.playMusic('boss');
    } else if (section === 2) {
      Audio.playMusic('combat');
    }
    Audio.sfx.checkpoint();
    this.camera.addShake(3);
  }

  _getSectionAt(x) {
    if (x >= SECTION_X[3]) return 3;
    if (x >= SECTION_X[2]) return 2;
    if (x >= SECTION_X[1]) return 1;
    return 0;
  }

  // ── Projectile update ─────────────────────────────────────
  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);
      if (!p.alive) { this.projectiles.splice(i, 1); continue; }

      // Platform collision
      for (const plat of this.platforms) {
        if (!plat.isSolid() || plat.type === 'pass') continue;
        if (rectsOverlap(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2, plat.x, plat.y, plat.w, plat.h)) {
          this.particles.impact(p.x, p.y);
          p.hit();
          break;
        }
      }
    }
  }

  // ── Laser beam update ─────────────────────────────────────
  _updateLaserBeams(dt) {
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i];
      beam.update(dt);
      if (!beam.alive) { this.laserBeams.splice(i, 1); continue; }
      // Check player hit
      if (beam.owner !== 'player' && this.player.alive && !this.player.invincible) {
        if (beam.hitsRect(this.player.x, this.player.y, this.player.w, this.player.h)) {
          this.player.takeDamage(beam.damage);
          this.damageFlash = 1;
          this.camera.addShake(5);
        }
      }
      // Continuous particle effect
      this.particles.bossLaser(beam.endX, beam.endY);
    }
  }

  // ── Enemy update ──────────────────────────────────────────
  _updateEnemies(dt) {
    const visiblePlatforms = this.platforms.filter(p =>
      this.camera.isVisible(p.x, p.y, p.w, p.h, 200)
    );

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (!this.camera.isVisible(enemy.x, enemy.y, enemy.w, enemy.h, 400)) continue;

      // Assign laser beams to HelionPrime
      if (enemy instanceof HelionPrime && !enemy.laserBeams) {
        enemy.laserBeams = this.laserBeams;
      }

      enemy.update(dt, visiblePlatforms, this.player);

      // Enemy projectile – check vs player
    }

    // Prune dead
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.score += this.enemies[i].score || 100;
        if (this.enemies[i] instanceof HelionPrime) {
          this._triggerVictory();
        }
        if (this.enemies[i] instanceof SolarEnforcer) {
          this.score += 2000;
          Audio.sfx.victory();
          this.particles.explosion(this.enemies[i].cx, this.enemies[i].cy, 2);
        }
        this.enemies.splice(i, 1);
      }
    }
  }

  // ── Pickups ───────────────────────────────────────────────
  _updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pu = this.pickups[i];
      // Don't cull purely on distance, some are important
      pu.update(dt);
      
      if (rectsOverlap(
        this.player.x, this.player.y, this.player.w, this.player.h,
        pu.x, pu.y, pu.w, pu.h
      )) {
        if (pu instanceof HealthPickup) {
          this.player.heal(pu.amount);
          this.score += 50;
        } else if (pu instanceof EnergyPickup) {
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + pu.amount);
          this.score += 50;
        } else if (pu instanceof AbilityPickup) {
          if (pu.type === 'double_jump') {
            this.player.canDoubleJump = true;
            this.score += 500;
            // Visual feedback
            this.particles.explosion(this.player.x, this.player.y, 2, '#00ccff');
            this.camera.addShake(8);
            
            // Set message
            this.message = "ABILITY ACQUIRED: DOUBLE JUMP";
            this.messageSub = "(Press JUMP while in air)";
            this.messageTimer = 4000;
          }
        }
        pu.alive = false;
        Audio.sfx.checkpoint();
        this.particles.spark(pu.x + 6, pu.y + 6);
        this.pickups.splice(i, 1);
      }
    }
  }

  // ── Collision: projectiles vs enemies/player ───────────────
  _checkProjectileHits() {
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const proj = this.projectiles[pi];
      if (!proj.alive) continue;

      if (proj.owner === 'player') {
        // vs enemies
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (rectsOverlap(
            proj.x - proj.size * 0.5, proj.y - proj.size * 0.5, proj.size, proj.size,
            enemy.x, enemy.y, enemy.w, enemy.h
          )) {
            enemy.takeDamage(proj.damage);
            this.score += 10;
            proj.hit();
            this.camera.addShake(1.5);
            break;
          }
        }
      } else {
        // vs player
        if (!this.player.invincible && this.player.alive &&
          rectsOverlap(
            proj.x - proj.size * 0.5, proj.y - proj.size * 0.5, proj.size, proj.size,
            this.player.x + 2, this.player.y + 2, this.player.w - 4, this.player.h - 4
          )
        ) {
          const res = this._playerHurt(proj.damage);
          if (res !== 'dodge') proj.hit();
        }
      }
    }
  }

  // ── Sword hits ────────────────────────────────────────────
  _checkSwordHits() {
    const sw = this.player.getSwordHitbox();
    if (!sw) return;
    const swingId = this.player.swingId;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (rectsOverlap(sw.x, sw.y, sw.w, sw.h, enemy.x, enemy.y, enemy.w, enemy.h)) {
        // Only hit once per swing using the swing ID
        if (enemy._lastSwingId !== swingId) {
          enemy.takeDamage(sw.damage);
          enemy._lastSwingId = swingId;
          this.score += 20;
          this.camera.addShake(2);
        }
      }
    }
  }

  // ── Enemy contact damage ──────────────────────────────────
  _checkEnemyContact() {
    if (!this.player.alive || this.player.invincible) return;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (!enemy.contactDmg) continue;
      if (rectsOverlap(
        this.player.x + 2, this.player.y + 2, this.player.w - 4, this.player.h - 4,
        enemy.x, enemy.y, enemy.w, enemy.h
      )) {
        this._playerHurt(enemy.contactDmg || 10);
      }
    }
  }

  // ── Plasma rising hazard ──────────────────────────────────
  _updatePlasma(dt) {
    // Trigger when HelionPrime reaches phase 3
    const helion = this.enemies.find(e => e instanceof HelionPrime && e.alive);
    if (helion && helion.phase >= 3 && !this.plasmaRising) {
      this.plasmaRising = true;
      this.plasmaY = WORLD_H + 200; // Start below visible area
    }
    // Rise until y=500 (leaving 100-200px safe zone at top/middle)
    if (this.plasmaRising && this.plasmaY > 500) {
      this.plasmaY -= dt * 0.015; // Slow rise
      // Particles at surface
      if (Math.random() < 0.3) {
        this.particles.plasma(
          this.camera.x + Math.random() * 800,
          this.plasmaY
        );
      }
      // Damage player
      if (this.player.y + this.player.h > this.plasmaY && this.player.alive && !this.player.invincible) {
        this._playerHurt(2);
      }
    }
  }

  // ── Victory ───────────────────────────────────────────────
  _playerHurt(amount) {
    const res = this.player.takeDamage(amount);
    if (res === 'parry') {
      this.camera.addShake(8);
      this.particles.explosion(this.player.cx, this.player.cy, 1.5, '#fff');
      Audio.sfx.victory(); // Use victory sound for parry ping
      
      // Stun all nearby enemies
      for (const e of this.enemies) {
        const dx = e.cx - this.player.cx;
        const dy = e.cy - this.player.cy;
        const distSq = dx*dx + dy*dy;
        if (distSq < 400*400) {
          e.stunTimer = 600; // 0.6s stun
          this.particles.spark(e.cx, e.cy);
        }
      }
      return 'parry';
    } else if (res === 'hit') {
      this.damageFlash = 1;
      this.camera.addShake(4);
      return 'hit';
    }
    return res;
  }

  // ── DRAW ──────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 800, 600);

    switch (this.state) {
      case STATE.LOADING:   this._drawLoading(ctx); break;
      case STATE.MENU:      this._drawMenu(ctx);    break;
      case STATE.PLAYING:
      case STATE.PAUSED:    this._drawGame(ctx);    break;
      case STATE.GAME_OVER: this._drawGameOver(ctx); break;
      case STATE.WIN:       this._drawWin(ctx);     break;
      case STATE.SETTINGS:  this._drawSettingsScreen(ctx); break;
      case STATE.CONTROLS:  this._drawControlsScreen(ctx); break;
    }
  }

  _drawLoading(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);
  }

  _drawMenu(ctx) {
    // Animated background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);
    // Orange glow pulses
    const t = Date.now() * 0.001;
    const gp = Math.sin(t) * 0.08 + 0.08;
    ctx.save();
    ctx.globalAlpha = gp;
    const grad = ctx.createRadialGradient(400, 300, 20, 400, 300, 400);
    grad.addColorStop(0, '#ff8c00'); grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 600);
    ctx.restore();
    UI.drawMenu(ctx, 16, false);
  }

  _drawGame(ctx) {
    // Background
    drawBackground(ctx, this.camera);

    // World-space rendering
    this.camera.begin(ctx);

    // Platforms
    for (const p of this.platforms) {
      if (this.camera.isVisible(p.x, p.y, p.w, p.h)) {
        p.draw(ctx);
      }
    }

    // Pickups
    for (const pu of this.pickups) {
      if (pu.alive && this.camera.isVisible(pu.x, pu.y, pu.w + 4, pu.h + 4)) {
        pu.draw(ctx);
      }
    }

    // Particles (world-space)
    this.particles.draw(ctx);

    // Projectiles
    for (const p of this.projectiles) {
      if (p.alive && this.camera.isVisible(p.x - 20, p.y - 20, 40, 40)) {
        p.draw(ctx);
      }
    }

    // Laser beams
    for (const b of this.laserBeams) {
      b.draw(ctx);
    }

    // Enemies
    for (const e of this.enemies) {
      if (e.alive && this.camera.isVisible(e.x, e.y, e.w, e.h, 64)) {
        e.draw(ctx);
        if (e._drawStun) e._drawStun(ctx);
      }
    }

    // Player
    if (this.player.alive || this.player.deathTimer < 1500) {
      this.player.draw(ctx);
    }

    // Plasma surface
    if (this.plasmaRising) {
      ctx.save();
      const pg = ctx.createLinearGradient(0, this.plasmaY, 0, this.plasmaY + 80);
      pg.addColorStop(0, 'rgba(255,100,0,0.9)');
      pg.addColorStop(1, 'rgba(255,40,0,0.7)');
      ctx.fillStyle = pg;
      ctx.shadowBlur = 30; ctx.shadowColor = '#ff4400';
      ctx.fillRect(this.camera.x, this.plasmaY, 800, WORLD_H - this.plasmaY + 200);
      ctx.restore();
    }

    this.camera.end(ctx);

    // Foreground details
    drawForeground(ctx, this.camera);

    // ── HUD (screen-space) ──────────────────────────────
    if (this.player.alive) {
      UI.drawHUD(ctx, this.player, this.score, this.timer, this.currentSection);
    }

    // Boss HP bar
    const visibleBoss = this.enemies.find(e => e.isBoss && e.alive &&
      this.camera.isVisible(e.x, e.y, e.w, e.h, 600));
    if (visibleBoss) {
      UI.drawBossBar(ctx, visibleBoss);
    }

    // Damage flash
    if (this.damageFlash > 0) {
      UI.drawDamageFlash(ctx, this.damageFlash);
    }

    // Message
    if (this.messageTimer > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.7, this.messageTimer/500)})`;
      ctx.fillRect(0, 160, 800, 100);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00ccff';
      ctx.shadowBlur = 10; ctx.shadowColor = '#0088cc';
      ctx.font = "bold 28px monospace";
      ctx.fillText(this.message, 400, 200);
      if (this.messageSub) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.font = "bold 16px monospace";
        ctx.fillText(this.messageSub, 400, 235);
      }
      ctx.restore();
    }

    // Section transition
    if (this.transitionAlpha > 0.01) {
      UI.drawSectionTransition(ctx, this.transitionName, this.transitionAlpha);
    }

    // Death overlay
    if (!this.player.alive) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.respawnTimer / 1500) * 0.7;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 600);
      if (this.respawnTimer > 400) {
        ctx.globalAlpha = Math.min(1, (this.respawnTimer - 400) / 800) * 0.9;
        ctx.font = "bold 26px 'Courier New'";
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff2200';
        ctx.shadowBlur = 12; ctx.shadowColor = '#ff0000';
        ctx.fillText('SYSTEM FAILURE', 400, 290);
      }
      ctx.restore();
    }

    // Pause overlay
    if (this.state === STATE.PAUSED) {
      UI.drawMenu(ctx, 16, true);
    }
  }

  _drawGameOver(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);
    UI.drawGameOver(ctx, this.score, this.timer, 16);
  }

  _drawWin(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);
    UI.drawWin(ctx, this.score, this.timer, 16);
  }

  _drawSettingsScreen(ctx) {
    UI.drawSettings(ctx, 16);
  }

  _drawControlsScreen(ctx) {
    UI.drawControls(ctx);
  }
}

// ── Boot ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  window._game = new Game();
});

// Resize handler – scale canvas to fit window maintaining 4:3
(function scaleCanvas() {
  function resize() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const container = canvas.parentElement;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const scale = Math.min(winW / 800, winH / 600);
    canvas.style.width  = Math.round(800 * scale) + 'px';
    canvas.style.height = Math.round(600 * scale) + 'px';
    if (container) {
      container.style.width  = Math.round(800 * scale) + 'px';
      container.style.height = Math.round(600 * scale) + 'px';
    }
  }
  window.addEventListener('resize', resize);
  window.addEventListener('load',   resize);
  resize();
})();
