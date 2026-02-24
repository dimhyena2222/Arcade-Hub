// ============================================================
//  ENEMIES
//  Drone | BladeWalker | TurretNode | SolarEnforcer | HelionPrime
// ============================================================

// ── Base Enemy ────────────────────────────────────────────
class Enemy {
  constructor(x, y, w, h, hp) {
    this.x  = x;  this.y  = y;
    this.w  = w;  this.h  = h;
    this.hp = hp; this.maxHp = hp;
    this.vx = 0;  this.vy = 0;
    this.alive      = true;
    this.onGround   = false;
    this.facingRight = true;
    this.hurtTimer  = 0;
    this.HURT_DUR   = 120;
    this.stunTimer  = 0;     // stun window
    this.STUN_DUR   = 600;   // 0.6s
    this.age        = 0;
    this.stateTimer = 0;
    this.state      = 'idle';
    this.particles  = null;
    this.projectiles= null;
    this.GRAVITY    = 700;
    this.score      = 100;
  }

  get cx() { return this.x + this.w * 0.5; }
  get cy() { return this.y + this.h * 0.5; }

  takeDamage(amount, knockDir = 0) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hurtTimer = this.HURT_DUR;
    Audio.sfx.hit();
    if (this.particles) this.particles.impact(this.cx, this.cy);
    if (this.hp <= 0) { this.die(); }
  }

  die() {
    this.alive = false;
    Audio.sfx.enemyDie();
    if (this.particles) this.particles.explosion(this.cx, this.cy);
  }

  applyGravity(dtS) {
    this.vy += this.GRAVITY * dtS;
    if (this.vy > 900) this.vy = 900;
  }

  moveAndCollide(dtS, platforms) {
    this.x += this.vx * dtS;
    // X collision
    for (const p of platforms) {
      if (p.type !== 'solid') continue;
      if (!p.isSolid()) continue;
      if (rectsOverlap(this.x, this.y + 2, this.w, this.h - 4, p.x, p.y, p.w, p.h)) {
        if (this.vx > 0) this.x = p.x - this.w;
        else              this.x = p.x + p.w;
        this.vx = 0;
        this.facingRight = !this.facingRight;
      }
    }
    this.y += this.vy * dtS;
    this.onGround = false;
    for (const p of platforms) {
      if (!p.isSolid()) continue;
      if (p.type === 'pass' || p.type === 'conveyor' || p.type === 'collapsing' || p.type === 'moving') {
        if (this.vy >= 0 &&
            this.y + this.h > p.y && this.y + this.h < p.y + p.h + 10 &&
            this.x + this.w > p.x + 1 && this.x < p.x + p.w - 1) {
          this.y = p.y - this.h;
          this.vy = 0; this.onGround = true;
        }
      } else {
        if (rectsOverlap(this.x + 1, this.y, this.w - 2, this.h, p.x, p.y, p.w, p.h)) {
          if (this.vy > 0) { this.y = p.y - this.h; this.vy = 0; this.onGround = true; }
          else              { this.y = p.y + p.h;   this.vy = 0; }
        }
      }
    }
  }

  distTo(player) {
    return Math.abs(this.cx - player.cx);
  }

  facingPlayer(player) {
    return (player.cx > this.cx) === this.facingRight;
  }

  _hurtFlash(ctx) {
    return this.hurtTimer > 0 && Math.floor(this.hurtTimer / 30) % 2 === 0;
  }

  _drawStun(ctx) {
    if (this.stunTimer <= 0) return;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffff00';
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    const t = Date.now() * 0.01;
    ctx.beginPath();
    ctx.arc(this.cx, this.y - 12, 8, t, t + Math.PI * 0.8);
    ctx.stroke();
    ctx.restore();
  }
}

// ── DRONE (flying, fires slow projectiles) ─────────────────
class Drone extends Enemy {
  constructor(x, y) {
    super(x, y, 22, 18, 24);
    this.score  = 150;
    this.patrolY = y;
    this.bobAmt  = 20 + Math.random() * 20;
    this.bobSpd  = 1.5 + Math.random();
    this.shootCd = 1500 + Math.random() * 1000;
    this.propAngle = 0;
  }

