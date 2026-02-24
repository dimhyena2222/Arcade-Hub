// ============================================================
//  LEVELS  –  Arena maps & wave definitions
// ============================================================

// Blast zone boundaries (KO zone)
const BLAST_LEFT   = -200;
const BLAST_RIGHT  = 1000;
const BLAST_TOP    = -250;
const BLAST_BOTTOM = 720;

const TOTAL_WAVES = 7;

// ── Arena map definitions ────────────────────────────────────
// Each map: { name, bgTheme, platforms[] }
// Platform format: (x, y, w, h, type)  type: 'solid' | 'pass'
const ARENA_MAPS = [
  {
    name: 'Solar Flats',
    bgTheme: 0,
    platforms: [
      // Main stage
      { x: 80,  y: 440, w: 640, h: 28, type: 'solid' },
      // Two side ledges
      { x: 50,  y: 340, w: 160, h: 16, type: 'pass' },
      { x: 590, y: 340, w: 160, h: 16, type: 'pass' },
      // Center float
      { x: 310, y: 260, w: 180, h: 16, type: 'pass' },
    ]
  },
  {
    name: 'Sunforge Arena',
    bgTheme: 1,
    platforms: [
      // Main stage
      { x: 70,  y: 440, w: 660, h: 28, type: 'solid' },
      // Three floats in a row
      { x: 120, y: 320, w: 150, h: 16, type: 'pass' },
      { x: 325, y: 270, w: 150, h: 16, type: 'pass' },
      { x: 530, y: 320, w: 150, h: 16, type: 'pass' },
    ]
  },
  {
    name: 'Energy Forge',
    bgTheme: 2,
    platforms: [
      // Main stage
      { x: 100, y: 450, w: 600, h: 28, type: 'solid' },
      // Two angled-look floats
      { x: 90,  y: 340, w: 140, h: 16, type: 'pass' },
      { x: 570, y: 340, w: 140, h: 16, type: 'pass' },
      // Upper center
      { x: 295, y: 240, w: 210, h: 16, type: 'pass' },
      // Side high floats
      { x: 50,  y: 200, w: 110, h: 14, type: 'pass' },
      { x: 640, y: 200, w: 110, h: 14, type: 'pass' },
    ]
  },
  {
    name: 'Orbital Ramparts',
    bgTheme: 3,
    platforms: [
      // Main wide stage
      { x: 60,  y: 460, w: 680, h: 28, type: 'solid' },
      // Rising staircase left
      { x: 80,  y: 360, w: 130, h: 16, type: 'pass' },
      { x: 80,  y: 275, w: 100, h: 14, type: 'pass' },
      // Rising staircase right
      { x: 590, y: 360, w: 130, h: 16, type: 'pass' },
      { x: 620, y: 275, w: 100, h: 14, type: 'pass' },
      // Center top
      { x: 315, y: 230, w: 170, h: 16, type: 'pass' },
    ]
  },
  {
    name: 'Core Descent',
    bgTheme: 0,
    platforms: [
      // Main stage (shorter, with gaps implied by visuals)
      { x: 100, y: 448, w: 260, h: 28, type: 'solid' },
      { x: 440, y: 448, w: 260, h: 28, type: 'solid' },
      // Center bridge (pass-through)
      { x: 310, y: 420, w: 180, h: 14, type: 'pass' },
      // Floating platforms
      { x: 160, y: 330, w: 140, h: 16, type: 'pass' },
      { x: 500, y: 330, w: 140, h: 16, type: 'pass' },
      { x: 310, y: 250, w: 180, h: 16, type: 'pass' },
    ]
  },
];

