/* ============================================================
   LUMEN'S LANTERN — Entities
   Crystal, Ember, Lantern, ShadowCreature, Mirror, Particle
   ============================================================ */

// ── Particle ─────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, color, radius, life) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.radius = radius;
    this.life = life;           // seconds
    this.maxLife = life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vy += 60 * dt;         // gentle gravity
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx, camX) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = this.radius * 3;
    ctx.shadowColor = this.color;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x - camX, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Crystal ──────────────────────────────────────────────────
class Crystal {
  constructor(x, y, color = '#a0f0ff') {
    this.x = x; this.y = y;
    this.w = 18; this.h = 24;
    this.color = color;
    this.collected = false;
    this.bob = Math.random() * Math.PI * 2;   // phase offset
    this.sparkTimer = 0;
    this.particles = [];
  }

  update(dt, particles) {
    if (this.collected) return;
    this.bob += dt * 2.5;
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) {
      this.sparkTimer = 0.6 + Math.random() * 0.4;
      // tiny sparkle
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * 30;
        particles.push(new Particle(
          this.x, this.y - 8,
          Math.cos(angle) * speed, Math.sin(angle) * speed - 30,
          this.color, 2, 0.7
        ));
      }
    }
  }

  draw(ctx, camX, time) {
    if (this.collected) return;
    const sx = this.x - camX;
    const sy = this.y + Math.sin(this.bob) * 4;

    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = this.color;

    // Draw diamond shape
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(sx,             sy - this.h / 2);
    ctx.lineTo(sx + this.w/2,  sy);
    ctx.lineTo(sx,             sy + this.h / 2);
    ctx.lineTo(sx - this.w/2,  sy);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sx,             sy - this.h / 2);
    ctx.lineTo(sx + this.w/4,  sy - this.h / 6);
    ctx.lineTo(sx,             sy);
    ctx.lineTo(sx - this.w/4,  sy - this.h / 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  getBounds() {
    return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h };
  }
}

// ── Ember ─────────────────────────────────────────────────────
class Ember {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 20; this.h = 20;
    this.collected = false;
    this.bob = Math.random() * Math.PI * 2;
    this.flicker = 0;
    this.flickerVal = 1;
  }

  update(dt) {
    if (this.collected) return;
    this.bob    += dt * 2.0;
    this.flicker += dt * 8;
    this.flickerVal = 0.85 + Math.sin(this.flicker) * 0.15;
  }

  draw(ctx, camX) {
    if (this.collected) return;
    const sx = this.x - camX;
    const sy = this.y + Math.sin(this.bob) * 5;
    const r  = (this.w / 2) * this.flickerVal;

    ctx.save();
    ctx.shadowBlur  = 24;
    ctx.shadowColor = '#ff8830';

    // Outer glow
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 1.8);
    grad.addColorStop(0,   'rgba(255,200,60,0.9)');
    grad.addColorStop(0.4, 'rgba(255,120,20,0.7)');
    grad.addColorStop(1,   'rgba(255,60,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Core flame teardrop
    ctx.fillStyle = '#ffe060';
    ctx.shadowColor = '#ffcc30';
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 1.4);
    ctx.bezierCurveTo(sx + r, sy - r, sx + r, sy + r * 0.4, sx, sy + r * 0.7);
    ctx.bezierCurveTo(sx - r, sy + r * 0.4, sx - r, sy - r, sx, sy - r * 1.4);
    ctx.fill();

    ctx.restore();
  }

  getBounds() {
    return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h };
  }
}

// ── Lantern ───────────────────────────────────────────────────
class Lantern {
  constructor(x, y, isGoal = true) {
    this.x = x; this.y = y;
    this.w = 30; this.h = 46;
    this.lit    = false;
    this.isGoal = isGoal;
    this.glowPulse = 0;
    this.activated = false;   // set true externally to trigger light-up
  }

  update(dt) {
    if (this.lit) {
      this.glowPulse += dt * 3;
    }
  }

