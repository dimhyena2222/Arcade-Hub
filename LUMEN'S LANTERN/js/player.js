/* ============================================================
   LUMEN'S LANTERN — Player (Lumen the Light Sprite)
   Movement: glide left/right, hold Up/Space to float upward,
   gentle gravity pulls back down. No jumping gaps — pure flow.
   ============================================================ */

class Player {
  constructor(x, groundY) {
    this.startX       = x;
    this.startGroundY = groundY;
    this.reset();
  }

  reset() {
    this.x  = this.startX;
    this.y  = this.startGroundY - 30;
    this.vx = 0;
    this.vy = 0;
    this.w  = 20;
    this.h  = 26;

    this.onGround    = false;
    this.floating    = false;   // true while Up/Space held
    this.facing      = 1;       // 1=right, -1=left

    this.glowCharges = 3;
    this.invincible  = 0;
    this.stunTimer   = 0;

    this.abilities   = { doubleJump: false, vineSwing: false };
    this.airJumped   = false;   // has double-float been used this air session?
    this.prevUp      = false;   // edge-detect for double-float trigger

    this.trail       = [];
    this.orbPulse    = 0;
    this.stepPulse   = 0;
    this.wingTimer   = 0;       // animates wings while floating
    this.breathe     = 0;
    this.dead        = false;
  }

  // ── Input ──────────────────────────────────────────────────
  applyInput(keys, dt) {
    if (this.stunTimer > 0) return;

    const SPEED = 175;
    const ACCEL = 680;
    const FRIC  = 520;

    const left  = keys['ArrowLeft']  || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];
    const up    = keys['ArrowUp']    || keys['KeyW'] || keys['Space'];
    const down  = keys['ArrowDown']  || keys['KeyS'];

    // Horizontal
    if (left) {
      this.vx = Math.max(this.vx - ACCEL * dt, -SPEED);
      this.facing = -1;
    } else if (right) {
      this.vx = Math.min(this.vx + ACCEL * dt,  SPEED);
      this.facing = 1;
    } else {
      if (this.vx > 0) this.vx = Math.max(0, this.vx - FRIC * dt);
      else             this.vx = Math.min(0, this.vx + FRIC * dt);
    }

    // Double-float burst: tap ↑ while falling (edge-detect, once per air session)
    const upJustPressed = up && !this.prevUp;
    if (upJustPressed && !this.onGround && this.vy > 40 && this.abilities.doubleJump && !this.airJumped) {
      this.vy = -255;
      this.airJumped = true;
      this.wingTimer = 3.0;   // big wing flap
      AudioManager.playSFX('collect');
    }

    // Float upward — continuous while held
    this.floating = up && !this.onGround;
    if (up) {
      const liftForce = this.onGround ? 900 : 650;
      this.vy = Math.max(this.vy - liftForce * dt, -270);
      this.wingTimer += dt * 7;
      this.onGround = false;
    }
    this.prevUp = up;

