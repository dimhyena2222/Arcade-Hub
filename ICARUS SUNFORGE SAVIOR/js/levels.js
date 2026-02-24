// ============================================================
//  LEVEL DATA  �  Horizontal Side-Scroller overhaul
//  World: 16000 � 700 px  |  Camera scrolls horizontally
// ============================================================

const WORLD_W = 16000;
const WORLD_H = 700;

// -- Section X boundaries ------------------------------------
const SECTION_X = [0, 4000, 8000, 12000, 16000];

// ------------------------------------------------------------
//  buildLevel()  � returns { platforms, enemyDefs, pickupDefs }
// ------------------------------------------------------------
function buildLevel() {
  const platforms = [];
  const enemyDefs = [];   // { type, x, y }
  const pickupDefs= [];   // { type, x, y }

  // Helpers
  const S = (x, y, w, h = 24, sec = 0) => new Platform(x, y, w, h, 'solid', { section: sec });
  const P = (x, y, w, sec = 0) => new Platform(x, y, w, 14, 'pass', { section: sec });
  const M = (x, y, w, axis, range, speed, sec = 0) => new Platform(x, y, w, 14, 'moving', { moveAxis: axis, moveRange: range, moveSpeed: speed, section: sec });
  const C = (x, y, w, dir, sec = 1) => new Platform(x, y, w, 14, 'conveyor', { conveyorDir: dir, section: sec });
  const K = (x, y, w, sec = 2) => new Platform(x, y, w, 14, 'collapsing', { section: sec });
  const H = (x, y, w, h = 10) => new Platform(x, y, w, h, 'hazard');
  const L = (x, y, w, h = 10, cycle = 2, offset = 0) => new Platform(x, y, w, h, 'laser', { laserCycle: cycle, laserOffset: offset });

  // --- Starting Area ---
  platforms.push(S(0, 500, 1200, 200, 0)); // ground
  platforms.push(P(300, 410, 120, 0));
  platforms.push(P(500, 320, 140, 0));
  platforms.push(P(750, 410, 150, 0));

  // --- Section 0: Solar Ramparts (0 - 4000) ---
  platforms.push(S(1200, 520, 600, 180, 0));
  platforms.push(H(1400, 506, 100)); // spikes on platform
  platforms.push(M(1900, 450, 120, 'y', 150, 80, 0)); // elevator
  platforms.push(S(2100, 400, 800, 300, 0));
  platforms.push(P(2300, 280, 150, 0));
  platforms.push(P(2600, 200, 150, 0));
  platforms.push(S(3000, 500, 1000, 200, 0));

  enemyDefs.push({ type: 'Drone', x: 1000, y: 300 });
  enemyDefs.push({ type: 'BladeWalker', x: 1500, y: 490 });
  enemyDefs.push({ type: 'Drone', x: 2500, y: 250 });
  enemyDefs.push({ type: 'TurretNode', x: 3200, y: 478 });

  // --- Section 1: Processing Core (4000 - 8000) ---
  const s1 = 4000;
  platforms.push(S(s1, 550, 1200, 150, 1));
  // Replaced conveyors with solid/pass platforms
  platforms.push(S(s1+200, 440, 400, 24, 1)); 
  platforms.push(P(s1+800, 300, 400, 1)); 
  
  platforms.push(L(s1+1300, 0, 30, 600, 3, 0));
  platforms.push(L(s1+1700, 0, 30, 600, 3, 1.5));
  
  platforms.push(S(s1+1500, 550, 2000, 150, 1)); 
  platforms.push(M(s1+2000, 350, 120, 'x', 400, 120, 1));

  enemyDefs.push({ type: 'TurretNode', x: s1+400, y: 528 });
  enemyDefs.push({ type: 'BladeWalker', x: s1+1600, y: 522 });
  enemyDefs.push({ type: 'SolarEnforcer', x: s1+2800, y: 500 });

  // --- Section 2: Core Shaft (8000 - 12000) ---
  const s2 = 8000;
  platforms.push(S(s2, 580, 4000, 120, 2));
  for(let i=0; i<12; i++) {
    platforms.push(K(s2 + 200 + i*300, 440 - (i%2)*120, 140, 2)); 
  }
  enemyDefs.push({ type: 'Drone', x: s2+500, y: 200 });
  enemyDefs.push({ type: 'Drone', x: s2+1500, y: 150 });
  enemyDefs.push({ type: 'TurretNode', x: s2+2000, y: 558 });

  // --- Section 3: Sunforge Core (12000 - 16000) ---
  const s3 = 12000;
  platforms.push(S(s3, 600, 4000, 100, 3)); 
  platforms.push(P(s3+500, 450, 300, 3));
  platforms.push(P(s3+1500, 450, 300, 3));
  platforms.push(M(s3+1000, 300, 200, 'x', 500, 150, 3));
  
  enemyDefs.push({ type: 'HelionPrime', x: s3+2500, y: 300 });

  pickupDefs.push({ type: 'health', x: 200,  y: 470, amount: 30 });
  pickupDefs.push({ type: 'ability', x: 5000, y: 490, subtype: 'double_jump' });
  pickupDefs.push({ type: 'health', x: 10000, y: 550, amount: 50 });

  return { platforms, enemyDefs, pickupDefs };
}