  draw(ctx, camX) {
    const sx = this.x - camX;
    const sy = this.y;

    ctx.save();

    if (this.lit) {
      const pulse = 0.8 + Math.sin(this.glowPulse) * 0.2;
      ctx.shadowBlur  = 40 * pulse;
      ctx.shadowColor = '#ffd060';

      // Warm glow halo
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 55 * pulse);
      grad.addColorStop(0,   'rgba(255,220,80,0.28)');
      grad.addColorStop(1,   'rgba(255,160,30,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, 55 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hanging wire
    ctx.strokeStyle = '#8a7a60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy - this.h / 2);
    ctx.lineTo(sx, sy - this.h / 2 - 14);
    ctx.stroke();

    // Lantern body
    const bodyColor = this.lit ? '#ffd86e' : '#3a3050';
    ctx.fillStyle = bodyColor;
    ctx.shadowBlur  = this.lit ? 20 : 4;
    ctx.shadowColor = this.lit ? '#ffaa20' : '#000';

    // Rounded-rect lantern body
    _roundRect(ctx, sx - this.w/2, sy - this.h/2, this.w, this.h * 0.72, 5);
    ctx.fill();

    // Top cap
    ctx.fillStyle = '#6a5a40';
    ctx.shadowBlur = 0;
    _roundRect(ctx, sx - this.w/2 - 2, sy - this.h/2 - 6, this.w + 4, 10, 3);
    ctx.fill();

    // Bottom cap
    ctx.fillStyle = '#6a5a40';
    _roundRect(ctx, sx - this.w/2 - 2, sy + this.h * 0.72/2 - this.h/2 - 2, this.w + 4, 8, 3);
    ctx.fill();

    // Glass panels (cross)
    ctx.strokeStyle = this.lit ? 'rgba(255,240,180,0.35)' : 'rgba(80,70,100,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy - this.h/2);
    ctx.lineTo(sx, sy + this.h * 0.72/2 - this.h/2);
    ctx.moveTo(sx - this.w/2, sy - this.h/2 + this.h * 0.36);
    ctx.lineTo(sx + this.w/2, sy - this.h/2 + this.h * 0.36);
    ctx.stroke();

    // Inner glow when lit
    if (this.lit) {
      ctx.globalAlpha = 0.5 + Math.sin(this.glowPulse) * 0.15;
      ctx.fillStyle = '#fffbe0';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(sx, sy - this.h/2 + this.h * 0.36, this.w/4, this.h/6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  light() {
    this.lit = true;
  }

  getBounds() {
    return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h };
  }
}

// ── Mirror ────────────────────────────────────────────────────
class Mirror {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 28; this.h = 10;    // stand on top of platform
    this.activated = false;
    this.pulse = 0;
  }

  update(dt) {
    if (this.activated) this.pulse += dt * 4;
  }

  draw(ctx, camX) {
    const sx = this.x - camX;
    const sy = this.y;

    ctx.save();

    if (this.activated) {
      ctx.shadowBlur  = 20;
      ctx.shadowColor = '#80ddff';
    }

    // Stand / base
    ctx.fillStyle = '#6a7a8a';
    ctx.fillRect(sx - 3, sy - 28, 6, 28);

    // Mirror surface
    const mirrorColor = this.activated ? '#c0f8ff' : '#8898aa';
    ctx.fillStyle = mirrorColor;
    ctx.strokeStyle = this.activated ? '#80eeff' : '#aabbcc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - this.w/2, sy - 28);
    ctx.lineTo(sx + this.w/2, sy - 28);
    ctx.lineTo(sx + this.w/2 - 4, sy - 28 - 30);
    ctx.lineTo(sx - this.w/2 + 4, sy - 28 - 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Reflection sheen when active
    if (this.activated) {
      ctx.globalAlpha = 0.4 + Math.sin(this.pulse) * 0.2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx - this.w/2 + 6, sy - 28);
      ctx.lineTo(sx - this.w/2 + 10, sy - 28);
      ctx.lineTo(sx - this.w/2 + 6, sy - 28 - 30);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  getBounds() {
    return { x: this.x - this.w/2, y: this.y - 58, w: this.w, h: 58 };
  }
}

// ── Shadow Creature ───────────────────────────────────────────
class ShadowCreature {
  constructor(x, y, patrolLeft, patrolRight) {
    this.x = x; this.y = y;
    this.w = 28; this.h = 22;
    this.patrolLeft  = patrolLeft;
    this.patrolRight = patrolRight;
    this.vx   = -60;    // speed, negative = left
    this.wobble = 0;
    this.tentTimer = 0;
    this.tentPhases = [0, 1, 2, 3].map(i => i * Math.PI / 2);
  }

  update(dt) {
    this.x += this.vx * dt;
    if (this.x <= this.patrolLeft)  { this.x = this.patrolLeft;  this.vx =  60; }
    if (this.x >= this.patrolRight) { this.x = this.patrolRight; this.vx = -60; }

    this.wobble     += dt * 3;
    this.tentTimer  += dt * 5;
    this.tentPhases = this.tentPhases.map(p => p + dt * 4);
  }

  draw(ctx, camX) {
    const sx = this.x - camX;
    const sy = this.y + Math.sin(this.wobble) * 3;

    ctx.save();
    ctx.shadowBlur  = 22;
    ctx.shadowColor = '#5a00aa';

    // Wispy tentacles underneath
    ctx.strokeStyle = 'rgba(80,0,160,0.55)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const tx  = sx - 10 + i * 7;
      const len = 8 + Math.sin(this.tentPhases[i]) * 5;
      ctx.beginPath();
      ctx.moveTo(tx, sy + this.h / 2 - 2);
      ctx.lineTo(tx + Math.sin(this.tentPhases[i]) * 3, sy + this.h / 2 + len);
      ctx.stroke();
    }

    // Body
    const grad = ctx.createRadialGradient(sx, sy, 2, sx, sy, this.w * 0.7);
    grad.addColorStop(0,   'rgba(80, 0, 160, 0.95)');
    grad.addColorStop(0.6, 'rgba(30, 0, 80,  0.9)');
    grad.addColorStop(1,   'rgba(8,  0, 20,  0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'rgba(200,160,255,0.9)';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#cc88ff';
    [-6, 6].forEach(ex => {
      ctx.beginPath();
      ctx.ellipse(sx + ex, sy - 3, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Pupils
    ctx.fillStyle = '#1a0030';
    ctx.shadowBlur = 0;
    const dir = this.vx < 0 ? -1 : 1;
    [-6, 6].forEach(ex => {
      ctx.beginPath();
      ctx.ellipse(sx + ex + dir * 1, sy - 3, 1.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  getBounds() {
    return { x: this.x - this.w/2 + 4, y: this.y - this.h/2, w: this.w - 8, h: this.h - 4 };
  }
}

// ── Light Beam (visual connector between activated mirrors) ───
class LightBeam {
  constructor(points) {
    this.points = points;  // array of {x, y} world coords
    this.alpha  = 0;
    this.pulse  = 0;
  }

  update(dt, activatedCount, totalCount) {
    const target = totalCount > 0 ? activatedCount / totalCount : 0;
    this.alpha += (target - this.alpha) * dt * 2;
    this.pulse += dt * 3;
  }

  draw(ctx, camX, activatedCount) {
    if (activatedCount === 0 || this.alpha < 0.02) return;
    ctx.save();
    ctx.globalAlpha = this.alpha * (0.7 + Math.sin(this.pulse) * 0.15);
    ctx.strokeStyle = '#80eeff';
    ctx.lineWidth   = 3 + Math.sin(this.pulse) * 1;
    ctx.shadowBlur  = 20;
    ctx.shadowColor = '#40ccff';
    ctx.lineCap     = 'round';
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = -this.pulse * 10;

    const pts = this.points.slice(0, activatedCount + 1);

    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x - camX, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x - camX, pts[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Helper ────────────────────────────────────────────────────
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

// ── AABB overlap ──────────────────────────────────────────────
function aabbOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}