  update(dt, platforms, player) {
    if (!this.alive) return;
    const dtS = dt / 1000;
    this.age += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }

    // Bob and track player horizontally
    this.y = this.patrolY + Math.sin(this.age * 0.001 * this.bobSpd) * this.bobAmt;
    const dx = player.cx - this.cx;
    this.vx += (dx * 0.3 - this.vx) * Math.min(1, dtS * 2);
    this.vx  = Math.max(-80, Math.min(80, this.vx));
    this.x  += this.vx * dtS;
    this.facingRight = this.vx > 0;
    this.propAngle += dtS * 20;

    // Shoot
    this.shootCd -= dt;
    if (this.shootCd <= 0 && this.distTo(player) < 640 && player.alive) {
      const angle = Math.atan2(player.cy - this.cy, player.cx - this.cx);
      const speed = 130;
      const proj  = new Projectile(
        this.cx, this.cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        'enemy', 10, '#ff4400'
      );
      this.projectiles.push(proj);
      this.shootCd = 2000 + Math.random() * 1000;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    if (this._hurtFlash(ctx)) return;
    const cx = this.cx, cy = this.cy;
    ctx.save();
    // Body
    ctx.fillStyle = '#4a5a3a';
    ctx.fillRect(cx - 9, cy - 6, 18, 12);
    // Eye
    const ep = Math.sin(this.age * 0.003) * 0.3 + 0.7;
    ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#ff4400';
    ctx.fillStyle = `rgba(255,68,0,${ep})`;
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
    ctx.restore();
    // Propellers
    ctx.save();
    ctx.translate(cx - 8, cy - 5);
    ctx.rotate(this.propAngle);
    ctx.fillStyle = '#8a9a6a';
    ctx.fillRect(-6, -1, 12, 2);
    ctx.fillRect(-1, -6, 2, 12);
    ctx.restore();
    ctx.save();
    ctx.translate(cx + 8, cy - 5);
    ctx.rotate(-this.propAngle);
    ctx.fillStyle = '#8a9a6a';
    ctx.fillRect(-6, -1, 12, 2);
    ctx.fillRect(-1, -6, 2, 12);
    ctx.restore();
    // HP bar
    this._drawHpBar(ctx);
    ctx.restore();
  }

  _drawHpBar(ctx) {
    if (this.hp >= this.maxHp) return;
    const bw = this.w;
    ctx.fillStyle = '#300';
    ctx.fillRect(this.x, this.y - 6, bw, 3);
    ctx.fillStyle = '#f40';
    ctx.fillRect(this.x, this.y - 6, bw * (this.hp / this.maxHp), 3);
  }
}

// ── BLADE WALKER (charges at player) ────────────────────────
class BladeWalker extends Enemy {
  constructor(x, y) {
    super(x, y, 24, 28, 40);
    this.score   = 200;
    this.walkSpd = 70;
    this.chargeSpd = 240;
    this.chargeCd  = 1000;
    this.chargeTimer = 0;
    this.isCharging  = false;
    this.chargeDur   = 500;
    this.bladeAngle  = 0;
    this.patrolDir   = Math.random() < 0.5 ? 1 : -1;
  }

