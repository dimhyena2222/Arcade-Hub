// ============================================================
//  LEVEL DATA  –  4 Sections, continuous vertical descent
//  World: 800 × 6400 px  |  Camera scrolls vertically
// ============================================================

const WORLD_W = 800;
const WORLD_H = 6400;

// ── Section Y boundaries ────────────────────────────────────
const SECTION_Y = [0, 1600, 3200, 4800, 6400];

// ────────────────────────────────────────────────────────────
//  buildLevel()  – returns { platforms, enemyDefs, pickupDefs }
// ────────────────────────────────────────────────────────────
function buildLevel() {
  const platforms = [];
  const enemyDefs = [];   // { type, x, y }
  const pickupDefs= [];   // { type, x, y }

  // Helper – solid platform
  const S = (x, y, w, h = 16, sec = 0) =>
    new Platform(x, y, w, h, 'solid', { section: sec });
  // Passthrough
  const P = (x, y, w, sec = 0) =>
    new Platform(x, y, w, 12, 'pass', { section: sec });
  // Moving
  const M = (x, y, w, axis, range, speed, sec = 0) =>
    new Platform(x, y, w, 12, 'moving', { moveAxis: axis, moveRange: range, moveSpeed: speed, section: sec });
  // Conveyor
  const C = (x, y, w, dir, sec = 1) =>
    new Platform(x, y, w, 12, 'conveyor', { conveyorDir: dir, section: sec });
  // Collapsing
  const K = (x, y, w, sec = 2) =>
    new Platform(x, y, w, 12, 'collapsing', { section: sec });
  // Hazard strip
  const H = (x, y, w, h = 8) =>
    new Platform(x, y, w, h, 'hazard');
  // Laser strip
  const L = (x, y, w, h = 8, cycle = 2, offset = 0) =>
    new Platform(x, y, w, h, 'laser', { laserCycle: cycle, laserOffset: offset });

  // ──────────────────────────────────────────────────────────
  //  SECTION 0 – Outer Solar Ramparts  (y: 0 → 1600)
  // ──────────────────────────────────────────────────────────

  // Starting ground (roof entry – player lands here on spawn)
  platforms.push(S(0,   200, 300, 24, 0));
  platforms.push(S(500, 200, 300, 24, 0));

  // Mid-level platforms descending
  platforms.push(P(60,  320, 200, 0));
  platforms.push(P(420, 320, 200, 0));

  platforms.push(P(180, 420, 160, 0));
  platforms.push(P(460, 420, 150, 0));
  platforms.push(P(640, 400, 120, 0));

  platforms.push(P(40,  540, 180, 0));
  platforms.push(P(300, 520, 140, 0));
  platforms.push(P(530, 550, 160, 0));

  platforms.push(M(100, 450, 120, 'x', 200, 70, 0));
  platforms.push(P(420, 460, 140, 0));
  platforms.push(P(620, 440, 140, 0));

  platforms.push(P(50,  560, 160, 0));
  platforms.push(P(280, 580, 120, 0));
  platforms.push(M(500, 560, 100, 'x', 160, 60, 0));

  platforms.push(S(0,   680, 800, 18, 0));   // wide platform – breather spot
  platforms.push(H(200, 695, 100));            // spike hazard center

  platforms.push(P(80,  800, 140, 0));
  platforms.push(P(300, 790, 120, 0));
  platforms.push(P(530, 780, 100, 0));
  platforms.push(M(680, 810, 90,  'y', 80, 55, 0));

  platforms.push(P(40,  920, 120, 0));
  platforms.push(P(240, 940, 150, 0));
  platforms.push(P(460, 930, 130, 0));
  platforms.push(P(660, 910, 120, 0));

  platforms.push(M(150, 1050, 120, 'x', 120, 65, 0));
  platforms.push(P(380,  1060, 140, 0));
  platforms.push(P(600,  1040, 120, 0));

  platforms.push(P(60,  1170, 100, 0));
  platforms.push(P(220, 1180, 130, 0));
  platforms.push(P(440, 1160, 140, 0));
  platforms.push(P(650, 1170, 120, 0));

  platforms.push(S(0, 1300, 800, 18, 0));    // section mid-floor

  platforms.push(P(100, 1420, 120, 0));
  platforms.push(P(320, 1400, 140, 0));
  platforms.push(M(560, 1410, 120, 'x', 100, 70, 0));

  platforms.push(S(0, 1560, 800, 40, 0));    // section bottom floor / transition

  // Enemy spawns – Section 0
  enemyDefs.push({ type: 'Drone',       x: 350, y: 240 });
  enemyDefs.push({ type: 'BladeWalker', x: 480, y: 184 });
  enemyDefs.push({ type: 'Drone',       x: 200, y: 370 });
  enemyDefs.push({ type: 'TurretNode',  x: 500, y: 456 });
  enemyDefs.push({ type: 'BladeWalker', x: 600, y: 660 });
  enemyDefs.push({ type: 'Drone',       x: 300, y: 660 });
  enemyDefs.push({ type: 'TurretNode',  x: 250, y: 1284 });
  enemyDefs.push({ type: 'Drone',       x: 480, y: 900 });
  enemyDefs.push({ type: 'BladeWalker', x: 530, y: 1284 });

  // Pickups – Section 0
  pickupDefs.push({ type: 'health', x: 380, y: 640, amount: 25 });
  pickupDefs.push({ type: 'energy', x: 580, y: 760, amount: 40 });
  pickupDefs.push({ type: 'health', x: 150, y: 1290, amount: 20 });

  // ──────────────────────────────────────────────────────────
  //  SECTION 1 – Energy Processing Layer  (y: 1600 → 3200)
  // ──────────────────────────────────────────────────────────
  const s1 = 1600;

  platforms.push(P(80,  s1+80, 140, 1));
  platforms.push(P(350, s1+70, 120, 1));
  platforms.push(P(590, s1+90, 130, 1));

  // Conveyor section
  platforms.push(C(50,  s1+200, 280, 1,  1));   // right-moving conveyor
  platforms.push(C(420, s1+200, 280, -1, 1));   // left-moving conveyor

  platforms.push(H(320, s1+208, 60));             // hazard in conveyor gap

  // Laser gates
  platforms.push(L(0,   s1+320, 800, 8, 2.5, 0));
  platforms.push(L(0,   s1+360, 800, 8, 2.5, 1.25));  // offset – one on, one off

  platforms.push(P(80,  s1+420, 120, 1));
  platforms.push(P(300, s1+440, 140, 1));
  platforms.push(M(560, s1+420, 120, 'y', 100, 55, 1));

  platforms.push(M(50,  s1+560, 110, 'x', 180, 75, 1));
  platforms.push(P(350, s1+560, 140, 1));
  platforms.push(M(580, s1+540, 120, 'x', 140, 65, 1));

  // Climbing section (vertical moving platforms)
  platforms.push(M(140, s1+700, 80, 'y', 120, 80, 1));
  platforms.push(M(340, s1+730, 80, 'y', 120, 80, 1));
  platforms.push(M(540, s1+700, 80, 'y', 120, 80, 1));

  platforms.push(S(0, s1+900, 800, 18, 1));     // rest platform
  platforms.push(H(350, s1+915, 100));

  platforms.push(P(60,  s1+1020, 120, 1));
  platforms.push(C(250, s1+1020, 200, 1, 1));   // conveyor
  platforms.push(P(500, s1+1010, 140, 1));
  platforms.push(P(680, s1+1020, 100, 1));

  platforms.push(L(0,   s1+1110, 800, 8, 1.8, 0));

  platforms.push(P(80,  s1+1200, 120, 1));
  platforms.push(M(280, s1+1220, 100, 'x', 200, 85, 1));
  platforms.push(P(560, s1+1200, 140, 1));

  platforms.push(P(40,  s1+1340, 160, 1));
  platforms.push(P(300, s1+1350, 140, 1));
  platforms.push(M(560, s1+1340, 120, 'y', 80, 60, 1));

  platforms.push(S(0, s1+1480, 800, 18, 1));  // section bottom

  // Enemy spawns – Section 1
  enemyDefs.push({ type: 'TurretNode',  x: 380, y: s1+50 });
  enemyDefs.push({ type: 'Drone',       x: 250, y: s1+160 });
  enemyDefs.push({ type: 'BladeWalker', x: 150, y: s1+184 });
  enemyDefs.push({ type: 'BladeWalker', x: 580, y: s1+184 });
  enemyDefs.push({ type: 'TurretNode',  x: 650, y: s1+884 });
  enemyDefs.push({ type: 'Drone',       x: 200, y: s1+880 });
  enemyDefs.push({ type: 'TurretNode',  x: 100, y: s1+1464 });
  enemyDefs.push({ type: 'Drone',       x: 450, y: s1+1100 });
  enemyDefs.push({ type: 'BladeWalker', x: 580, y: s1+1464 });

  // Pickups – Section 1
  pickupDefs.push({ type: 'health', x: 370, y: s1+160, amount: 30 });
  pickupDefs.push({ type: 'energy', x: 650, y: s1+990, amount: 50 });
  pickupDefs.push({ type: 'health', x: 200, y: s1+1450, amount: 25 });

  // ──────────────────────────────────────────────────────────
  //  SECTION 2 – Core Descent Shaft  (y: 3200 → 4800)
  // ──────────────────────────────────────────────────────────
  const s2 = 3200;

  // Tight corridor entry
  platforms.push(S(0,   s2+0,  200, 20, 2));
  platforms.push(S(600, s2+0,  200, 20, 2));

  platforms.push(K(80,  s2+100, 100, 2));   // collapsing
  platforms.push(K(300, s2+120, 90,  2));
  platforms.push(K(520, s2+110, 100, 2));

  platforms.push(K(140, s2+240, 80,  2));
  platforms.push(K(350, s2+250, 90,  2));
  platforms.push(K(580, s2+240, 80,  2));

  platforms.push(M(60,  s2+380, 70, 'x', 80, 90, 2));
  platforms.push(K(280, s2+380, 80, 2));
  platforms.push(M(500, s2+360, 70, 'x', 100, 90, 2));

  platforms.push(P(100, s2+500, 100, 2));
  platforms.push(K(300, s2+510, 80, 2));
  platforms.push(P(540, s2+500, 100, 2));

  // Speed run – small fast collapsing
  platforms.push(K(50,  s2+640, 70,  2));
  platforms.push(K(180, s2+650, 60,  2));
  platforms.push(K(310, s2+630, 70,  2));
  platforms.push(K(450, s2+650, 60,  2));
  platforms.push(K(590, s2+640, 70,  2));
  platforms.push(K(710, s2+650, 70,  2));

  platforms.push(S(0, s2+800, 800, 18, 2));   // safe floor

  // SOLAR ENFORCER ARENA
  platforms.push(S(100, s2+760, 600, 8, 2));   // arena floor (solid)

  platforms.push(S(0,   s2+1000, 800, 18, 2));

  platforms.push(K(80,  s2+1120, 90, 2));
  platforms.push(M(300, s2+1130, 80, 'x', 150, 80, 2));
  platforms.push(K(540, s2+1120, 90, 2));

  platforms.push(K(130, s2+1260, 80, 2));
  platforms.push(K(380, s2+1240, 80, 2));
  platforms.push(K(600, s2+1260, 80, 2));

  platforms.push(P(60,  s2+1380, 100, 2));
  platforms.push(P(280, s2+1370, 120, 2));
  platforms.push(P(500, s2+1380, 100, 2));
  platforms.push(P(680, s2+1360, 100, 2));

  platforms.push(S(0, s2+1500, 800, 30, 2));  // section bottom

  // Enemy spawns – Section 2
  enemyDefs.push({ type: 'Drone',         x: 400, y: s2+60  });
  enemyDefs.push({ type: 'TurretNode',    x: 100, y: s2+984 });
  enemyDefs.push({ type: 'TurretNode',    x: 650, y: s2+984 });
  enemyDefs.push({ type: 'SolarEnforcer', x: 350, y: s2+740 });  // mini-boss
  enemyDefs.push({ type: 'Drone',         x: 200, y: s2+1000 });
  enemyDefs.push({ type: 'BladeWalker',   x: 550, y: s2+984 });
  enemyDefs.push({ type: 'Drone',         x: 400, y: s2+1250 });

  // Pickups – Section 2
  pickupDefs.push({ type: 'health', x: 380, y: s2+770, amount: 40 });
  pickupDefs.push({ type: 'energy', x: 600, y: s2+980, amount: 60 });
  pickupDefs.push({ type: 'health', x: 300, y: s2+1360, amount: 30 });

  // ──────────────────────────────────────────────────────────
  //  SECTION 3 – Sunforge Core  (y: 4800 → 6400)
  // ──────────────────────────────────────────────────────────
  const s3 = 4800;

  // Entry – hot zone
  platforms.push(S(0,   s3+0,   800, 20, 3));
  platforms.push(H(200, s3+15,  400));         // hazard center

  platforms.push(P(60,  s3+100, 130, 3));
  platforms.push(P(320, s3+110, 120, 3));
  platforms.push(P(560, s3+100, 140, 3));

  platforms.push(L(0,   s3+220, 800, 8, 2, 0));   // laser gate

  platforms.push(M(80,  s3+320, 110, 'x', 180, 80, 3));
  platforms.push(M(400, s3+300, 100, 'x', 200, 90, 3));
  platforms.push(P(640, s3+320, 120, 3));

  platforms.push(L(0,   s3+430, 800, 8, 1.5, 0.75));

  platforms.push(P(50,  s3+540, 120, 3));
  platforms.push(P(270, s3+550, 110, 3));
  platforms.push(P(500, s3+540, 120, 3));
  platforms.push(P(680, s3+530, 100, 3));

  platforms.push(S(0, s3+660, 800, 18, 3));     // breather

  // Pre-boss corridor
  platforms.push(M(100, s3+780, 100, 'x', 120, 85, 3));
  platforms.push(M(380, s3+780, 100, 'x', 120, 85, 3));
  platforms.push(M(620, s3+760, 100, 'y', 80, 70, 3));

  platforms.push(L(0,   s3+900, 400, 8, 1.2, 0));
  platforms.push(L(400, s3+900, 400, 8, 1.2, 0.6));

  platforms.push(P(60,  s3+1000, 120, 3));
  platforms.push(P(290, s3+1010, 100, 3));
  platforms.push(P(500, s3+1000, 120, 3));
  platforms.push(P(680, s3+990, 100, 3));

  // BOSS ARENA – circular platform, wide floor
  platforms.push(S(0,   s3+1200, 800, 24, 3));  // arena floor
  platforms.push(S(0,   s3+1100, 60,  18, 3));  // left wall pillar
  platforms.push(S(740, s3+1100, 60,  18, 3));  // right wall pillar
  platforms.push(S(0,   s3+1200, 800, 24, 3));  // redundant for boss spawn safety
  platforms.push(P(150, s3+1100, 120, 3));       // breakable-ish pillars (pass-through mid)
  platforms.push(P(520, s3+1100, 120, 3));

  // More arena floor for movement during boss
  platforms.push(S(0, s3+1400, 800, 60, 3));    // lower wall / floor of world

  // Enemy spawns – Section 3
  enemyDefs.push({ type: 'TurretNode',  x: 100, y: s3+644 });
  enemyDefs.push({ type: 'TurretNode',  x: 640, y: s3+644 });
  enemyDefs.push({ type: 'Drone',       x: 300, y: s3+500 });
  enemyDefs.push({ type: 'BladeWalker', x: 400, y: s3+644 });
  enemyDefs.push({ type: 'HelionPrime', x: 360, y: s3+1130 });  // final boss

  // Pickups – Section 3
  pickupDefs.push({ type: 'health', x: 380, y: s3+630, amount: 50 });
  pickupDefs.push({ type: 'energy', x: 200, y: s3+630, amount: 70 });
  pickupDefs.push({ type: 'health', x: 560, y: s3+630, amount: 50 });

  return { platforms, enemyDefs, pickupDefs };
}

