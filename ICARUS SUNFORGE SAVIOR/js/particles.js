// ============================================================
//  PARTICLE SYSTEM
// ============================================================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Generic emitter
  emit(config) {
    const {
      x, y,
      count    = 6,
      color    = '#ff8c00',
      color2   = null,
      vxRange  = [-2, 2],
      vyRange  = [-4, -1],
      life     = 0.5,
      lifeVar  = 0.2,
      size     = 4,
      sizeEnd  = 0,
      gravity  = 300,
      fade     = true,
      glow     = false,
      shape    = 'rect',  // 'rect' | 'circle'
    } = config;

    for (let i = 0; i < count; i++) {
      const l = life + (Math.random() - 0.5) * lifeVar;
      this.particles.push({
        x, y,
        vx: vxRange[0] + Math.random() * (vxRange[1] - vxRange[0]),
        vy: vyRange[0] + Math.random() * (vyRange[1] - vyRange[0]),
        life: l, maxLife: l,
        color: (color2 && Math.random() > 0.5) ? color2 : color,
        size, sizeEnd, gravity, fade, glow, shape
      });
    }
  }

  // Pre-built effects
  impact(x, y)      { this.emit({ x, y, count: 8, color: '#ffdd44', color2: '#ff8c00', vyRange: [-4, -1], vxRange: [-3, 3], size: 5, sizeEnd: 1, gravity: 250, glow: true }); }
  swordSlash(x, y, dir) {
    this.emit({ x, y, count: 10, color: '#ff9900', color2: '#ffeeaa', vyRange: [-5, -2], vxRange: [dir * 1, dir * 5], size: 6, sizeEnd: 0, gravity: 150, glow: true, life: 0.35 });
  }
  explosion(x, y, scale = 1) {
    this.emit({ x, y, count: Math.round(16 * scale), color: '#ff8c00', color2: '#ffff44', vyRange: [-7 * scale, 2 * scale], vxRange: [-6 * scale, 6 * scale], size: 7 * scale, sizeEnd: 0, gravity: 200, glow: true, life: 0.6 });
    this.emit({ x, y, count: Math.round(8 * scale),  color: '#ffffff', vyRange: [-5 * scale, 1 * scale], vxRange: [-4 * scale, 4 * scale], size: 3 * scale, sizeEnd: 0, gravity: 200, glow: false, life: 0.2 });
  }
  blood(x, y)       { this.emit({ x, y, count: 6, color: '#ff4444', color2: '#aa0000', vyRange: [-5, 0], vxRange: [-4, 4], size: 4, sizeEnd: 1, gravity: 400 }); }
  spark(x, y)       { this.emit({ x, y, count: 5, color: '#88ddff', color2: '#ffffff', vyRange: [-6, -2], vxRange: [-3, 3], size: 3, sizeEnd: 0, gravity: 350, life: 0.3 }); }
  land(x, y)        { this.emit({ x, y, count: 6, color: '#446688', color2: '#88aacc', vyRange: [-3, 0], vxRange: [-4, 4], size: 3, sizeEnd: 0, gravity: 400, life: 0.25 }); }
  energyTrail(x, y, col = '#ff8c00') {
    this.emit({ x, y, count: 2, color: col, vyRange: [-1, 0.5], vxRange: [-1, 1], size: 4, sizeEnd: 0, gravity: 0, life: 0.2, fade: true });
  }
  bossLaser(x, y)   { this.emit({ x, y, count: 8, color: '#ff4400', color2: '#ffaa00', vyRange: [-3, 3], vxRange: [-3, 3], size: 4, sizeEnd: 0, gravity: 0, life: 0.25, glow: true }); }
  plasma(x, y)      { this.emit({ x, y, count: 4, color: '#ff6600', color2: '#ffcc00', vyRange: [-2, -0.5], vxRange: [-1.5, 1.5], size: 5, sizeEnd: 2, gravity: -30, life: 0.8, glow: true }); }

  update(dt) {
    const dtS = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x  += p.vx * dtS * 60;
      p.y  += p.vy * dtS * 60;
      p.vy += p.gravity * dtS;
      p.life -= dtS;
      if (p.life <= 0) { this.particles.splice(i, 1); }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const t     = p.life / p.maxLife;
      const alpha = p.fade ? t : 1;
      const size  = p.sizeEnd + (p.size - p.sizeEnd) * t;
      if (size <= 0) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.glow) {
        ctx.shadowBlur  = size * 3;
        ctx.shadowColor = p.color;
      }
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(
          Math.round(p.x - size * 0.5),
          Math.round(p.y - size * 0.5),
          Math.round(size), Math.round(size)
        );
      }
      ctx.restore();
    }
  }

  clear() { this.particles = []; }
}
