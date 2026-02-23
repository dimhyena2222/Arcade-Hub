/* ============================================================
   LUMEN'S LANTERN — Player (Lumen the Light Sprite)
   ============================================================ */

class Player {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.reset();
  }

  reset() {
    this.x  = this.startX;
    this.y  = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.w  = 20;
    this.h  = 26;

    this.onGround  = false;
    this.jumpsLeft = 2;       // double-jump
    this.facing    = 1;       // 1 = right, -1 = left

    this.glowCharges = 3;
    this.invincible  = 0;     // invincibility timer (seconds)
    this.stunTimer   = 0;

    this.trail       = [];    // light trail particles
    this.orbPulse    = 0;
    this.stepPulse   = 0;
    this.dead        = false;

    this.breathe     = 0;
  }

  // ── Input ──────────────────────────────────────────────────
  applyInput(keys, dt) {
    if (this.stunTimer > 0) return;

    const SPEED = 200;
    const ACCEL = 900;
    const FRIC  = 700;

    const left  = keys['ArrowLeft']  || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];

    if (left)  {
      this.vx = Math.max(this.vx - ACCEL * dt, -SPEED);
      this.facing = -1;
    } else if (right) {
      this.vx = Math.min(this.vx + ACCEL * dt,  SPEED);
      this.facing = 1;
    } else {
      // Friction
      if (this.vx > 0) this.vx = Math.max(0, this.vx - FRIC * dt);
      else              this.vx = Math.min(0, this.vx + FRIC * dt);
    }
  }

  jump() {
    if (this.jumpsLeft > 0 && this.stunTimer <= 0) {
      this.vy = -530;
      this.jumpsLeft--;
      this.onGround = false;
      AudioManager.playSFX('jump');
    }
  }

  // ── Physics & Collision ────────────────────────────────────
  update(dt, platforms, worldWidth) {
    if (this.stunTimer > 0) this.stunTimer -= dt;
    if (this.invincible > 0) this.invincible -= dt;

    const GRAVITY  = 1300;
    const MAX_FALL = 900;

    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);

    // Move X
    this.x += this.vx * dt;
    this.x  = Math.max(0, Math.min(worldWidth - this.w, this.x));

    // Platform collision X
    this._resolveX(platforms);

    // Move Y
    const prevY    = this.y;
    this.onGround  = false;
    this.y        += this.vy * dt;

    // Platform collision Y
    this._resolveY(platforms, prevY);

    // Update trail
    this.trail.push({ x: this.x + this.w/2, y: this.y + this.h/2, age: 0 });
    if (this.trail.length > 20) this.trail.shift();
    this.trail.forEach(t => t.age += dt * 4);

    this.orbPulse  += dt * 4;
    this.breathe   += dt * 2.5;
    this.stepPulse += Math.abs(this.vx) * dt * 0.04;

    // Fall into pit?
    if (this.y > 700) this.takeDamage(3);  // instant death from fall
  }

  _resolveX(platforms) {
    const pb = this.getBounds();
    for (const p of platforms) {
      if (!aabbOverlap(pb, p)) continue;
      const overlapLeft  = (pb.x + pb.w) - p.x;
      const overlapRight = (p.x + p.w) - pb.x;
      if (overlapLeft < overlapRight) {
        this.x -= overlapLeft;
        this.vx = 0;
      } else {
        this.x += overlapRight;
        this.vx = 0;
      }
    }
  }

  _resolveY(platforms, prevY) {
    const pb = this.getBounds();
    for (const p of platforms) {
      if (!aabbOverlap(pb, p)) continue;
      const prevBottom = prevY + this.h;
      const prevTop    = prevY;

      if (this.vy > 0 && prevBottom <= p.y + 4) {
        // Land on top
        this.y        = p.y - this.h;
        this.vy       = 0;
        this.onGround = true;
        this.jumpsLeft = 2;
      } else if (this.vy < 0 && prevTop >= p.y + p.h - 4) {
        // Bonk head
        this.y  = p.y + p.h;
        this.vy = 0;
      }
    }
  }

  // ── Damage ────────────────────────────────────────────────
  takeDamage(amount = 1) {
    if (this.invincible > 0) return false;
    this.glowCharges -= amount;
    this.invincible  = 1.8;
    this.stunTimer   = 0.25;
    this.vx *= -0.5;
    this.vy  = -320;
    AudioManager.playSFX('hit');
    if (this.glowCharges <= 0) {
      this.glowCharges = 0;
      this.dead = true;
    }
    return true;
  }

  // ── Getters ───────────────────────────────────────────────
  getBounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  getCenterX() { return this.x + this.w / 2; }
  getCenterY() { return this.y + this.h / 2; }

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
      const alpha = Math.max(0, (1 - t.age / 1) * 0.35 * (i / this.trail.length));
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#ffe080';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ffaa20';
      const r = (2 + (i / this.trail.length) * 4);
      ctx.beginPath();
      ctx.arc(t.x - camX, t.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Outer glow halo
    const pulse = 0.85 + Math.sin(this.orbPulse) * 0.15;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32 * pulse);
    grad.addColorStop(0,   'rgba(255, 240, 120, 0.35)');
    grad.addColorStop(0.5, 'rgba(255, 200, 60,  0.15)');
    grad.addColorStop(1,   'rgba(255, 140, 20,  0)');
    ctx.fillStyle  = grad;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, 32 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Body sprite – gentle teardrop / orb shape
    const breaBottom = 1 + Math.sin(this.breathe) * 0.04;
    ctx.shadowBlur  = 18;
    ctx.shadowColor = '#ffcc40';

    // Wing-like wisps
    const wingPhase = Math.sin(this.stepPulse * 2) * 0.3;
    ctx.fillStyle = 'rgba(255,240,160,0.22)';
    ctx.shadowBlur = 0;
    // Left wing
    ctx.beginPath();
    ctx.ellipse(cx - 10 + wingPhase * 6, cy + 2, 10, 5, -0.4 - wingPhase * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.ellipse(cx + 10 - wingPhase * 6, cy + 2, 10, 5, 0.4 + wingPhase * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Core body
    ctx.shadowBlur  = 16;
    ctx.shadowColor = '#ffcc40';
    const bodyGrad = ctx.createRadialGradient(cx - 2, cy - 4, 1, cx, cy, 12 * breaBottom);
    bodyGrad.addColorStop(0,   '#fffbe0');
    bodyGrad.addColorStop(0.5, '#ffd060');
    bodyGrad.addColorStop(1,   '#ff9820');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 11, 13 * breaBottom, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(60,20,0,0.7)';
    const eyeOff = this.facing * 2;
    ctx.beginPath();
    ctx.ellipse(cx + eyeOff + 3, cy - 2, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + eyeOff - 3, cy - 2, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Little smile
    ctx.strokeStyle = 'rgba(60,20,0,0.5)';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx + eyeOff, cy + 2, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
  }
}