  update(dt, platforms, player) {
    if (!this.alive) return;
    const dtS = dt / 1000;
    this.age += dt; this.stateTimer += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
    
    this.bladeAngle += dtS * 8;

    this.chargeCd -= dt;

    if (this.isCharging) {
      this.chargeTimer -= dt;
      this.vx = this.chargeSpd * (this.facingRight ? 1 : -1);
      if (this.chargeTimer <= 0) {
        this.isCharging = false;
        this.vx = 0;
        this.chargeCd = 2500 + Math.random() * 1000;
      }
    } else {
      // Patrol
      this.vx = this.walkSpd * this.patrolDir;
      this.facingRight = this.patrolDir > 0;

      // Charge if player nearby and mostly on same level
      if (this.distTo(player) < 420 &&
          Math.abs(this.cy - player.cy) < 120 &&
          this.chargeCd <= 0 && player.alive) {
        this.isCharging   = true;
        this.chargeTimer  = this.chargeDur;
        this.facingRight  = player.cx > this.cx;
        this.patrolDir    = this.facingRight ? 1 : -1;
        if (this.particles) this.particles.spark(this.cx, this.cy);
        Audio.sfx.alert(); // Feedback
      }
    }

    this.applyGravity(dtS);
    this.moveAndCollide(dtS, platforms);
    // Reverse at ledge
    if (this.onGround && !this.isCharging) {
      const edgeX = this.facingRight ? this.x + this.w + 4 : this.x - 4;
      let onLedge = false;
      for (const p of platforms) {
        if (p.type === 'solid' && p.isSolid() &&
            edgeX >= p.x && edgeX <= p.x + p.w &&
            Math.abs((p.y) - (this.y + this.h)) < 8) {
          onLedge = true; break;
        }
      }
      if (!onLedge) this.patrolDir *= -1;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    if (this._hurtFlash(ctx)) return;
    const cx = this.cx, cy = this.cy;
    const dir = this.facingRight ? 1 : -1;
    ctx.save();

    // Legs (animated walk)
    const legSwing = this.isCharging ? 0.6 : Math.sin(this.age * 0.01) * 0.4;
    ctx.fillStyle = '#3a2a1a';
    ctx.save(); ctx.translate(cx - 5, this.y + 18); ctx.rotate(legSwing);
    ctx.fillRect(-3, 0, 6, 10); ctx.restore();
    ctx.save(); ctx.translate(cx + 5, this.y + 18); ctx.rotate(-legSwing);
    ctx.fillRect(-3, 0, 6, 10); ctx.restore();

    // Body
    ctx.fillStyle = this.isCharging ? '#6a4a2a' : '#4a3a2a';
    ctx.fillRect(cx - 10, this.y + 4, 20, 16);

    // Head
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cx - 8, this.y, 16, 8);
    // Eye
    ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#ff2200';
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(cx + dir * 2, this.y + 2, 4, 4); ctx.restore();

    // Blade arm
    ctx.save();
    ctx.translate(cx + dir * 8, this.y + 8);
    ctx.rotate(this.bladeAngle * dir);
    ctx.fillStyle = '#ccddee';
    ctx.fillRect(-1, -12, 2, 24);
    ctx.fillRect(-8, -1, 16, 2);
    ctx.restore();

    this._drawHpBar(ctx);
    ctx.restore();
  }

  _drawHpBar(ctx) {
    if (this.hp >= this.maxHp) return;
    const bw = this.w;
    ctx.fillStyle = '#300'; ctx.fillRect(this.x, this.y - 5, bw, 3);
    ctx.fillStyle = '#f40'; ctx.fillRect(this.x, this.y - 5, bw * (this.hp / this.maxHp), 3);
  }
}

// ── TURRET NODE (stationary, fires patterns) ─────────────────
class TurretNode extends Enemy {
  constructor(x, y) {
    super(x, y, 26, 22, 55);
    this.score   = 250;
    this.shootCd = 1800;
    this.shootPattern = 0;
    this.rotorAngle   = 0;
    this.alertTimer   = 0;
    this.warned       = false;
  }

  update(dt, platforms, player) {
    if (!this.alive) return;
    const dtS = dt / 1000;
    this.age += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
    
    this.rotorAngle += dtS * 2;

    const dist = this.distTo(player);
    if (dist < 750 && player.alive) {
      if (dist < 400) this.alertTimer += dt * 2; // faster alert if closer
      else           this.alertTimer += dt;
      this.shootCd -= dt;
      if (this.shootCd <= 0) { this._shoot(player); }
    } else { this.alertTimer = 0; }

    this.facingRight = player.cx > this.cx;
  }

  _shoot(player) {
    const patterns = [
      [[0]],           // single aimed
      [[-0.2, 0, 0.2]], // spread 3
      [[-0.3, 0.3]],   // spread 2
    ];
    const pattern = patterns[this.shootPattern % patterns.length];
    const baseAngle = Math.atan2(player.cy - this.cy, player.cx - this.cx);
    for (const offsets of pattern) {
      for (const off of offsets) {
        const angle = baseAngle + off;
        const speed = 160;
        this.projectiles.push(new Projectile(
          this.cx, this.cy,
          Math.cos(angle) * speed, Math.sin(angle) * speed,
          'enemy', 12, '#ff6600'
        ));
      }
    }
    this.shootPattern++;
    this.shootCd = 1400 + Math.random() * 600;
    Audio.sfx.shoot();
  }