// ── BACKGROUND RENDERER ──────────────────────────────────────
// Draws the background entirely in screen-space (canvas 0,0 origin)
function drawBackground(ctx, cam) {
  // Which section are we in?
  const midY  = cam.y + cam.ch * 0.5;
  let section = 0;
  if      (midY >= SECTION_Y[3]) section = 3;
  else if (midY >= SECTION_Y[2]) section = 2;
  else if (midY >= SECTION_Y[1]) section = 1;
  else                            section = 0;

  const BG = BG_THEMES[section];

  // Base gradient – full canvas
  const grad = ctx.createLinearGradient(0, 0, 0, 600);
  grad.addColorStop(0, BG.top);
  grad.addColorStop(1, BG.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 600);

  // Parallax detail layer
  ctx.save();
  ctx.globalAlpha = 0.12;
  BG.drawDetail(ctx, cam, section);
  ctx.restore();
}

const BG_THEMES = [
  // 0 – Outer Solar Ramparts
  {
    top: '#0a1520',
    bot: '#1a2a3a',
    drawDetail(ctx, cam) {
      // Distant flying drones (dots) – parallax scroll
      for (let i = 0; i < 12; i++) {
        const px = ((i * 137 + cam.y * 0.08) % 850) - 25;
        const py = ((i * 89  + cam.y * 0.06) % 650) - 25;
        ctx.fillStyle = '#88aacc';
        ctx.fillRect(Math.round(px), Math.round(py), 3, 2);
      }
      // Energy tower silhouette (center)
      ctx.fillStyle = '#223344';
      ctx.fillRect(320, 0, 160, 600);
      ctx.fillRect(350, 0, 100, 600);
    }
  },
  // 1 – Energy Processing Layer
  {
    top: '#120a00',
    bot: '#2a1800',
    drawDetail(ctx, cam) {
      // Rotating turbine wheels in screen-space
      for (let i = 0; i < 3; i++) {
        const wx = 100 + i * 260;
        const wy = 100 + ((cam.y * 0.1 + i * 80) % 400);
        ctx.strokeStyle = '#664400'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(wx, wy, 60, 0, Math.PI * 2); ctx.stroke();
        const angle = (Date.now() * 0.0004 + i * 1.5) % (Math.PI * 2);
        for (let s = 0; s < 4; s++) {
          const sa = angle + s * Math.PI * 0.5;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + Math.cos(sa) * 55, wy + Math.sin(sa) * 55);
          ctx.stroke();
        }
      }
    }
  },
  // 2 – Core Descent Shaft
  {
    top: '#06060f',
    bot: '#0f0f22',
    drawDetail(ctx, cam) {
      // Warning lights alternating left/right walls
      for (let i = 0; i < 8; i++) {
        const lx = i % 2 === 0 ? 20 : 770;
        const ly = ((i * 90 + cam.y * 0.15) % 620) - 10;
        const on = Math.floor(Date.now() * 0.003 + i) % 2 === 0;
        ctx.fillStyle = on ? '#cc2200' : '#220000';
        ctx.fillRect(Math.round(lx), Math.round(ly), 10, 14);
      }
      // Glowing glyphs
      for (let i = 0; i < 5; i++) {
        const gx = 40 + i * 150;
        const gy = ((i * 113 + cam.y * 0.1) % 560) + 20;
        ctx.fillStyle = '#3333aa';
        ctx.fillRect(Math.round(gx), Math.round(gy), 20, 6);
        ctx.fillRect(Math.round(gx + 4), Math.round(gy - 4), 12, 4);
      }
    }
  },
  // 3 – Sunforge Core
  {
    top: '#120600',
    bot: '#200800',
    drawDetail(ctx, cam) {
      // Artificial sun glow (center-screen)
      const sx = 400, sy = 200;
      const gradient = ctx.createRadialGradient(sx, sy, 10, sx, sy, 200);
      gradient.addColorStop(0, 'rgba(255,200,100,0.5)');
      gradient.addColorStop(0.5,'rgba(255,80,0,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(sx, sy, 200, 0, Math.PI * 2); ctx.fill();
      // Plasma rings
      for (let r = 0; r < 3; r++) {
        const rot = (Date.now() * 0.0002 * (r + 1)) % (Math.PI * 2);
        ctx.strokeStyle = `rgba(255,${80 - r * 20},0,0.3)`;
        ctx.lineWidth = 4;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 70 + r * 20, 20 + r * 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
];
