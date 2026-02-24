// ============================================================
//  ENTITIES  –  Platform, Projectile, Hazard, Pickup
// ============================================================

// ── AABB collision helper ─────────────────────────────────
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── PLATFORM ─────────────────────────────────────────────
class Platform {
  constructor(x, y, w, h, type = 'solid', opts = {}) {
    this.x    = x;
    this.y    = y;
    this.w    = w;
    this.h    = h;
    this.type = type; // 'solid' | 'pass' | 'collapsing' | 'moving' | 'conveyor' | 'hazard' | 'laser'

    // Moving platform
    this.moveAxis   = opts.moveAxis   || 'x';       // 'x' | 'y'
    this.moveRange  = opts.moveRange  || 100;
    this.moveSpeed  = opts.moveSpeed  || 60;
    this.baseX      = x;
    this.baseY      = y;
    this.moveDir    = 1;

    // Conveyor
    this.conveyorDir   = opts.conveyorDir   || 1;   // 1 = right, -1 = left
    this.conveyorSpeed = opts.conveyorSpeed || 120;

    // Collapsing
    this.collapseTimer  = opts.collapseTimer || 1.2; // seconds before collapse
    this.collapseTime   = this.collapseTimer;
    this.collapsing     = false;
    this.collapsed      = false;
    this.respawnTimer   = 0;

    // Laser hazard
    this.laserOn       = opts.laserOn !== undefined ? opts.laserOn : true;
    this.laserCycle    = opts.laserCycle    || 2;   // seconds per on/off
    this.laserTimer    = opts.laserOffset   || 0;

    // Visual
    this.section = opts.section || 0;   // 0-3 for theming
    this.glowTimer = 0;
    this.deltaX = 0;   // how much the platform moved this frame (for carrying player)
    this.deltaY = 0;
  }

  update(dt) {
    const dtS = dt / 1000;
    this.deltaX = 0;
    this.deltaY = 0;
    this.glowTimer = (this.glowTimer + dtS) % 2;

    if (this.type === 'moving') {
      const prev = this.moveAxis === 'x' ? this.x : this.y;
      const dist = this.moveSpeed * dtS * this.moveDir;
      if (this.moveAxis === 'x') {
        this.x += dist;
        if (this.x > this.baseX + this.moveRange) { this.x = this.baseX + this.moveRange; this.moveDir = -1; }
        if (this.x < this.baseX)                  { this.x = this.baseX;                  this.moveDir =  1; }
        this.deltaX = this.x - (this.moveAxis === 'x' ? prev : this.x);
      } else {
        this.y += dist;
        if (this.y > this.baseY + this.moveRange) { this.y = this.baseY + this.moveRange; this.moveDir = -1; }
        if (this.y < this.baseY)                  { this.y = this.baseY;                  this.moveDir =  1; }
        this.deltaY = this.y - prev;
      }
    }

    if (this.type === 'collapsing') {
      if (this.collapsing && !this.collapsed) {
        this.collapseTime -= dtS;
        if (this.collapseTime <= 0) {
          this.collapsed = true;
          this.respawnTimer = 4;
        }
      }
      if (this.collapsed) {
        this.respawnTimer -= dtS;
        if (this.respawnTimer <= 0) {
          this.collapsed    = false;
          this.collapsing   = false;
          this.collapseTime = this.collapseTimer;
        }
      }
    }

    if (this.type === 'laser') {
      this.laserTimer += dtS;
      if (this.laserTimer > this.laserCycle) this.laserTimer -= this.laserCycle;
      this.laserOn = this.laserTimer < this.laserCycle * 0.5;
    }
  }

  triggerCollapse() {
    if (this.type === 'collapsing' && !this.collapsing && !this.collapsed) {
      this.collapsing = true;
    }
  }

  // Is this platform currently solid?
  isSolid() {
    if (this.type === 'collapsing' && this.collapsed) return false;
    if (this.type === 'laser')     return false; // laser = hazard strip, not solid
    return true;
  }

  draw(ctx) {
    if (this.type === 'collapsing' && this.collapsed) return;

    const glow = Math.sin(this.glowTimer * Math.PI) * 0.5 + 0.5;
    const THEME = PLATFORM_THEMES[this.section] || PLATFORM_THEMES[0];

    // Blink warning for collapsing
    if (this.type === 'collapsing' && this.collapsing) {
      const blink = this.collapseTime < 0.4 ? Math.floor(this.collapseTime * 20) % 2 : 1;
      if (!blink) return;
    }

    if (this.type === 'hazard') {
      ctx.fillStyle = '#cc2200';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = '#ff5500';
      for (let i = 0; i < this.w; i += 8) {
        ctx.fillRect(this.x + i, this.y, 4, 2);
      }
      return;
    }

    if (this.type === 'laser') {
      if (!this.laserOn) {
        // Draw inactive emitter hints
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x, this.y, this.w, this.h);
      } else {
        ctx.save();
        ctx.fillStyle = `rgba(255,80,0,${0.7 + glow * 0.3})`;
        ctx.shadowBlur  = 12;
        ctx.shadowColor = '#ff4400';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.restore();
      }
      return;
    }