  draw(ctx) {
    if (!this.alive) return;
    if (this._hurtFlash(ctx)) return;
    const cx = this.cx, cy = this.cy;
    ctx.save();

    // Base
    ctx.fillStyle = '#3a3a2a';
    ctx.fillRect(cx - 13, cy + 4, 26, 8);

    // Body drum
    ctx.fillStyle = '#5a5a3a';
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();

    // Rotating scanner ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotorAngle);
    ctx.strokeStyle = '#aaaa44'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI); ctx.stroke();
    const aw = this.alertTimer > 500 ? 0.8 : 0.3;
    ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#ff6600';
    ctx.fillStyle = `rgba(255,100,0,${aw})`;
    ctx.fillRect(-2, -12, 4, 8);
    ctx.restore();
    ctx.restore();

    // Eye
    const alert = this.alertTimer > 400;
    ctx.save(); ctx.shadowBlur = alert ? 12 : 4; ctx.shadowColor = '#ff6600';
    ctx.fillStyle = alert ? '#ff6600' : '#884422';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    this._drawHpBar(ctx);
    ctx.restore();
  }

  _drawHpBar(ctx) {
    if (this.hp >= this.maxHp) return;
    ctx.fillStyle = '#300'; ctx.fillRect(this.x, this.y - 6, this.w, 3);
    ctx.fillStyle = '#f40'; ctx.fillRect(this.x, this.y - 6, this.w * (this.hp / this.maxHp), 3);
  }
}

// ── SOLAR ENFORCER (mini-boss) ────────────────────────────────
class SolarEnforcer extends Enemy {
  constructor(x, y) {
    super(x, y, 48, 52, 320);
    this.score    = 2000;
    this.phase    = 1;
    this.GRAVITY  = 500;
    this.moveCd   = 1200;
    this.shootCd  = 1000;
    this.jumpCd   = 2500;
    this.chargeAtk = false;
    this.chargeTimer = 0;
    this.armAngle = 0;
    this.shieldUp = false;
    this.shieldCd = 0;
    this.contactDmg = 25;
    this.vx = -80;
    this.isBoss = true;
    this.bossName = 'SOLAR ENFORCER';
    this.introduced = false;
  }

  update(dt, platforms, player) {
    if (!this.alive) return;
    const dtS = dt / 1000;
    this.age += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }

    const dist = this.distTo(player);
    this.facingRight = player.cx > this.cx;
    this.armAngle = Math.sin(this.age * 0.003) * 0.4;