// -- SECTION THEMES  (Improved Visuals) -----------------------
function drawBackground(ctx, cam) {
  const midX = cam.x + cam.cw * 0.5;
  let section = 0;
  if      (midX >= SECTION_X[3]) section = 3;
  else if (midX >= SECTION_X[2]) section = 2;
  else if (midX >= SECTION_X[1]) section = 1;
  else                            section = 0;

  const BG = BG_THEMES[section];

  // Base gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 600);
  grad.addColorStop(0, BG.top);
  grad.addColorStop(1, BG.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 600);

  // Parallax layers
  ctx.save();
  BG.drawDetail(ctx, cam);
  ctx.restore();
}

function drawForeground(ctx, cam) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#080a14';
  
  // Reduced frequency (mod 8000 -> few) and wider spread (i * 2000)
  for (let i = 0; i < 20; i++) {
    const fx = (i * 2500 - cam.x * 1.5) % 16000;
    if (fx > -200 && fx < 900) {
      // Massive foreground beam
      ctx.fillRect(fx, -50, 40, 700);
      // Secondary pipe
      ctx.fillStyle = '#101422';
      ctx.fillRect(fx + 10, -50, 10, 700);
      // Joint detail
      ctx.fillStyle = '#1e2436';
      ctx.fillRect(fx - 5, 200, 50, 25);
      ctx.fillRect(fx - 5, 500, 50, 25);
      ctx.fillStyle = '#080a14';
    }
  }
  ctx.restore();
}

const BG_THEMES = [
  {
    top: '#050a12', bot: '#151a2a',
    drawDetail(ctx, cam) {
      for(let i=0; i<60; i++) {
        const lx = (i*237 - cam.x * 0.08) % 1200;
        const ly = (i*193) % 640;
        ctx.fillStyle = i%4===0 ? '#88ccff' : '#223344';
        ctx.fillRect(lx, ly, 3, 3);
      }
      ctx.fillStyle = 'rgba(10,20,40,0.4)';
      for(let i=0; i<15; i++) {
        const gx = (i*800 - cam.x * 0.2) % 3200;
        ctx.fillRect(gx, 0, 60, 600);
        ctx.fillRect(gx-200, 150+i*30, 400, 15);
      }
    }
  },
  {
    top: '#120800', bot: '#251500',
    drawDetail(ctx, cam) {
      for(let i=0; i<12; i++) {
        const cx = (i*500 - cam.x * 0.2) % 2400;
        ctx.fillStyle = '#aa4400';
        ctx.fillRect(cx, 100+i*60, 300, 8);
        ctx.shadowBlur = 15; ctx.shadowColor = '#ff6600';
        ctx.fillRect(cx+40, 100+i*60+2, 220, 4);
        ctx.shadowBlur = 0;
      }
      // Floating gears
      for(let i=0; i<5; i++) {
        const gx = (i*1000 - cam.x * 0.15) % 2000;
        const gy = 100 + i*100;
        ctx.strokeStyle = '#443300'; ctx.lineWidth = 15;
        ctx.beginPath(); ctx.arc(gx, gy, 80, 0, Math.PI*2); ctx.stroke();
      }
    }
  },
  {
    top: '#050510', bot: '#101025',
    drawDetail(ctx, cam) {
      for(let i=0; i<6; i++) {
        const rx = (i*1200 - cam.x * 0.45) % 6000;
        ctx.strokeStyle = '#222244'; ctx.lineWidth = 60;
        ctx.beginPath(); ctx.arc(rx, 300, 500, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = '#111122'; ctx.lineWidth = 30;
        ctx.beginPath(); ctx.arc(rx, 300, 520, 0, Math.PI*2); ctx.stroke();
      }
    }
  },
  {
    top: '#1a0500', bot: '#350a00',
    drawDetail(ctx, cam) {
      const sx = (800 - cam.x * 0.1) % 6000;
      const grad = ctx.createRadialGradient(sx, 300, 100, sx, 300, 600);
      grad.addColorStop(0, 'rgba(255,100,0,0.5)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad; ctx.fillRect(0,0,800,600);
      for(let i=0; i<25; i++) {
        const hx = (i*235 - cam.x * 0.3) % 1200;
        const hy = (Math.sin(Date.now()*0.001+i)*80 + 300);
        ctx.fillStyle = 'rgba(255,140,0,0.15)';
        ctx.fillRect(hx, hy, 60, 60);
      }
    }
  }
];