    // Main platform body
    ctx.fillStyle = THEME.fill;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Top edge highlight
    ctx.fillStyle = THEME.top;
    ctx.fillRect(this.x, this.y, this.w, 3);

    // Side shading
    ctx.fillStyle = THEME.side;
    ctx.fillRect(this.x, this.y + 3, 2, this.h - 3);
    ctx.fillRect(this.x + this.w - 2, this.y + 3, 2, this.h - 3);

    // Energy seam glow
    if (THEME.seam) {
      ctx.save();
      ctx.fillStyle = `rgba(${THEME.seamRGB},${0.4 + glow * 0.4})`;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = `rgb(${THEME.seamRGB})`;
      ctx.fillRect(this.x + 4, this.y + 1, this.w - 8, 1);
      ctx.restore();
    }

    // Conveyor belt arrows
    if (this.type === 'conveyor') {
      ctx.fillStyle = THEME.top;
      const arrowSpacing = 24;
      const offset = (Date.now() * 0.05 * this.conveyorDir) % arrowSpacing;
      for (let ox = -arrowSpacing; ox < this.w + arrowSpacing; ox += arrowSpacing) {
        const ax = this.x + ox + offset;
        if (ax < this.x - 8 || ax > this.x + this.w) continue;
        ctx.save();
        ctx.translate(ax + 4, this.y + this.h * 0.5);
        if (this.conveyorDir < 0) ctx.scale(-1, 1);
        ctx.fillStyle = '#88aaff';
        ctx.fillRect(0, -2, 6, 4);
        ctx.fillRect(4, -4, 4, 8);
        ctx.restore();
      }
    }
  }
}

// ── Per-section visual themes ────────────────────────────
const PLATFORM_THEMES = [
  // Section 0 – Outer Ramparts
  { fill: '#2a3a4e', top: '#4a6a8e', side: '#1a2a3a', seam: true, seamRGB: '100,180,255' },
  // Section 1 – Energy Layer
  { fill: '#2e2a1a', top: '#6a5e2a', side: '#1a1808', seam: true, seamRGB: '255,200,60' },
  // Section 2 – Core Shaft
  { fill: '#1a1a2e', top: '#3a3a5e', side: '#0a0a1e', seam: true, seamRGB: '80,80,255' },
  // Section 3 – Sunforge Core
  { fill: '#3a1a0a', top: '#7a3a0a', side: '#1a0a00', seam: true, seamRGB: '255,120,20' },
];

// ── PROJECTILE ───────────────────────────────────────────
class Projectile {
  constructor(x, y, vx, vy, owner, damage, color = '#ffdd00', size = 5) {
    this.x      = x;
    this.y      = y;
    this.vx     = vx;
    this.vy     = vy;
    this.owner  = owner;   // 'player' | 'enemy' | 'boss'
    this.damage = damage;
    this.color  = color;
    this.size   = size;
    this.alive  = true;
    this.age    = 0;
    this.maxAge = 2500;    // ms
    this.w      = size;
    this.h      = size;
    this.piercing = false;
    this.trail  = [];      // last N positions for trail effect
  }

  update(dt) {
    const dtS = dt / 1000;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();

    this.x += this.vx * dtS;
    this.y += this.vy * dtS;
    this.age += dt;
    if (this.age >= this.maxAge) this.alive = false;
  }

  hit() {
    this.alive = false;
  }

  get cx() { return this.x + this.w * 0.5; }
  get cy() { return this.y + this.h * 0.5; }

  draw(ctx) {
    if (!this.alive) return;
    // Glow trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.trail.length;
      ctx.save();
      ctx.globalAlpha = t * 0.4;
      ctx.fillStyle = this.color;
      ctx.fillRect(
        Math.round(this.trail[i].x - this.size * 0.4),
        Math.round(this.trail[i].y - this.size * 0.4),
        Math.round(this.size * 0.8), Math.round(this.size * 0.8)
      );
      ctx.restore();
    }
    // Core
    ctx.save();
    ctx.shadowBlur  = this.size * 3;
    ctx.shadowColor = this.color;
    ctx.fillStyle   = '#ffffff';
    ctx.fillRect(
      Math.round(this.x - this.size * 0.5),
      Math.round(this.y - this.size * 0.4),
      Math.round(this.size), Math.round(this.size * 0.8)
    );
    ctx.fillStyle = this.color;
    ctx.fillRect(
      Math.round(this.x - this.size * 0.3),
      Math.round(this.y - this.size * 0.3),
      Math.round(this.size * 0.6), Math.round(this.size * 0.6)
    );
    ctx.restore();
  }
}

