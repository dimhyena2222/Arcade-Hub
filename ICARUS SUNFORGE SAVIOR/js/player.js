// ============================================================
//  PLAYER  –  Icarus
//  White/blue armor, orange chest core, fractured wings
// ============================================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 20;
    this.h = 32;

    // Physics
    this.vx = 0;
    this.vy = 0;
    this.onGround    = false;
    this.wasOnGround = false;

    // Stats
    this.maxHp  = 120;
    this.hp     = this.maxHp;
    this.maxEnergy = 150;
    this.energy    = this.maxEnergy;
    this.regenDelay = 0;
    this.REGEN_DELAY_DUR = 500; // 0.5s delay before regen

    // Movement constants
    this.WALK_SPEED  = 220;
    this.JUMP_FORCE  = -480;
    this.GRAVITY     = 900;
    this.MAX_FALL    = 600;
    this.FRICTION    = 0.18;     // multiplied against vx per frame
    this.AIR_ACCEL   = 900;
    this.GROUND_ACCEL = 1400;

    // Dash
    this.canDash      = true;
    this.isDashing    = false;
    this.dashTimer    = 0;
    this.DASH_DUR     = 280;     // increased for longer range
    this.DASH_SPEED   = 600;     // faster
    this.DASH_COOLDOWN = 400;
    this.dashCooldown = 0;
    this.dashDir      = 1;

    // Dodge & Parry
    this.isDodging    = false;
    this.dodgeTimer   = 0;
    this.DODGE_DUR    = 400;
    this.isBlocking   = false;
    this.parryTimer   = 0;       // window for parry
    this.PARRY_WINDOW = 300;     // 0.3s
    this.stunnedEnemies = [];    // enemies to stun on parry (assigned by game)

    // Jet Boots
    this.jetActive    = false;
    this.JET_ACCEL    = -1100;

    // Direction
    this.facingRight = true;

    // Weapons
    this.cannonCooldown = 0;
    this.CANNON_CD      = 200;   // ms between shots
    this.swordTimer     = 0;
    this.swordActive    = false;
    this.SWORD_DUR      = 220;   // ms swing lasts
    this.swordCharge    = 0;
    this.SWORD_CHARGE_MAX = 700; // ms to full charge
    this.isCharging     = false;
    this.chargeSound    = false;

    // Sword swing ID – increments each time a new swing starts
    this.swingId = 0;

    // State
    this.state  = 'idle'; // 'idle'|'run'|'jump'|'fall'|'crouch'|'attack'|'dash'|'dodge'|'block'|'hurt'|'dead'
    this.anim   = 0;      // animation timer (ms)
    this.frame  = 0;

    // Hurt
    this.hurtTimer   = 0;
    this.HURT_DUR    = 700;
    this.invincible  = false;
    this.invTimer    = 0;
    this.INV_DUR     = 1500;     // ms after being hit

    // Visual
    this.wingAngle = 0;
    this.corePulse = 0;
    this.afterImages = [];
    this.footstepTimer = 0;

    // Passthrough platform
    this.dropThrough     = false;
    this.dropThroughTimer = 0;

    // Reference to game systems (set by Game)
    this.particles  = null;
    this.projectiles = null;

    // Alive
    this.alive = true;
    this.deathTimer = 0;

    this.coyoteTime  = 0;        // ms after walking off edge
    this.COYOTE_MAX  = 100;
    this.jumpBuffer  = 0;        // ms of pending jump input
    this.JUMP_BUFFER = 120;
    
    // Unlocks
    this.canDoubleJump = false; // Initially false
    this.jumpCount     = 0;
  }

  // ── Update ──────────────────────────────────────────────
  update(dt, platforms) {
    if (!this.alive) {
      this.deathTimer += dt;
      return;
    }
    const dtS = dt / 1000;

    this.anim += dt;
    this.corePulse = (this.corePulse + dtS * 3) % (Math.PI * 2);
    this.wingAngle = Math.sin(this.anim * 0.001) * 0.15;

    // Timers
    if (this.cannonCooldown > 0)  this.cannonCooldown -= dt;
    if (this.swordTimer    > 0)  { this.swordTimer -= dt; this.swordActive = this.swordTimer > 0; }
    if (this.hurtTimer     > 0)    this.hurtTimer  -= dt;
    if (this.invTimer      > 0) { this.invTimer -= dt; this.invincible = this.invTimer > 0; }
    if (this.dashCooldown  > 0)    this.dashCooldown -= dt;
    if (this.dodgeTimer     > 0)    this.dodgeTimer  -= dt;
    if (this.parryTimer     > 0)    this.parryTimer  -= dt;
    if (this.dropThroughTimer > 0) { this.dropThroughTimer -= dt; this.dropThrough = this.dropThroughTimer > 0; }
    if (this.jumpBuffer    > 0)    this.jumpBuffer -= dt;
    if (this.coyoteTime    > 0)    this.coyoteTime -= dt;

    // Reset parry / block states
    this.isDodging  = this.dodgeTimer > 0;
    this.isBlocking = Input.block() && !this.isDodging;

    // Energy recovery with delay
    if (this.regenDelay > 0) {
      this.regenDelay -= dt;
    } else {
      // Slower regen: 12/sec on ground, 4/sec in air
      const regenRate = (this.isDashing || this.jetActive || this.isDodging) ? 0 : (this.onGround ? 12 : 4);
      this.energy = Math.min(this.maxEnergy, this.energy + regenRate * dtS);
    }

    // Jet Boots
    this.jetActive = (Input.jump() && !this.onGround && this.vy > -100 && this.energy > 5);
    if (this.jetActive) {
      this.vy += this.JET_ACCEL * dtS;
      this.energy -= 45 * dtS; // drains quickly
      this.regenDelay = this.REGEN_DELAY_DUR;
      if (Math.random() < 0.4 && this.particles) this.particles.emit({
        x: this.x + (this.facingRight ? 4 : this.w - 4), y: this.y + this.h,
        count: 1, color: '#ffaa00', color2: '#ff4400',
        vxRange: [-2, 2], vyRange: [2, 5], size: 4, life: 0.3
      });
    }

    // Dodge Initiatons (Move + F)
    if (Input.dodge() && (Input.moveLeft() || Input.moveRight()) && !this.isDodging && this.energy >= 25) {
      this.isDodging = true;
      this.dodgeTimer = this.DODGE_DUR;
      this.energy -= 25;
      this.regenDelay = this.REGEN_DELAY_DUR; // Reset delay
      this.dashDir = Input.moveLeft() ? -1 : 1;
      this.parryTimer = this.PARRY_WINDOW; // Start parry window
      Audio.sfx.dash();
    }
    // Block (Just F)
    if (Input.dodge() && !(Input.moveLeft() || Input.moveRight()) && !this.isDodging) {
      this.parryTimer = this.PARRY_WINDOW; // Start parry window on block too
    }

    // Dash
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.vx = this.DASH_SPEED * this.dashDir;
      this.vy = 0;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.vx = this.DASH_SPEED * 0.4 * this.dashDir;
      }
      // After images during dash
      if (Math.floor(this.anim / 30) % 2 === 0) {
        this.afterImages.push({ x: this.x, y: this.y, life: 250 });
      }
    }

    // Dodge logic
    if (this.isDodging) {
      this.vx = (this.DASH_SPEED * 0.8) * this.dashDir;
      this.vy = 0;
      if (Math.floor(this.anim / 40) % 2 === 0) {
        this.afterImages.push({ x: this.x, y: this.y, life: 180 });
      }
    }

    // After image update
    for (let i = this.afterImages.length - 1; i >= 0; i--) {
      this.afterImages[i].life -= dt;
      if (this.afterImages[i].life <= 0) this.afterImages.splice(i, 1);
    }

    // Input: Dash ... (redoing)
    if (Input.dash() && !this.isDashing && this.dashCooldown <= 0 && this.energy >= 35) {
      this.isDashing    = true;
      this.dashTimer    = this.DASH_DUR;
      this.dashDir      = this.facingRight ? 1 : -1;
      this.dashCooldown = this.DASH_COOLDOWN;
      this.energy      -= 35; 
      if (this.particles) this.particles.emit({
        x: this.x + this.w * 0.5, y: this.y + this.h * 0.5,
        count: 8, color: '#88ccff', color2: '#ffffff',
        vxRange: [-this.dashDir * 6, -this.dashDir * 2], vyRange: [-2, 2],
        size: 5, sizeEnd: 0, gravity: 0, life: 0.25, glow: true
      });
      Audio.sfx.dash();
    }

    if (!this.isDashing && !this.isDodging) {
      this._handleMovement(dtS);
    }

    // Apply gravity
    if (!this.isDashing && !this.isDodging && !this.jetActive) {
      this.vy += this.GRAVITY * dtS;
      this.vy  = Math.min(this.vy, this.MAX_FALL);
    }

    // Variable jump height
    if (!Input.jump() && this.vy < -100 && !this.jetActive) {
      this.vy += this.GRAVITY * 1.2 * dtS;
    }

    // Move and collide
    this.x += this.vx * dtS;
    this._collideX(platforms);
    this.y += this.vy * dtS;
    this._collideY(platforms, dt);

    // World bounds
    if (this.x < 0)            { this.x = 0; this.vx = 0; }
    if (this.x + this.w > 16000) { this.x = 16000 - this.w; this.vx = 0; }

    // Coyote time
    if (this.wasOnGround && !this.onGround) {
      this.coyoteTime = this.COYOTE_MAX;
    }
    this.wasOnGround = this.onGround;
    if (this.onGround) this.jumpCount = 0; // Reset jumps

    // Jump with buffer
    if (Input.jumpJust()) this.jumpBuffer = this.JUMP_BUFFER;
    if (this.jumpBuffer > 0) {
      if (this.onGround || this.coyoteTime > 0) {
        this._doJump();
      } else if (this.canDoubleJump && this.jumpCount < 1) {
        this._doJump(true);
      }
    }

    // Drop through pass-through platforms
    if (Input.crouch() && this.onGround) {
      this.dropThrough      = true;
      this.dropThroughTimer = 200;
    }

    // Player left/right facing
    if (Input.moveLeft())  this.facingRight = false;
    if (Input.moveRight()) this.facingRight  = true;

    // Footstep sound
    if (this.onGround && Math.abs(this.vx) > 60) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        Audio.sfx.footstep();
        this.footstepTimer = 200;
        if (this.particles) this.particles.land(
          this.x + this.w * 0.5,
          this.y + this.h
        );
      }
    }

    // Determine state
    if (this.hurtTimer > 0)      this.state = 'hurt';
    else if (this.isDashing)     this.state = 'dash';
    else if (this.swordActive)   this.state = 'attack';
    else if (!this.onGround)     this.state = this.vy < 0 ? 'jump' : 'fall';
    else if (Input.crouch())     this.state = 'crouch';
    else if (Math.abs(this.vx) > 20) this.state = 'run';
    else                         this.state = 'idle';

    // Weapons
    this._handleWeapons(dt);
  }

  _doJump(isDouble = false) {
    this.vy         = isDouble ? this.JUMP_FORCE * 1.1 : this.JUMP_FORCE;
    this.onGround   = false;
    this.coyoteTime = 0;
    this.jumpBuffer = 0;
    this.jumpCount  = isDouble ? 2 : 1; 

    Audio.sfx.jump(); // Reuse jump sound
    const color = isDouble ? '#88ccff' : '#ffaa00';
    if (this.particles) this.particles.spark(
      this.x + this.w * 0.5, this.y + this.h, 10, color
    );
    );
  }

  _handleMovement(dtS) {
    const onGround = this.onGround;
    const accel    = onGround ? this.GROUND_ACCEL : this.AIR_ACCEL;
    const maxSpd   = Input.crouch() && onGround ? this.WALK_SPEED * 0.4 : this.WALK_SPEED;

    if (Input.moveLeft()) {
      this.vx = Math.max(this.vx - accel * dtS, -maxSpd);
    } else if (Input.moveRight()) {
      this.vx = Math.min(this.vx + accel * dtS,  maxSpd);
    } else {
      // Friction
      if (onGround) {
        this.vx *= Math.pow(this.FRICTION, dtS * 60);
        if (Math.abs(this.vx) < 2) this.vx = 0;
      } else {
        this.vx *= Math.pow(0.4, dtS * 60);
      }
    }
  }

  _collideX(platforms) {
    for (const p of platforms) {
      if (!p.isSolid()) continue;
      if (p.type === 'pass') continue;
      if (rectsOverlap(this.x, this.y + 2, this.w, this.h - 4, p.x, p.y, p.w, p.h)) {
        if (this.vx > 0) { this.x = p.x - this.w; }
        else              { this.x = p.x + p.w; }
        this.vx = 0;
      }
    }
  }

  _collideY(platforms, dt) {
    this.onGround = false;
    for (const p of platforms) {
      if (!p.isSolid()) continue;

      // Pass-through platforms: only land on top
      if (p.type === 'pass' || p.type === 'conveyor' || p.type === 'collapsing' || p.type === 'moving') {
        if (this.dropThrough) continue;
        if (this.vy >= 0 &&
            this.y + this.h > p.y &&
            this.y + this.h < p.y + p.h + 12 &&
            this.x + this.w > p.x + 2 &&
            this.x < p.x + p.w - 2) {
          const prevBottom = (this.y - this.vy * dt / 1000) + this.h;
          if (prevBottom <= p.y + 4) {
            this.y      = p.y - this.h;
            this.vy     = 0;
            this.onGround = true;
            // Carry with moving platform
            if (p.type === 'moving') { this.x += p.deltaX; this.y += p.deltaY; }
            // Conveyor
            if (p.type === 'conveyor') { this.vx += p.conveyorDir * p.conveyorSpeed * 0.04; }
            // Collapse trigger
            if (p.type === 'collapsing') p.triggerCollapse();
          }
        }
      } else if (p.type === 'solid') {
        if (rectsOverlap(this.x + 1, this.y, this.w - 2, this.h, p.x, p.y, p.w, p.h)) {
          if (this.vy > 0) {
            this.y      = p.y - this.h;
            this.vy     = 0;
            this.onGround = true;
          } else if (this.vy < 0) {
            this.y  = p.y + p.h;
            this.vy = 0;
          }
        }
      }
    }
    // All landing cases: play land sound once
    if (this.onGround && !this.wasOnGround) {
      Audio.sfx.land();
    }
  }

  _handleWeapons(dt) {
    const dtS = dt / 1000;

    // Hand Cannon
    if ((Input.cannon() || Input.cannonJust()) && this.cannonCooldown <= 0 && !this.swordActive && !this.isDodging && this.energy >= 8) {
      this._fireCannon();
      this.energy -= 8;
    }

    // Laser Sword: hold to charge, release to fire
    if (Input.sword() && !this.isDodging) {
      if (!this.isCharging) {
        this.isCharging = true;
        this.swordCharge = 0;
        this.chargeSound = false;
      }
      this.swordCharge += dt;
      if (this.swordCharge >= 300 && !this.chargeSound) {
        Audio.sfx.swordCharge();
        this.chargeSound = true;
      }
      // Charge particles
      if (this.particles && Math.random() < 0.3) {
        const cx = this.x + (this.facingRight ? this.w + 4 : -4);
        const cy = this.y + this.h * 0.35;
        this.particles.energyTrail(cx, cy, '#ff8c00');
      }
    } else if (this.isCharging) {
      const isCharged = this.swordCharge >= this.SWORD_CHARGE_MAX;
      const cost = isCharged ? 35 : 12;
      if (this.energy >= cost) {
        this._swingSword(isCharged);
        this.energy -= cost;
      }
      this.isCharging   = false;
      this.swordCharge  = 0;
      this.chargeSound  = false;
    }
  }

  _fireCannon() {
    const dir = this.facingRight ? 1 : -1;
    const ox  = this.facingRight ? this.w + 2 : -8;
    const p   = new Projectile(
      this.x + ox,
      this.y + 10,
      dir * 700, 0,
      'player', 12,
      '#ffdd44'
    );
    p.size = 5;
    this.projectiles.push(p);
    this.cannonCooldown = this.CANNON_CD;
    Audio.sfx.shoot();
    if (this.particles) this.particles.emit({
      x: this.x + ox + 4, y: this.y + 11,
      count: 3, color: '#ffee88', color2: '#ffffff',
      vxRange: [dir * 2, dir * 5], vyRange: [-1.5, 1.5],
      size: 4, sizeEnd: 0, gravity: 0, life: 0.15, glow: true
    });
  }

  _swingSword(charged) {
    this.swordTimer  = this.SWORD_DUR;
    this.swordActive = true;
    this.swingId++;  // new swing ID so each enemy is only hit once per swing
    if (charged) {
      Audio.sfx.swordChargeFire();
    } else {
      Audio.sfx.sword();
    }
    if (this.particles) {
      const cx = this.x + (this.facingRight ? this.w + 8 : -8);
      const cy = this.y + this.h * 0.35;
      this.particles.swordSlash(cx, cy, this.facingRight ? 1 : -1);
    }
  }

  // ── Sword Hitbox ─────────────────────────────────────────
  getSwordHitbox() {
    if (!this.swordActive) return null;
    const dir = this.facingRight ? 1 : -1;
    const wide = this.swordCharge >= this.SWORD_CHARGE_MAX;
    const w = wide ? 52 : 38;
    const h = wide ? 34 : 26;
    return {
      x: this.facingRight ? this.x + this.w : this.x - w,
      y: this.y + 2,
      w, h,
      damage: wide ? 40 : 22
    };
  }

  // ── Take Damage ──────────────────────────────────────────
  takeDamage(amount) {
    if (this.invincible || !this.alive || this.isDodging) return false;

    // Parry Check (0.3s window)
    if (this.parryTimer > 0) {
      this.parryTimer = 0;
      this.invTimer = 800; // brief invincibility
      this.invincible = true;
      Audio.sfx.swordChargeFire(); // use a "ping" sound
      if (this.particles) this.particles.spark(this.x + this.w * 0.5, this.y + this.h * 0.5, '#ffffff');
      return "parry";
    }

    // Blocking reduces damage
    if (this.isBlocking) {
      amount = Math.ceil(amount * 0.25);
      if (this.particles) this.particles.spark(this.x + this.w * 0.5, this.y + this.h * 0.5, '#88ccff');
      Audio.sfx.land();
    }

    this.hp        -= amount;
    this.hurtTimer  = this.HURT_DUR;
    this.invincible = true;
    this.invTimer   = this.INV_DUR;
    Audio.sfx.playerHit();
    if (this.particles) this.particles.explosion(
      this.x + this.w * 0.5, this.y + this.h * 0.5, 0.8
    );

    if (this.hp <= 0) {
      this.hp    = 0;
      this.alive = false;
      Audio.sfx.enemyDie();
    }
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  // ── Draw Icarus ──────────────────────────────────────────
  draw(ctx) {
    // After images (dash)
    for (const ai of this.afterImages) {
      ctx.save();
      ctx.globalAlpha = (ai.life / 180) * 0.35;
      this._drawSprite(ctx, ai.x, ai.y, '#88ccff');
      ctx.restore();
    }

    // Hurt blink
    if (this.invincible && Math.floor(this.invTimer / 80) % 2 === 0) return;

    ctx.save();
    this._drawSprite(ctx, this.x, this.y);
    ctx.restore();

    // Charge glow
    if (this.isCharging && this.swordCharge > 200) {
      const t = Math.min(1, this.swordCharge / this.SWORD_CHARGE_MAX);
      const cx = this.x + (this.facingRight ? this.w + 4 : -4);
      const cy = this.y + this.h * 0.35;
      ctx.save();
      ctx.shadowBlur  = 20 * t;
      ctx.shadowColor = '#ff8c00';
      ctx.fillStyle   = `rgba(255,140,0,${t * 0.7})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Blocking Shield Visual
    if (this.isBlocking) {
      const cx = this.x + this.w * 0.5 + (this.facingRight ? 12 : -12);
      const cy = this.y + this.h * 0.5;
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ccff';
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 + Math.random()*0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, (this.facingRight ? -0.8 : 2.4), (this.facingRight ? 0.8 : 4.0));
      ctx.stroke();
      // Shield fill
      ctx.fillStyle = `rgba(0, 100, 200, 0.15)`;
      ctx.fill();
      ctx.restore();
    }

    // Sword arc
    if (this.swordActive) {
      this._drawSwordArc(ctx);
    }
  }

  _drawSprite(ctx, px, py, override = null) {
    const t = this.anim * 0.001;
    const dir = this.facingRight ? 1 : -1;
    const cx = px + this.w * 0.5;

    // ── WING FRAGMENTS (behind body) ─────────────────────
    ctx.save();
    ctx.translate(cx, py + 8);
    ctx.scale(dir, 1);
    ctx.strokeStyle = override || '#3a4a6a';
    ctx.lineWidth = 2;
    // Left wing shard
    ctx.save();
    ctx.rotate(-0.4 + this.wingAngle);
    ctx.strokeStyle = override || '#6a8aaa';
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-14, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-10, -6);  ctx.stroke();
    ctx.restore();
    // Right wing shard (other side)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.rotate(-0.3 - this.wingAngle * 0.7);
    ctx.strokeStyle = override || '#4a6a8a';
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-10, -7);  ctx.stroke();
    ctx.restore();
    ctx.restore();

    // ── LEGS ─────────────────────────────────────────────
    let legL = 0, legR = 0;
    if (this.state === 'run') {
      legL = Math.sin(t * 12) * 0.4;
      legR = -legL;
    } else if (this.state === 'jump') {
      legL = 0.3; legR = -0.1;
    } else if (this.state === 'fall') {
      legL = 0.4; legR = 0.2;
    } else if (this.state === 'crouch') {
      legL = 0.6; legR = 0.6;
    }
    // Left leg
    ctx.save();
    ctx.translate(cx - 4, py + 22);
    ctx.rotate(legL);
    ctx.fillStyle = override || '#2a3a5a';
    ctx.fillRect(-3, 0, 6, 10);
    // Boot
    ctx.fillStyle = override || '#1a2a4a';
    ctx.fillRect(-4, 8, 7, 4);
    ctx.restore();
    // Right leg
    ctx.save();
    ctx.translate(cx + 4, py + 22);
    ctx.rotate(legR);
    ctx.fillStyle = override || '#2a3a5a';
    ctx.fillRect(-3, 0, 6, 10);
    ctx.fillStyle = override || '#1a2a4a';
    ctx.fillRect(-3, 8, 7, 4);
    ctx.restore();

    // ── BODY ─────────────────────────────────────────────
    // Torso (deep blue)
    ctx.fillStyle = override || '#1e2e4a';
    ctx.fillRect(cx - 8, py + 10, 16, 14);

    // Chest armor plate (lighter)
    ctx.fillStyle = override || '#3a5a8a';
    ctx.fillRect(cx - 6, py + 10, 12, 8);

    // Chest core glow
    const cp = Math.sin(this.corePulse) * 0.4 + 0.6;
    if (!override) {
      ctx.save();
      ctx.shadowBlur  = 12;
      ctx.shadowColor = '#ff8c00';
      ctx.fillStyle   = `rgb(${Math.round(200 + 55 * cp)},${Math.round(80 + 40 * cp)},0)`;
      ctx.fillRect(cx - 3, py + 13, 6, 5);
      ctx.restore();
    }

    // Shoulder pads
    ctx.fillStyle = override || '#4a6a9a';
    ctx.fillRect(cx - 10, py + 10, 4, 6);
    ctx.fillRect(cx + 6,  py + 10, 4, 6);

    // ── ARM (cannon side) ────────────────────────────────
    let armAngle = 0;
    if (this.state === 'attack') armAngle = -0.3;
    if (this.cannonCooldown > this.CANNON_CD * 0.6) armAngle = 0.2;

    ctx.save();
    ctx.translate(cx + dir * 6, py + 13);
    ctx.rotate(armAngle);
    ctx.fillStyle = override || '#2a4a7a';
    ctx.fillRect(0, -3, dir * 14, 6);
    // Cannon barrel
    ctx.fillStyle = override || '#1a2a4a';
    ctx.fillRect(dir * 10, -2, dir * 8, 4);
    // Cannon tip glow
    if (!override && this.cannonCooldown > 0) {
      const gf = this.cannonCooldown / this.CANNON_CD;
      ctx.save();
      ctx.shadowBlur = 8; ctx.shadowColor = '#ffdd44';
      ctx.fillStyle  = `rgba(255,220,68,${gf})`;
      ctx.fillRect(dir * 17, -2, dir * 2, 4);
      ctx.restore();
    }
    ctx.restore();

    // ── HEAD ─────────────────────────────────────────────
    const headBob = this.state === 'run' ? Math.sin(t * 12) * 1.5 : 0;
    const hy = py + headBob;
    // Helmet
    ctx.fillStyle = override || '#1e2e4a';
    ctx.fillRect(cx - 7, hy, 14, 12);
    // Visor
    if (!override) {
      const vp = Math.sin(this.corePulse * 1.3) * 0.2 + 0.8;
      ctx.save();
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ff8c00';
      ctx.fillStyle   = `rgb(${Math.round(200 + 55 * vp)},${Math.round(80 + 40 * vp)},0)`;
      ctx.fillRect(cx - 5, hy + 3, 10, 4);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff8c00';
      ctx.fillRect(cx - 5, hy + 3, 10, 4);
    }
    // Helmet ridge
    ctx.fillStyle = override || '#4a6a9a';
    ctx.fillRect(cx - 7, hy, 14, 2);
    ctx.fillRect(cx - 3, hy - 2, 6, 3);

    // ── CROUCH  (compress body) ───────────────────────────
    if (this.state === 'crouch') {
      ctx.fillStyle = override || '#1e2e4a';
      ctx.fillRect(cx - 8, py + 16, 16, 8);
    }
  }

  _drawSwordArc(ctx) {
    const dir  = this.facingRight ? 1 : -1;
    const t    = 1 - this.swordTimer / this.SWORD_DUR;
    const cx   = this.x + (this.facingRight ? this.w + 4 : 0);
    const cy   = this.y + this.h * 0.35;
    const len  = this.isCharging ? 44 : 32;
    const startAngle = dir === 1 ? -Math.PI * 0.6  : Math.PI * 0.6 - 0.5;
    const sweep      = dir === 1 ?  Math.PI * 1.1   : -Math.PI * 1.1;
    const angle = startAngle + sweep * t;

    ctx.save();
    ctx.translate(cx, cy);

    // Arc trail
    for (let i = 0; i < 6; i++) {
      const at = i / 6;
      const ao = startAngle + sweep * (t - at * 0.4);
      ctx.save();
      ctx.globalAlpha = (1 - at) * (1 - t + 0.2) * 0.8;
      ctx.strokeStyle    = i < 3 ? '#ffdd88' : '#ff8c00';
      ctx.lineWidth      = (6 - i) * (this.isCharging ? 1.6 : 1);
      ctx.shadowBlur     = 12;
      ctx.shadowColor    = '#ff8c00';
      ctx.beginPath();
      ctx.arc(0, 0, len, ao, ao + sweep * 0.12 * dir);
      ctx.stroke();
      ctx.restore();
    }

    // Blade tip
    ctx.fillStyle   = '#ffffff';
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#ffdd44';
    ctx.fillRect(
      Math.cos(angle) * len - 3,
      Math.sin(angle) * len - 3,
      6, 6
    );
    ctx.restore();
  }
}
