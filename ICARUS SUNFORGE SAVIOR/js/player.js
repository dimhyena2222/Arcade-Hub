// ============================================================
//  PLAYER  –  Icarus (Smash Bros-style health & movement)
// ============================================================

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 28; this.h = 40;

    // Physics
    this.vx = 0; this.vy = 0;
    this.speed      = 220;   // px/s
    this.jumpPow     = -500;
    this.gravity     = 1400;
    this.onGround    = false;
    this.canDoubleJump = true;
    this.didDoubleJump = false;

    // Smash-style health
    this.percent   = 0;      // 0–999
    this.stocks    = 3;
    this.alive     = true;
    this.deathTimer = 0;

    // Invincibility
    this.invincible = false;
    this.invTimer   = 0;
    this.INV_BLINK  = 80;  // ms

    this.hurtTimer   = 0;
    this.stunTimer   = 0;

    // Energy (sword charge)
    this.maxEnergy = 100;
    this.energy    = 100;
    this.energyRegen = 12;   // per second

    // Weapon state
    this.swingTimer      = 0;
    this.SWING_DUR       = 240;
    this.swingCharged    = false;
    this.chargeTimer     = 0;
    this.CHARGE_HOLD     = 700;
    this.swingId         = 0;
    this.swingFacingRight  = true;  // direction committed at swing release
    this.chargeFacingRight = true;  // direction locked at charge start

    // Facing
    this.facingRight = true;

    // Dodge / parry
    this.dodging     = false;
    this.dodgeTimer  = 0;
    this.DODGE_DUR   = 380;
    this.dodgeVx     = 0;
    this.parryWindow = 150;  // ms from dodge start = parry active

    this.blocking   = false;
    this.blockTimer = 0;
    this.BLOCK_DUR  = 300;

    this.dodgeCooldown = 0;
    this.DODGE_COOLDOWN= 700;

    // References injected by game
    this.particles   = null;
    this.projectiles = null;

    // Shoot cooldown
    this.shootCooldown = 0;
    this.SHOOT_CD      = 320;
  }

  get cx() { return this.x + this.w * 0.5; }
  get cy() { return this.y + this.h * 0.5; }

  // ── Respawn ─────────────────────────────────────────────
  respawn(rx, ry) {
    this.x = rx; this.y = ry;
    this.vx = 0; this.vy = 0;
    this.alive = true;
    this.deathTimer = 0;
    this.hurtTimer  = 0;
    this.stunTimer  = 0;
    this.dodging    = false;
    this.blocking   = false;
    this.chargeTimer = 0;
    this.swingTimer  = 0;
    this.onGround   = false;
    this.canDoubleJump = true;
    this.didDoubleJump = false;

    // Temporary invincibility
    this.invincible = true;
    this.invTimer   = 2200;
  }

  // ── Take damage ─────────────────────────────────────────
  // Returns 'parry', 'dodge', 'hit', or false
  takeDamage(amount, kbDir = 0) {
    if (!this.alive || this.invincible) return false;

    // Dodge check (invincible window)
    if (this.dodging && this.dodgeTimer > (this.DODGE_DUR - this.parryWindow)) {
      return 'dodge';
    }

    // Parry check (first frames of block)
    if ((this.blocking) && this.blockTimer > (this.BLOCK_DUR - this.parryWindow)) {
      return 'parry';
    }

    // Block (absorb most of it)
    if (this.blocking) {
      amount = Math.max(1, Math.round(amount * 0.15));
    }

    // Add to percent
    this.percent += amount;
    if (this.percent > 999) this.percent = 999;

    // Knockback formula (Smash-like)
    if (kbDir !== 0) {
      const kbMag = amount * (0.6 + this.percent * 0.013) * 2.0;
      this.vx = kbDir * kbMag * 0.75;
      this.vy = -kbMag * 0.55;
    }

    this.hurtTimer = 180;
    this.invTimer  = 450;
    this.invincible = true;

    if (this.particles) this.particles.spark(this.cx, this.cy);

    return 'hit';
  }

  // ── Update ──────────────────────────────────────────────
  update(dt, platforms) {
    const dtS = dt / 1000;

    // Timers
    if (this.invTimer   > 0) { this.invTimer   -= dt; if (this.invTimer <= 0) this.invincible = false; }
    if (this.hurtTimer  > 0)   this.hurtTimer  -= dt;
    if (this.stunTimer  > 0)   this.stunTimer  -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.swingTimer > 0)    this.swingTimer -= dt;

    // Energy regen (only when not swinging or shooting)
    if (this.swingTimer <= 0 && this.chargeTimer === 0) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen * dtS);
    }

    if (this.stunTimer > 0) {
      // Can't act
      this._applyGravity(dtS);
      this._move(dtS, platforms);
      return;
    }

    this._handleDodgeBlock(dt, dtS);
    this._handleMovement(dtS);
    this._handleJump();
    this._handleWeapons(dt, dtS);
    this._applyGravity(dtS);
    this._move(dtS, platforms);
  }

  _handleDodgeBlock(dt, dtS) {
    if (this.dodging) {
      this.dodgeTimer -= dt;
      this.invincible = true;
      this.invTimer   = Math.max(this.invTimer, 1);
      this.x         += this.dodgeVx * dtS;
      if (this.dodgeTimer <= 0) {
        this.dodging = false;
        this.dodgeCooldown = this.DODGE_COOLDOWN;
      }
      return;
    }

    if (this.blocking) {
      this.blockTimer -= dt;
      if (this.blockTimer <= 0 || !Input.held('KeyF')) {
        this.blocking = false;
      }
    }

    // Initiate dodge or block
    if (Input.pressed('KeyF') && this.dodgeCooldown <= 0) {
      const left  = Input.held('ArrowLeft') || Input.held('KeyA');
      const right = Input.held('ArrowRight')|| Input.held('KeyD');
      if (left || right) {
        // Dodge roll
        this.dodging   = true;
        this.dodgeTimer = this.DODGE_DUR;
        this.dodgeVx   = right ? 340 : -340;
        this.invincible = true;
        if (this.particles) this.particles.dash(this.cx, this.cy);
      } else {
        // Block / parry
        this.blocking   = true;
        this.blockTimer = this.BLOCK_DUR;
        this.invincible = false; // Blocking does NOT give invincibility
      }
    }
  }

  _handleMovement(dtS) {
    if (this.dodging) return;

    const left  = Input.held('ArrowLeft') || Input.held('KeyA');
    const right = Input.held('ArrowRight')|| Input.held('KeyD');

    if (left)  { this.vx = -this.speed; this.facingRight = false; }
    else if (right) { this.vx =  this.speed; this.facingRight = true;  }
    else {
      // Friction
      this.vx *= this.onGround ? 0.75 : 0.88;
      if (Math.abs(this.vx) < 2) this.vx = 0;
    }
  }

  _handleJump() {
    if (Input.pressed('Space') || Input.pressed('ArrowUp') || Input.pressed('KeyW')) {
      if (this.onGround) {
        this.vy = this.jumpPow;
        this.onGround = false;
        this.canDoubleJump = true;
        this.didDoubleJump = false;
      } else if (this.canDoubleJump && !this.didDoubleJump) {
        this.vy = this.jumpPow * 0.88;
        this.didDoubleJump = true;
        this.canDoubleJump = false;
        if (this.particles) this.particles.dash(this.cx, this.cy);
      }
    }
  }

  _handleWeapons(dt, dtS) {
    if (this.dodging || this.blocking) return;

    // ── Laser sword (K / Right Click = hold to charge, release to swing) ──
    const chargeKey = Input.held('KeyK') || Input.mouse.right;

    if (chargeKey) {
      // Update facing while holding charge
      const left  = Input.held('ArrowLeft') || Input.held('KeyA');
      const right = Input.held('ArrowRight')|| Input.held('KeyD');
      if (right) this.chargeFacingRight = true;
      else if (left) this.chargeFacingRight = false;
      else this.chargeFacingRight = this.facingRight;

      this.chargeTimer += dt;
      this.energy = Math.max(0, this.energy - 18 * dtS);
    } else if (this.chargeTimer > 0) {
      // Released – commit swing
      if (this.swingTimer <= 0 && this.energy >= 5) {
        const charged = this.chargeTimer >= this.CHARGE_HOLD;
        this.swingFacingRight = this.chargeFacingRight;
        this._swingSword(charged, this.swingFacingRight);
      }
      this.chargeTimer = 0;
    }

    // ── Plasma shot (J / Left Click) ──
    if ((Input.pressed('KeyJ') || Input.mouse.leftJust) && this.shootCooldown <= 0 && this.energy >= 15) {
      this._shoot();
    }
  }

  _swingSword(charged, facingRight) {
    this.swingTimer   = charged ? this.SWING_DUR * 1.6 : this.SWING_DUR;
    this.swingCharged = charged;
    this.swingId++;
    if (charged) {
      this.energy = Math.max(0, this.energy - 35);
      if (this.particles) this.particles.chargedSwing(this.cx, this.cy, facingRight);
    } else {
      this.energy = Math.max(0, this.energy - 12);
    }
  }

  _shoot() {
    this.shootCooldown = this.SHOOT_CD;
    this.energy = Math.max(0, this.energy - 15);
    const dir  = this.facingRight ? 1 : -1;
    const projX = this.facingRight ? this.x + this.w : this.x;
    const projY = this.cy - 4;
    if (this.projectiles) {
      this.projectiles.push(new Projectile(projX, projY, dir * 600, 0, 'player', 12, '#ffdd00', 5));
    }
    if (this.particles) this.particles.muzzle(projX, projY);
  }

  // ── Physics helpers ─────────────────────────────────────
  _applyGravity(dtS) {
    if (!this.onGround) this.vy += this.gravity * dtS;
    if (this.vy > 1200) this.vy = 1200;  // terminal velocity
  }

  _move(dtS, platforms) {
    const mx = this.dodging ? 0 : this.vx * dtS;
    const my = this.vy * dtS;

    this.x += mx;
    this.y += my;

    this.onGround = false;
    this._collidePlatforms(platforms);
  }

  _collidePlatforms(platforms) {
    for (const p of platforms) {
      if (!p.isSolid()) continue;

      const overlapX = this.x + this.w > p.x && this.x < p.x + p.w;
      const overlapY = this.y + this.h > p.y && this.y < p.y + p.h;

      if (!overlapX || !overlapY) {
        // Pass-through top-only collision
        if (p.type === 'pass' || p.type === 'semisolid') {
          if (this.vy >= 0 &&
              this.y + this.h - this.vy * 0.016 <= p.y + 2 &&
              this.x + this.w > p.x && this.x < p.x + p.w) {
            if (this.y + this.h >= p.y && this.y + this.h <= p.y + 20) {
              this.y = p.y - this.h;
              this.vy = 0;
              this.onGround = true;
              this.canDoubleJump = true;
              this.didDoubleJump = false;
            }
          }
        }
        continue;
      }

      if (p.type === 'solid') {
        // Full AABB resolve
        const ol = (p.x + p.w) - this.x;
        const or2 = (this.x + this.w) - p.x;
        const ot = (p.y + p.h) - this.y;
        const ob = (this.y + this.h) - p.y;
        const minO = Math.min(ol, or2, ot, ob);
        if (minO === ob && this.vy >= 0) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.canDoubleJump = true;
          this.didDoubleJump = false;
        } else if (minO === ot && this.vy < 0) {
          this.y = p.y + p.h; this.vy = 0;
        } else if (minO === ol) {
          this.x = p.x + p.w; this.vx = 0;
        } else if (minO === or2) {
          this.x = p.x - this.w; this.vx = 0;
        }
      } else {
        // Pass-through: only land on top
        if (this.vy >= 0 && this.y + this.h <= p.y + 20 && this.y + this.h >= p.y) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.canDoubleJump = true;
          this.didDoubleJump = false;
        }
      }
    }
  }

  // ── Sword hitbox ────────────────────────────────────────
  getSwordHitbox() {
    if (this.swingTimer <= 0) return null;
    const charged = this.swingCharged;
    const right   = this.swingFacingRight;
    const reach   = charged ? 78 : 54;
    const thick   = charged ? 28 : 20;
    return {
      x: right ? this.x + this.w - 6 : this.x - reach + 6,
      y: this.cy - thick * 0.5,
      w: reach,
      h: thick,
      damage: charged ? 28 : 14,
    };
  }

  // ── Draw ────────────────────────────────────────────────
  draw(ctx) {
    if (!this.alive && this.deathTimer > 1400) return;

    // Invincibility blink
    if (this.invincible) {
      const blinkOn = Math.floor(Date.now() / this.INV_BLINK) % 2 === 0;
      if (!blinkOn) return;
    }

    ctx.save();
    const alpha = (!this.alive) ? Math.max(0, 1 - this.deathTimer / 800) : 1;
    ctx.globalAlpha = alpha;

    // Hurt flash
    if (this.hurtTimer > 0) {
      ctx.shadowBlur  = 14;
      ctx.shadowColor = '#ff2200';
    }

    // Body
    const bodyColor = this.blocking ? '#4488ff' : (this.dodging ? '#00ffcc' : '#2266cc');
    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Visor
    ctx.fillStyle = '#00eeff';
    const visX = this.facingRight ? this.x + this.w * 0.55 : this.x + this.w * 0.08;
    ctx.fillRect(visX, this.y + 6, 11, 7);

    // Boost jets (when airborne)
    if (!this.onGround && Math.abs(this.vy) > 20) {
      ctx.fillStyle = 'rgba(255,140,0,0.7)';
      ctx.fillRect(this.x + 4, this.y + this.h, 8, 10);
      ctx.fillRect(this.x + this.w - 12, this.y + this.h, 8, 10);
    }

    // Charge glow
    if (this.chargeTimer > 0) {
      const cProg = Math.min(1, this.chargeTimer / this.CHARGE_HOLD);
      ctx.save();
      ctx.globalAlpha = 0.5 + cProg * 0.4;
      ctx.shadowBlur  = 16 + cProg * 20;
      ctx.shadowColor = cProg >= 1 ? '#ffffff' : '#ff8c00';
      ctx.strokeStyle = cProg >= 1 ? '#ffffff' : '#ffcc00';
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
      ctx.restore();
    }

    ctx.restore();

    // Sword arc
    this._drawSwordArc(ctx);
  }

  _drawSwordArc(ctx) {
    if (this.swingTimer <= 0) return;
    const prog    = 1 - this.swingTimer / (this.swingCharged ? this.SWING_DUR * 1.6 : this.SWING_DUR);
    const right   = this.swingFacingRight;
    const charged = this.swingCharged;
    const cx      = right ? this.x + this.w : this.x;
    const cy      = this.cy;
    const radius  = charged ? 78 : 54;

    ctx.save();
    ctx.shadowBlur  = charged ? 22 : 10;
    ctx.shadowColor = charged ? '#ffffff' : '#00eeff';
    ctx.strokeStyle = charged ? '#ffffa0' : '#00eeff';
    ctx.lineWidth   = charged ? 3.5 : 2.5;
    ctx.globalAlpha = Math.max(0, 1 - prog * 1.3);

    const startAngle = right ? -Math.PI * 0.55 : Math.PI * 1.55;
    const endAngle   = right ? Math.PI * 0.55  : Math.PI * 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();
    ctx.restore();
  }
}