// ── BOSS LASER BEAM ──────────────────────────────────────
class LaserBeam {
  constructor(x, y, angle, length, damage, owner = 'boss') {
    this.x       = x;
    this.y       = y;
    this.angle   = angle;
    this.length  = length;
    this.damage  = damage;
    this.owner   = owner;
    this.alive   = true;
    this.age     = 0;
    this.duration = 1800; // ms
    this.width   = 8;
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.duration) this.alive = false;
  }

  get endX() { return this.x + Math.cos(this.angle) * this.length; }
  get endY() { return this.y + Math.sin(this.angle) * this.length; }

  // Point-to-segment distance check for collision
  hitsRect(rx, ry, rw, rh) {
    // Sample points along beam
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = this.x + Math.cos(this.angle) * this.length * t;
      const py = this.y + Math.sin(this.angle) * this.length * t;
      if (px > rx && px < rx + rw && py > ry && py < ry + rh) return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.alive) return;
    const t = this.age / this.duration;
    const alpha = 1 - t * 0.3;
    const pulse = Math.sin(this.age * 0.02) * 0.3 + 0.7;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    // Outer glow
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.endX, this.endY);
    ctx.strokeStyle = '#ff4400';
    ctx.lineWidth   = this.width * 3 * pulse;
    ctx.shadowBlur  = 20;
    ctx.shadowColor = '#ff4400';
    ctx.globalAlpha = alpha * 0.3;
    ctx.stroke();
    // Core
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.endX, this.endY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = this.width * 0.5;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#ffaa00';
    ctx.globalAlpha = alpha;
    ctx.stroke();
    ctx.restore();
  }
}

// ── HEALTH PICKUP ─────────────────────────────────────────
class HealthPickup {
  constructor(x, y, amount = 30) {
    this.x      = x;
    this.y      = y;
    this.w      = 14;
    this.h      = 14;
    this.amount = amount;
    this.alive  = true;
    this.age    = 0;
    this.bobOffset = Math.random() * Math.PI * 2;
  }

  update(dt) { this.age += dt / 1000; }

  draw(ctx) {
    if (!this.alive) return;
    const bob = Math.sin(this.age * 3 + this.bobOffset) * 3;
    const glow = Math.sin(this.age * 4) * 0.3 + 0.7;

    ctx.save();
    ctx.shadowBlur  = 12;
    ctx.shadowColor = '#44ff88';
    // Outer ring
    ctx.strokeStyle = `rgba(68,255,136,${glow})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(this.x + this.w * 0.5, this.y + this.h * 0.5 + bob, 9, 0, Math.PI * 2);
    ctx.stroke();
    // Cross
    ctx.fillStyle = `rgba(68,255,136,${glow})`;
    ctx.fillRect(this.x + 5,  this.y + 2 + bob, 4, 10);
    ctx.fillRect(this.x + 2,  this.y + 5 + bob, 10, 4);
    ctx.restore();
  }
}

// ── ABILITY PICKUP (Double Jump) ──────────────────────────
class AbilityPickup {
  constructor(x, y, type = 'double_jump') {
    this.x    = x;
    this.y    = y;
    this.w    = 16;
    this.h    = 16;
    this.type = type;
    this.alive = true;
    this.age   = 0;
  }
  update(dt) { this.age += dt / 1000; }
  draw(ctx) {
    if (!this.alive) return;
    const bob = Math.sin(this.age * 2) * 4;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ccff';
    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.arc(this.x + 8, this.y + 8 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText('DJ', this.x + 2, this.y + 11 + bob);
    ctx.restore();
  }
}

// ── ENERGY PICKUP (refills sword charge) ──────────────────
class EnergyPickup {
  constructor(x, y, amount = 50) {
    this.x      = x;
    this.y      = y;
    this.w      = 12;
    this.h      = 12;
    this.amount = amount;
    this.alive  = true;
    this.age    = 0;
  }

  update(dt) { this.age += dt / 1000; }

  draw(ctx) {
    if (!this.alive) return;
    const bob = Math.sin(this.age * 3.5) * 3;
    const glow = Math.sin(this.age * 5) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#ff8c00';
    ctx.fillStyle   = `rgba(255,140,0,${glow})`;
    // Diamond shape
    const cx = this.x + 6, cy = this.y + 6 + bob;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.restore();
  }
}