    // Gentle nudge down if held
    if (down && !this.onGround) {
      this.vy = Math.min(this.vy + 420 * dt, 240);
    }
  }

  // ── Physics & Terrain Collision ────────────────────────────
  //   getGroundY(x) = terrain surface y at world-x
  update(dt, getGroundY, worldWidth) {
    if (this.stunTimer > 0) this.stunTimer -= dt;
    if (this.invincible > 0) this.invincible -= dt;

    // Gravity — softer while floating (wings fighting it)
    const GRAVITY  = this.floating ? 110 : 290;
    const MAX_FALL = 310;
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);

    // Move X
    this.x += this.vx * dt;
    this.x  = Math.max(0, Math.min(worldWidth - this.w, this.x));

    // Move Y
    this.y += this.vy * dt;

    // Terrain floor collision
    const gY    = getGroundY(this.getCenterX());
    const feetY = this.y + this.h;
    if (feetY >= gY) {
      this.y        = gY - this.h;
      this.vy       = 0;
      this.onGround = true;
      this.airJumped = false;   // reset double-float on landing
    } else {
      this.onGround = false;
    }

    // Hard ceiling (sky)
    if (this.y < 20) {
      this.y  = 20;
      this.vy = Math.max(0, this.vy);
    }

    // Wing animation decays when not floating
    if (!this.floating) this.wingTimer = Math.max(0, this.wingTimer - dt * 5);

    // Trail
    this.trail.push({ x: this.getCenterX(), y: this.getCenterY(), age: 0 });
    if (this.trail.length > 26) this.trail.shift();
    this.trail.forEach(t => t.age += dt * 3.5);

    this.orbPulse  += dt * 4;
    this.breathe   += dt * 2.5;
    this.stepPulse += Math.abs(this.vx) * dt * 0.04;
  }

  // ── Damage ────────────────────────────────────────────────
  takeDamage(amount = 1) {
    if (this.invincible > 0) return false;
    this.glowCharges -= amount;
    this.invincible  = 1.8;
    this.stunTimer   = 0.28;
    this.vx *= -0.4;
    this.vy  = -200;
    AudioManager.playSFX('hit');
    if (this.glowCharges <= 0) {
      this.glowCharges = 0;
      this.dead = true;
    }
    return true;
  }

  getBounds()   { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  getCenterX()  { return this.x + this.w / 2; }
  getCenterY()  { return this.y + this.h / 2; }

  // ── Draw ──────────────────────────────────────────────────
  draw(ctx, camX) {
    const cx = this.getCenterX() - camX;
    const cy = this.getCenterY();

    ctx.save();

    // Blink when invincible
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) {
      ctx.restore();
      return;
    }

    // Light trail
    this.trail.forEach((t, i) => {
      const pct   = i / this.trail.length;
      const alpha = Math.max(0, (1 - t.age) * 0.32 * pct);
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#ffe880';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#ffaa20';
      ctx.beginPath();
      ctx.arc(t.x - camX, t.y, 1.5 + pct * 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Outer glow halo
    const pulse = 0.85 + Math.sin(this.orbPulse) * 0.15;
    const grad  = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * pulse);
    grad.addColorStop(0,   'rgba(255,240,120,0.42)');
    grad.addColorStop(0.5, 'rgba(255,200,60,0.18)');
    grad.addColorStop(1,   'rgba(255,140,20,0)');
    ctx.fillStyle = grad;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Wings — wider & more active when floating
    const wStrength = 0.25 + (this.wingTimer > 0 ? Math.min(this.wingTimer / 1.5, 1) * 0.75 : 0);
    const wPhase    = Math.sin(this.wingTimer * 1.0 + this.stepPulse * 1.8);
    const wAlpha    = 0.18 + wStrength * 0.25;
    const wSpread   = 10 + wStrength * 6;

    ctx.shadowBlur = 0;
    ctx.fillStyle  = `rgba(255,248,180,${wAlpha})`;
    // Left wing
    ctx.beginPath();
    ctx.ellipse(cx - wSpread + wPhase * 6, cy + 1, 12 + wStrength * 4, 5 + wStrength * 2,
      -0.38 - wPhase * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.ellipse(cx + wSpread - wPhase * 6, cy + 1, 12 + wStrength * 4, 5 + wStrength * 2,
       0.38 + wPhase * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Core body
    ctx.shadowBlur  = 16;
    ctx.shadowColor = '#ffcc40';
    const bs = 1 + Math.sin(this.breathe) * 0.04;
    const bg = ctx.createRadialGradient(cx - 2, cy - 4, 1, cx, cy, 12);
    bg.addColorStop(0,   '#fffbe0');
    bg.addColorStop(0.5, '#ffd060');
    bg.addColorStop(1,   '#ff9820');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 11, 13 * bs, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(60,20,0,0.7)';
    const eo = this.facing * 2;
    ctx.beginPath(); ctx.ellipse(cx + eo + 3, cy - 2, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + eo - 3, cy - 2, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,20,0,0.5)';
    ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx + eo, cy + 2, 3, 0.2, Math.PI - 0.2); ctx.stroke();

    ctx.restore();
  }
}