// ── Wave definitions ─────────────────────────────────────────
// hpMult: multiply base enemy hp by this factor
const WAVES = [
  // Wave 1 – two basic drones
  [
    { type: 'Drone',         hpMult: 1.0 },
    { type: 'Drone',         hpMult: 1.0 },
  ],
  // Wave 2 – drone + blade walker
  [
    { type: 'Drone',         hpMult: 1.2 },
    { type: 'BladeWalker',   hpMult: 1.0 },
  ],
  // Wave 3 – turret + blade walkers
  [
    { type: 'TurretNode',    hpMult: 1.0 },
    { type: 'BladeWalker',   hpMult: 1.2 },
    { type: 'BladeWalker',   hpMult: 1.2 },
  ],
  // Wave 4 – solar enforcers
  [
    { type: 'SolarEnforcer', hpMult: 1.0 },
    { type: 'Drone',         hpMult: 1.5 },
    { type: 'TurretNode',    hpMult: 1.2 },
  ],
  // Wave 5 – heavy mix
  [
    { type: 'SolarEnforcer', hpMult: 1.4 },
    { type: 'BladeWalker',   hpMult: 1.5 },
    { type: 'TurretNode',    hpMult: 1.5 },
    { type: 'Drone',         hpMult: 2.0 },
  ],
  // Wave 6 – elite gauntlet
  [
    { type: 'SolarEnforcer', hpMult: 2.0 },
    { type: 'SolarEnforcer', hpMult: 2.0 },
    { type: 'BladeWalker',   hpMult: 2.5 },
  ],
  // Wave 7 – HELION PRIME (final boss)
  [
    { type: 'HelionPrime',   hpMult: 1.0 },
  ],
];

// ── Arena builder ────────────────────────────────────────────
function buildArena(mapIndex) {
  const map = ARENA_MAPS[mapIndex] || ARENA_MAPS[0];
  const platforms = map.platforms.map(pd =>
    new Platform(pd.x, pd.y, pd.w, pd.h, pd.type)
  );
  return { platforms, bgTheme: map.bgTheme, mapName: map.name };
}

// ── Background drawing ───────────────────────────────────────
const BG_THEMES = [
  // 0 – Solar / amber sky
  (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0,    '#0a0005');
    g.addColorStop(0.4,  '#1a0a20');
    g.addColorStop(1,    '#0d0510');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 600);
    // Stars
    ctx.save();
    ctx.fillStyle = 'rgba(255,200,100,0.6)';
    const stars = [[60,40],[200,80],[370,30],[550,55],[700,25],[130,150],[480,120],[620,90]];
    for (const [sx, sy] of stars) {
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // Sun glow
    const sun = ctx.createRadialGradient(400, 580, 30, 400, 580, 340);
    sun.addColorStop(0,   'rgba(255,160,0,0.25)');
    sun.addColorStop(0.5, 'rgba(255,80,0,0.08)');
    sun.addColorStop(1,   'transparent');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, 800, 600);
  },
  // 1 – Forge interior (red/orange)
  (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0,   '#0d0005');
    g.addColorStop(0.5, '#1a0808');
    g.addColorStop(1,   '#2a0e0e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 600);
    // Lava glow at bottom
    const lava = ctx.createLinearGradient(0, 500, 0, 600);
    lava.addColorStop(0, 'transparent');
    lava.addColorStop(1, 'rgba(255,60,0,0.18)');
    ctx.fillStyle = lava; ctx.fillRect(0, 0, 800, 600);
  },
  // 2 – Space / cyan
  (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0,   '#000010');
    g.addColorStop(0.6, '#020a1a');
    g.addColorStop(1,   '#040f20');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 600);
    ctx.save(); ctx.fillStyle = 'rgba(100,200,255,0.5)';
    const stars2 = [[90,20],[270,60],[410,15],[580,40],[730,70],[160,180],[530,140],[680,200]];
    for (const [sx, sy] of stars2) {
      ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // Planet glow
    const planet = ctx.createRadialGradient(680, 100, 10, 680, 100, 130);
    planet.addColorStop(0,   'rgba(0,180,255,0.3)');
    planet.addColorStop(0.5, 'rgba(0,100,200,0.08)');
    planet.addColorStop(1,   'transparent');
    ctx.fillStyle = planet; ctx.fillRect(0, 0, 800, 600);
  },
  // 3 – Dark orbital
  (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0,   '#000000');
    g.addColorStop(0.5, '#050510');
    g.addColorStop(1,   '#0a0a1a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 600);
    ctx.save(); ctx.fillStyle = 'rgba(180,180,255,0.45)';
    for (let i = 0; i < 20; i++) {
      const sx = (i * 137 + 50) % 800;
      const sy = (i * 83  + 20) % 250;
      ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },
];

function drawBackground(ctx, bgTheme) {
  const fn = BG_THEMES[bgTheme] || BG_THEMES[0];
  fn(ctx);
}

function drawForeground(ctx) {
  // Subtle vignette
  const vg = ctx.createRadialGradient(400, 300, 200, 400, 300, 480);
  vg.addColorStop(0,   'transparent');
  vg.addColorStop(1,   'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, 800, 600);
}