    // Phase 2 at half health
    if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      Audio.sfx.bossPhase();
      if (this.particles) this.particles.explosion(this.cx, this.cy, 2);
    }

    this.moveCd  -= dt;
    this.shootCd -= dt;
    this.jumpCd  -= dt;
    this.shieldCd-= dt;

    // Walking
    const spd = this.phase === 2 ? 120 : 80;
    this.vx = this.facingRight ? spd : -spd;

    // Jump towards player if far
    if (this.onGround && Math.abs(player.cy - this.cy) > 40 && this.jumpCd <= 0) {
      this.vy = -420;
      this.jumpCd = 2500;
    }

    // Ranged attack
    if (this.shootCd <= 0 && dist < 450 && player.alive) {
      this._shootPattern(player);
      this.shootCd = this.phase === 2 ? 900 : 1400;
    }

    // Shield
    if (this.shieldCd <= 0 && this.phase === 2) {
      this.shieldUp = true;
      setTimeout(() => { this.shieldUp = false; }, 1200);
      this.shieldCd = 3500;
    }

    this.applyGravity(dtS);
    this.moveAndCollide(dtS, platforms);

    // Arena Bounds (Section 1 End)
    if (this.x < 6000) { this.x = 6000; this.vx = 0; }
    if (this.x > 7800) { this.x = 7800; this.vx = 0; }
  }

  _shootPattern(player) {
    const count = this.phase === 2 ? 5 : 3;
    const baseAngle = Math.atan2(player.cy - this.cy, player.cx - this.cx);
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - Math.floor(count / 2)) * 0.22;
      const proj  = new Projectile(
        this.cx, this.cy,
        Math.cos(angle) * 200, Math.sin(angle) * 200,
        'enemy', 14, '#ffaa00', 7
      );
      this.projectiles.push(proj);
    }
    Audio.sfx.shoot();
    if (this.particles) this.particles.explosion(this.cx, this.cy, 0.6);
  }

  takeDamage(amount, dir = 0) {
    if (this.shieldUp) {
      Audio.sfx.hit();
      if (this.particles) this.particles.spark(this.cx, this.cy);
      return; // blocked
    }
    super.takeDamage(amount, dir);
    Audio.sfx.bossHit();
  }

  draw(ctx) {
    if (!this.alive) return;
    if (this._hurtFlash(ctx)) return;
    const cx = this.cx, cy = this.cy;
    const d  = this.facingRight ? 1 : -1;
    ctx.save();

    // Shield ring
    if (this.shieldUp) {
      ctx.save();
      ctx.globalAlpha  = 0.5;
      ctx.strokeStyle  = '#ffdd44';
      ctx.lineWidth    = 4;
      ctx.shadowBlur   = 16; ctx.shadowColor = '#ffdd44';
      ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // Legs
    const ls = Math.sin(this.age * 0.008) * 0.5;
    ctx.fillStyle = '#2a3a2a';
    ctx.save(); ctx.translate(cx - 12, this.y + 32); ctx.rotate(ls);
    ctx.fillRect(-5, 0, 10, 20); ctx.restore();
    ctx.save(); ctx.translate(cx + 12, this.y + 32); ctx.rotate(-ls);
    ctx.fillRect(-5, 0, 10, 20); ctx.restore();

    // Body
    const bodyCol = this.phase === 2 ? '#6a3a1a' : '#4a5a3a';
    ctx.fillStyle = bodyCol;
    ctx.fillRect(cx - 22, this.y + 10, 44, 30);

    // Chest plate
    ctx.fillStyle = this.phase === 2 ? '#aa5522' : '#6a8a4a';
    ctx.fillRect(cx - 16, this.y + 14, 32, 18);

    // Core
    const cp = Math.sin(this.age * 0.006) * 0.4 + 0.6;
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = this.phase === 2 ? '#ff4400' : '#ffaa00';
    ctx.fillStyle = this.phase === 2 ? `rgba(255,${Math.round(70 * cp)},0,1)` : `rgba(255,${Math.round(170 * cp)},0,1)`;
    ctx.fillRect(cx - 7, this.y + 18, 14, 10); ctx.restore();

    // Shoulder cannons
    ctx.fillStyle = '#3a4a3a';
    ctx.fillRect(cx - 28, this.y + 10, 10, 8);
    ctx.fillRect(cx + 18,  this.y + 10, 10, 8);

    // Arms
    ctx.save();
    ctx.translate(cx + d * 20, this.y + 16);
    ctx.rotate(this.armAngle * d);
    ctx.fillStyle = '#4a5a3a';
    ctx.fillRect(0, -5, d * 18, 10);
    ctx.fillStyle = '#2a3a2a';
    ctx.fillRect(d * 16, -4, d * 10, 8);
    ctx.restore();

    // Head
    ctx.fillStyle = '#3a4a3a';
    ctx.fillRect(cx - 16, this.y, 32, 12);
    // Visor
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = this.phase === 2 ? '#ff4400' : '#ffaa00';
    ctx.fillStyle = this.phase === 2 ? '#ff4400' : '#ffaa00';
    ctx.fillRect(cx - 10, this.y + 3, 20, 5); ctx.restore();

    // HP bar
    this._drawBossHpBar(ctx);
    ctx.restore();
  }

  _drawBossHpBar(ctx) {
    const bw = this.w + 20;
    const bx = this.x - 10;
    ctx.fillStyle = '#200'; ctx.fillRect(bx, this.y - 12, bw, 6);
    ctx.fillStyle = this.phase === 2 ? '#ff4400' : '#ffaa00';
    ctx.fillRect(bx, this.y - 12, bw * (this.hp / this.maxHp), 6);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, this.y - 12, bw, 6);
  }
}

