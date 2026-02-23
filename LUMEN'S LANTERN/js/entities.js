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

// ── Coin ──────────────────────────────────────────────────────
class Coin {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 14; this.h = 14;
    this.collected = false;
    this.bob  = Math.random() * Math.PI * 2;
    this.spin = Math.random() * Math.PI * 2;
    this.glow = Math.random() * Math.PI * 2;
  }
  update(dt) {
    if (this.collected) return;
    this.bob  += dt * 3.2;
    this.spin += dt * 4.5;
    this.glow += dt * 2;
  }
  draw(ctx, camX) {
    if (this.collected) return;
    const sx = this.x - camX;
    const sy = this.y + Math.sin(this.bob) * 4;
    const sq = Math.max(0.1, Math.abs(Math.cos(this.spin)));
    ctx.save();
    ctx.shadowBlur = 10 + Math.sin(this.glow) * 4; ctx.shadowColor = '#ffd040';
    const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
    gr.addColorStop(0, '#fff8a0'); gr.addColorStop(0.5, '#ffd040'); gr.addColorStop(1, '#cc8800');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(sx, sy, sq * 7, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (sq > 0.4) {
      ctx.globalAlpha = 0.5 * sq; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(sx - sq*2, sy - 2.5, sq*2, 2, -0.3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  getBounds() { return { x: this.x - this.w/2, y: this.y - this.h/2, w: this.w, h: this.h }; }
}

// ── Pipe / Root Portal ────────────────────────────────────────
class Pipe {
  constructor(x, groundY, type, zoneId) {
    this.x = x; this.groundY = groundY;
    this.type   = type   || 'pipe';
    this.zoneId = zoneId || 0;
    this.w = 36; this.h = 46;
    this.pulse  = Math.random() * Math.PI * 2;
    this.isExit = false;
  }
  update(dt) { this.pulse += dt * 2.2; }
  draw(ctx, camX) {
    const sx = this.x - camX, sy = this.groundY;
    ctx.save();
    if (this.type === 'pipe') {
      ctx.shadowBlur = 12 + Math.sin(this.pulse)*4; ctx.shadowColor = '#50ff30';
      ctx.fillStyle = '#1a5a20'; ctx.fillRect(sx-14, sy-this.h+12, 28, this.h-12);
      ctx.fillStyle = '#2a7a30'; ctx.fillRect(sx-12, sy-this.h+14, 24, this.h-14);
      _roundRect(ctx, sx-17, sy-this.h+4, 34, 14, 4); ctx.fillStyle = '#1a5a20'; ctx.fill();
      _roundRect(ctx, sx-15, sy-this.h+6, 30, 12, 3); ctx.fillStyle = '#3a8a38'; ctx.fill();
      ctx.fillStyle = '#60cc50'; ctx.fillRect(sx-13, sy-this.h+7, 4, 10);
      ctx.globalAlpha = 0.25 + Math.sin(this.pulse*2.2)*0.2; ctx.fillStyle = '#80ff60';
      ctx.beginPath(); ctx.ellipse(sx, sy-this.h+12, 13, 4, 0, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.shadowBlur = 14 + Math.sin(this.pulse)*5; ctx.shadowColor = '#90ff50';
      ctx.strokeStyle = '#2d5018'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx-17, sy); ctx.bezierCurveTo(sx-22, sy-24, sx-8, sy-44, sx, sy-48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx+17, sy); ctx.bezierCurveTo(sx+22, sy-24, sx+8, sy-44, sx, sy-48); ctx.stroke();
      ctx.globalAlpha = 0.5 + Math.sin(this.pulse*1.5)*0.2;
      const rg = ctx.createRadialGradient(sx, sy-28, 2, sx, sy-28, 18);
      rg.addColorStop(0, 'rgba(140,255,60,0.9)'); rg.addColorStop(1, 'rgba(40,100,20,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(sx, sy-28, 14, 20, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 0.55 + Math.sin(this.pulse)*0.2;
    ctx.fillStyle = '#bbffaa'; ctx.shadowBlur = 4; ctx.shadowColor = '#60ff30';
    ctx.font = 'bold 9px Quicksand, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(this.isExit ? '↓ Exit' : '↓ Enter', sx, sy - this.h - 5);
    ctx.restore();
  }
  getBounds() { return { x: this.x-this.w/2, y: this.groundY-this.h, w: this.w, h: this.h }; }
}

// ── Vine Anchor ───────────────────────────────────────────────
class VineAnchor {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.pulse = Math.random() * Math.PI * 2;
    this.swing = 0;
  }
  update(dt) { this.pulse += dt * 2.5; this.swing = Math.sin(this.pulse * 0.55) * 0.2; }
  draw(ctx, camX) {
    const sx = this.x - camX, sy = this.y;
    ctx.save();
    ctx.shadowBlur = 10 + Math.sin(this.pulse)*4; ctx.shadowColor = '#70ff40';
    const eX = sx + Math.sin(this.swing)*16, eY = sy + 45;
    ctx.strokeStyle = '#2d6018'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx+Math.sin(this.swing)*14, sy+25, eX, eY); ctx.stroke();
    ctx.globalAlpha = 0.85 + Math.sin(this.pulse)*0.12; ctx.fillStyle = '#60d030';
    ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#b0ff70';
    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  getBounds() { return { x: this.x-40, y: this.y-10, w: 80, h: 70 }; }
}

// ── Glintwick NPC ─────────────────────────────────────────────
class GlintwickNPC {
  constructor(x, groundY) {
    this.x = x; this.groundY = groundY;
    this.bob = 0; this.wingPhase = 0; this.glowPulse = 0;
  }
  update(dt) { this.bob += dt*1.8; this.wingPhase += dt*9; this.glowPulse += dt*3; }
  draw(ctx, camX, near) {
    const sx = this.x - camX;
    const by = this.groundY - 22 + Math.sin(this.bob) * 5;
    ctx.save();
    const gr = ctx.createRadialGradient(sx, by, 0, sx, by, near ? 48 : 30);
    gr.addColorStop(0, 'rgba(100,255,60,0.28)'); gr.addColorStop(1, 'rgba(60,200,30,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, by, near ? 48 : 30, 0, Math.PI*2); ctx.fill();
    const wa = 0.35 + Math.abs(Math.sin(this.wingPhase)) * 0.55;
    ctx.globalAlpha = wa; ctx.fillStyle = 'rgba(150,255,100,0.65)';
    ctx.beginPath(); ctx.ellipse(sx-12, by-3, 9, 5, -0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx+12, by-3, 9, 5,  0.4, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 14; ctx.shadowColor = '#88ff40';
    const bg = ctx.createRadialGradient(sx, by, 0, sx, by, 9);
    bg.addColorStop(0,'#e0ff50'); bg.addColorStop(0.5,'#78d818'); bg.addColorStop(1,'#1e4c08');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(sx, by, 7, 9, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#101808';
    ctx.beginPath(); ctx.ellipse(sx-2.5, by-4, 2, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx+2.5, by-4, 2, 2, 0, 0, Math.PI*2); ctx.fill();
    // lantern post
    ctx.fillStyle = '#3a2810'; ctx.fillRect(sx+18, by-8, 5, this.groundY-by+8);
    _roundRect(ctx, sx+12, by-26, 18, 18, 3); ctx.fillStyle = '#5a4820'; ctx.fill();
    ctx.fillStyle = 'rgba(255,210,70,0.75)'; ctx.shadowBlur = 12; ctx.shadowColor = '#ffcc40';
    ctx.beginPath(); ctx.arc(sx+21, by-17, 5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    if (near) {
      ctx.globalAlpha = 0.82 + Math.sin(this.glowPulse)*0.14;
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      _roundRect(ctx, sx-38, by-32, 76, 16, 5); ctx.fill();
      ctx.fillStyle = '#c0ff80'; ctx.shadowBlur = 5; ctx.shadowColor = '#80ff40';
      ctx.font = 'bold 9px Quicksand, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Glintwick  •  ↑ Shop', sx, by-20); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
  getBounds() { return { x: this.x-15, y: this.groundY-50, w: 30, h: 50 }; }
}

// ── Shadow Bramble ────────────────────────────────────────────
class ShadowBramble {
  constructor(x, groundY, w) {
    this.x = x; this.groundY = groundY;
    this.w = w || 100; this.h = 65;
    this.dead = false; this.dissolveTimer = -1;
    this.pulse = Math.random() * Math.PI * 2;
    this.tangle = Array.from({length:16}, () => ({
      x1:(Math.random()-0.5)*(w||100), y1:-Math.random()*65,
      x2:(Math.random()-0.5)*(w||100), y2:-Math.random()*65,
      t: Math.random()*Math.PI*2
    }));
  }
  update(dt) {
    this.pulse += dt*2; this.tangle.forEach(l => l.t += dt*1.4);
    if (this.dissolveTimer >= 0) { this.dissolveTimer -= dt; if (this.dissolveTimer <= 0) this.dead = true; }
  }
  dissolve() { if (this.dissolveTimer < 0) this.dissolveTimer = 1.5; }
  draw(ctx, camX) {
    if (this.dead) return;
    const sx = this.x - camX, sy = this.groundY;
    const a = this.dissolveTimer >= 0 ? Math.max(0, this.dissolveTimer/1.5) : 1;
    ctx.save(); ctx.globalAlpha = a * 0.88;
    ctx.fillStyle = 'rgba(40,0,60,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy, this.w*0.48, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#380058'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.shadowBlur = 8; ctx.shadowColor = '#5800a0';
    this.tangle.forEach(l => {
      const ox = Math.sin(l.t)*2, oy = Math.cos(l.t*0.7)*2;
      ctx.beginPath(); ctx.moveTo(sx+l.x1+ox, sy+l.y1+oy); ctx.lineTo(sx+l.x2-ox, sy+l.y2-oy); ctx.stroke();
    });
    ctx.fillStyle = '#520088'; ctx.shadowBlur = 12; ctx.shadowColor = '#8800cc';
    for (let i = 0; i < 6; i++) {
      const bx = sx+(i/5-0.5)*this.w, bh = 12+Math.sin(this.pulse+i)*4;
      ctx.beginPath(); ctx.moveTo(bx,sy); ctx.lineTo(bx+5,sy-8-bh); ctx.lineTo(bx-5,sy-8-bh); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  getBounds() {
    if (this.dead) return {x:0,y:0,w:0,h:0};
    return { x:this.x-this.w/2, y:this.groundY-this.h, w:this.w, h:this.h };
  }
}

// ── Solara (Trapped Sprite — rescue target) ───────────────────
class Solara {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 20; this.h = 26;
    this.freed = false; this.bob = Math.random()*Math.PI*2;
    this.pulse = Math.random()*Math.PI*2; this.wingTimer = 0; this.flyOff = 0;
  }
  update(dt) {
    this.bob   += dt * (this.freed ? 3.8 : 1.3);
    this.pulse += dt * 2.2;
    if (this.freed) { this.wingTimer = Math.min(this.wingTimer+dt, 2); this.flyOff = Math.min(this.flyOff+dt*28, 70); }
  }
  free() { this.freed = true; }
  draw(ctx, camX) {
    const sx = this.x - camX;
    const sy = this.y + Math.sin(this.bob)*(this.freed?6:2) - this.flyOff;
    ctx.save();
    if (!this.freed) {
      ctx.strokeStyle = 'rgba(55,0,75,0.5)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = (i/4)*Math.PI*2 + this.pulse*0.3;
        ctx.beginPath(); ctx.moveTo(sx+Math.cos(a)*16, sy+Math.sin(a)*16); ctx.lineTo(sx+Math.cos(a)*8, sy+Math.sin(a)*8); ctx.stroke();
      }
    } else {
      const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 36);
      rg.addColorStop(0,'rgba(190,215,255,0.38)'); rg.addColorStop(1,'rgba(80,120,255,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx,sy,36,0,Math.PI*2); ctx.fill();
    }
    const ws = this.freed ? Math.min(this.wingTimer/1.5,1) : 0, wp = Math.sin(this.wingTimer);
    ctx.fillStyle = `rgba(180,210,255,${0.12+ws*0.3})`;
    ctx.beginPath(); ctx.ellipse(sx-10-ws*4, sy, 10+ws*3, 4+ws*2, -0.3+wp*0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx+10+ws*4, sy, 10+ws*3, 4+ws*2,  0.3-wp*0.3, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = this.freed?18:8; ctx.shadowColor = '#8098ff';
    const bg = ctx.createRadialGradient(sx,sy,0,sx,sy,11);
    bg.addColorStop(0,this.freed?'#e0ecff':'#b0c0e8');
    bg.addColorStop(0.5,this.freed?'#78a8ff':'#5878c0');
    bg.addColorStop(1,this.freed?'#1c38a8':'#182060');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(sx,sy,9,11,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(8,18,55,0.7)';
    ctx.beginPath(); ctx.ellipse(sx-3,sy-2,2,2,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx+3,sy-2,2,2,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(8,18,55,0.5)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath();
    if (this.freed) ctx.arc(sx,sy+1.5,3,0.2,Math.PI-0.2); else ctx.arc(sx,sy+3.5,3,Math.PI+0.3,-0.3);
    ctx.stroke(); ctx.restore();
  }
  getBounds() { return { x:this.x-this.w/2, y:this.y-this.h, w:this.w, h:this.h+10 }; }
}