// ── HELION PRIME (final boss) ─────────────────────────────────
class HelionPrime extends Enemy {
  constructor(x, y) {
    super(x, y, 60, 60, 600);
    this.score    = 10000;
    this.isBoss   = true;
    this.bossName = 'HELION PRIME';
    this.phase    = 1;
    this.GRAVITY  = 0;  // floats
    this.shellAngle = 0;
    this.eyeAngle   = 0;
    this.shootCd    = 800;
    this.laserCd    = 4000;
    this.dashCd     = 3000;
    this.tentacleCd = 5000;
    this.contactDmg = 30;

    // Floating movement
    this.targetX = x;
    this.targetY = y;
    this.moveCd  = 1500;

    // Phase thresholds
    this.PHASES = [1.0, 0.75, 0.5, 0.25];

    this.lasers        = [];   // managed externally via game
    this.laserBeams    = null; // set by game
    this.plasmaRising  = false;
    this.plasmaY       = 0;
    this.enrageMode    = false;
    this.introduced    = false;
    this.deathSequence = false;
    this.deathTimer    = 0;

    this.tendrils = Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      len:   40 + Math.random() * 20,
      phase: Math.random() * Math.PI * 2
    }));
  }

  get hpRatio() { return this.hp / this.maxHp; }

  update(dt, platforms, player) {
    if (!this.alive) return;
    const dtS = dt / 1000;
    this.age += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
    
    this.shellAngle += dtS * (1 + (1 - this.hpRatio) * 3);
    this.eyeAngle    = Math.sin(this.age * 0.002) * 0.3;

    if (this.deathSequence) { this.deathTimer += dt; return; }

    // Phase transitions
    const prevPhase = this.phase;
    if      (this.hpRatio < 0.25) this.phase = 4;
    else if (this.hpRatio < 0.50) this.phase = 3;
    else if (this.hpRatio < 0.75) this.phase = 2;
    if (this.phase !== prevPhase) {
      Audio.sfx.bossPhase();
      if (this.particles) this.particles.explosion(this.cx, this.cy, 3);
    }

    // Floating towards target
    const dx = (this.targetX - this.cx);
    const dy = (this.targetY - this.cy);
    this.vx += dx * 2 * dtS;
    this.vy += dy * 2 * dtS;
    this.vx *= Math.pow(0.02, dtS);
    this.vy *= Math.pow(0.02, dtS);
    const spd = 120 + this.phase * 30;
    const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (mag > spd) { this.vx = (this.vx / mag) * spd; this.vy = (this.vy / mag) * spd; }
    this.x += this.vx * dtS;
    this.y += this.vy * dtS;

    // Pick new target position
    this.moveCd -= dt;
    if (this.moveCd <= 0) {
      // Arena is in Section 3: 12000 - 16000
      // We want to stay around 12500 - 14000
      const arenaX = 12500, arenaY = 120, arenaW = 1500, arenaH = 280;
      this.targetX = arenaX + Math.random() * arenaW;
      this.targetY = arenaY + Math.random() * arenaH;
      this.moveCd  = 1200 + Math.random() * 800;
    }

    this.shootCd -= dt;
    this.laserCd -= dt;
    this.dashCd  -= dt;
    this.tentacleCd -= dt;

    if (!player.alive) return;

    // Projectile bursts (all phases)
    if (this.shootCd <= 0) {
      this._shoot(player);
      this.shootCd = Math.max(400, 1000 - this.phase * 150);
    }

    // Sweeping laser (phase 2+)
    if (this.phase >= 2 && this.laserCd <= 0) {
      this._fireLaser(player);
      this.laserCd = 4000 - this.phase * 300;
    }

    // Enrage (phase 4)
    if (this.phase >= 4 && !this.enrageMode) {
      this.enrageMode = true;
    }

    // Tendril particles
    for (const t of this.tendrils) {
      t.phase += dtS * 2;
      t.angle += dtS * 0.3 * (this.phase >= 3 ? 2 : 1);
    }
  }

  _shoot(player) {
    const count = 4 + this.phase * 2;
    const baseAngle = Math.atan2(player.cy - this.cy, player.cx - this.cx);
    const spread = this.phase >= 3 ? Math.PI * 2 : Math.PI * 0.6;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread * 0.5 + (spread / (count - 1)) * i;
      const speed = 180 + this.phase * 30;
      this.projectiles.push(new Projectile(
        this.cx, this.cy,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        'boss', 15 + this.phase * 3, '#ff3300', 6
      ));
    }
    Audio.sfx.shoot();
    if (this.particles) this.particles.bossLaser(this.cx, this.cy);
  }

  _fireLaser(player) {
    if (!this.laserBeams) return;
    const angle = Math.atan2(player.cy - this.cy, player.cx - this.cx);
    const sweep = this.phase >= 3 ? Math.PI * 0.8 : Math.PI * 0.5;
    // Create 3 laser beams sweeping across
    for (let i = 0; i < 3; i++) {
      const a = angle - sweep * 0.5 + (sweep / 2) * i;
      const beam = new LaserBeam(this.cx, this.cy, a, 500, 18, 'boss');
      beam.duration = 1400;
      this.laserBeams.push(beam);
    }
    Audio.sfx.bossPhase();
  }

  takeDamage(amount, dir = 0) {
    super.takeDamage(amount, dir);
    Audio.sfx.bossHit();
    if (this.hp <= 0) {
      this.deathSequence = true;
      this.alive = false;
    }
  }

  draw(ctx) {
    if (this.deathSequence) {
      this._drawDeathSequence(ctx);
      return;
    }
    if (this._hurtFlash(ctx)) return;
    const cx = this.cx, cy = this.cy;
    ctx.save();

    // Energy tendrils
    for (const t of this.tendrils) {
      const tipAngle = t.angle + Math.sin(t.phase) * 0.5;
      const tx = cx + Math.cos(tipAngle) * t.len;
      const ty = cy + Math.sin(tipAngle) * t.len;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(
        cx + Math.cos(tipAngle + 0.8) * t.len * 0.6,
        cy + Math.sin(tipAngle + 0.8) * t.len * 0.6,
        tx, ty
      );
      const gp = Math.sin(t.phase * 1.3) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255,${Math.round(60 + 60 * gp)},0,${gp * 0.8})`;
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 8; ctx.shadowColor = '#ff4400';
      ctx.stroke();
      // Tip
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Rotating outer shell
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.shellAngle);
    const shellColor = this.phase >= 3 ? '#6a1a00' : '#3a3a5a';
    ctx.strokeStyle = shellColor;
    ctx.lineWidth   = 5;
    ctx.shadowBlur  = 12; ctx.shadowColor = this.phase >= 3 ? '#ff4400' : '#4466ff';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.arc(0, 0, 28, -0.3, 0.3);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // Inner sphere
    const gradient = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 24);
    gradient.addColorStop(0, this.phase >= 3 ? '#ff6600' : '#4488ff');
    gradient.addColorStop(1, this.phase >= 3 ? '#330000' : '#001133');
    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Central eye
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.eyeAngle);
    const eyeColor = this.enrageMode ? '#ff0000' : '#ff4400';
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = eyeColor;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2);
    const eyeGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 10);
    eyeGrad.addColorStop(0, '#ffffff');
    eyeGrad.addColorStop(0.4, eyeColor);
    eyeGrad.addColorStop(1, '#220000');
    ctx.fillStyle = eyeGrad; ctx.fill();
    ctx.restore();
    // Eye slit
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.restore();

    // HP bar
    this._drawBossHpBar(ctx);
    ctx.restore();
  }

  _drawDeathSequence(ctx) {
    const t = this.deathTimer / 3000;
    const cx = this.cx, cy = this.cy;
    const flicker = Math.random() > 0.4;
    if (!flicker) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    // Expanding ring effect
    for (let r = 0; r < 3; r++) {
      const radius = (t * 80) + r * 15;
      ctx.strokeStyle = r % 2 === 0 ? '#ff8c00' : '#ffffff';
      ctx.lineWidth   = 3 * (1 - t);
      ctx.shadowBlur  = 20; ctx.shadowColor = '#ff4400';
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  _drawBossHpBar(ctx) {
    // Drawn in UI instead for boss bars
  }
}
