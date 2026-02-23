/* ============================================================
   LUMEN'S LANTERN — Level Definitions (Terrain Edition)
   ============================================================

   terrain      : [{x,y}] control points for the ground surface.
                  y is the surface height in world-space (500 = screen bottom).
                  Interpolated with smoothstep for organic curves.
   ceilY        : uppermost y Lumen can reach (default 25).

   Layer system — each level has arrays for different render layers:
     farTrees   : distant silhouette trees (parallax 0.10×)
     midTrees   : mid-ground forest (parallax 0.40×)
     closeTrees : near trees — drawn AFTER player so they occlude her (0.82×)
     foliage    : foreground canopy leaves (0.88×, drawn over player)
     details    : ground-level props (flowers, mushrooms, streams)
                  rendered just above terrain surface

   Entities (crystals, embers, mirrors, shadows, lantern)
   are placed at world-space {x, y}, where y is an absolute pixel
   height above the BOTTOM of the screen (500px canvas height minus y
   gives actual canvas y — but we treat them as world-space y directly,
   same as before, since the renderer uses them relative to terrain).
*/

const LEVELS = [

  /* ══════════════════════════════════════════════════════════
     LEVEL 1 — MOSSY GLEN
     Mission : Collect 3 Forest Crystals hidden in the foliage
     Vibe    : Dawn forest, rolling mossy hills, amber warmth
  ══════════════════════════════════════════════════════════ */
  {
    id:         1,
    name:       'Mossy Glen',
    flavour:    'A gentle forest waking up at dawn…',
    mission:    'Find the 3 Forest Crystals hidden among the trees.',
    theme:      'forest',
    worldWidth: 2600,
    ceilY:      28,

    skyTop:    '#1a2a10',
    skyBottom: '#4a7a28',
    horizonColor: '#6aaa3a',
    groundFill:   '#1e3412',
    groundTop:    '#3a6020',
    mistColor:    'rgba(120,200,80,0.10)',

    // ── Organic terrain control points ──────────────────────
    // y=440 is ground level, y=200 is high canopy
    terrain: [
      { x: 0,    y: 440 }, { x: 180,  y: 435 }, { x: 380,  y: 420 },
      { x: 560,  y: 400 }, { x: 720,  y: 380 }, { x: 900,  y: 360 },
      { x: 1060, y: 390 }, { x: 1220, y: 340 }, { x: 1380, y: 310 },
      { x: 1530, y: 350 }, { x: 1680, y: 290 }, { x: 1830, y: 260 },
      { x: 1970, y: 300 }, { x: 2100, y: 270 }, { x: 2240, y: 240 },
      { x: 2380, y: 260 }, { x: 2500, y: 250 }, { x: 2600, y: 255 },
    ],

    // ── Far background silhouette trees (parallax 0.10×) ────
    farTrees: [
      { x:  150, type: 'pine',  scale: 1.0 }, { x:  340, type: 'round', scale: 0.9 },
      { x:  560, type: 'pine',  scale: 1.1 }, { x:  780, type: 'round', scale: 1.0 },
      { x: 1000, type: 'pine',  scale: 0.95},{ x: 1220, type: 'round', scale: 1.05},
      { x: 1460, type: 'pine',  scale: 1.0 }, { x: 1680, type: 'round', scale: 1.1 },
      { x: 1900, type: 'pine',  scale: 0.9 }, { x: 2120, type: 'round', scale: 1.0 },
      { x: 2340, type: 'pine',  scale: 1.05}, { x: 2540, type: 'round', scale: 0.95},
    ],

    // ── Mid-ground trees (parallax 0.40×) ───────────────────
    midTrees: [
      { x:  80,  type: 'round', scale: 1.4 }, { x:  260, type: 'pine',  scale: 1.6 },
      { x:  440, type: 'round', scale: 1.3 }, { x:  640, type: 'pine',  scale: 1.5 },
      { x:  830, type: 'round', scale: 1.4 }, { x: 1020, type: 'pine',  scale: 1.7 },
      { x: 1180, type: 'round', scale: 1.5 }, { x: 1360, type: 'pine',  scale: 1.4 },
      { x: 1540, type: 'round', scale: 1.6 }, { x: 1730, type: 'pine',  scale: 1.5 },
      { x: 1910, type: 'round', scale: 1.3 }, { x: 2080, type: 'pine',  scale: 1.6 },
      { x: 2260, type: 'round', scale: 1.5 }, { x: 2440, type: 'pine',  scale: 1.4 },
    ],

    // ── Close foreground trees — occlude Lumen (parallax 0.82×) ─
    closeTrees: [
      { x:  200, type: 'oak',   scale: 1.0 }, { x:  550, type: 'pine',  scale: 0.9 },
      { x:  920, type: 'oak',   scale: 1.1 }, { x: 1300, type: 'pine',  scale: 1.0 },
      { x: 1650, type: 'oak',   scale: 0.95}, { x: 2050, type: 'pine',  scale: 1.0 },
      { x: 2400, type: 'oak',   scale: 0.9 },
    ],

    // ── Floating canopy leaves (parallax 0.88×, drawn over player) ─
    foliage: [
      { x:  180, w: 160, y: 180 }, { x:  500, w: 200, y: 160 },
      { x:  850, w: 180, y: 170 }, { x: 1200, w: 210, y: 155 },
      { x: 1560, w: 190, y: 145 }, { x: 1900, w: 200, y: 140 },
      { x: 2250, w: 180, y: 130 },
    ],

    // ── Ground-level details (drawn above terrain surface) ──
    details: [
      { type: 'flowers', x:  140, color: '#ff88aa' },
      { type: 'flowers', x:  380, color: '#ffcc44' },
      { type: 'mushroom', x: 630  },
      { type: 'stream',  x:  780, w: 60  },
      { type: 'flowers', x: 1020, color: '#aa88ff' },
      { type: 'moss',    x: 1150, w: 100 },
      { type: 'stream',  x: 1440, w: 80  },
      { type: 'mushroom', x: 1700 },
      { type: 'flowers', x: 1880, color: '#ff88aa' },
      { type: 'stream',  x: 2100, w: 70  },
      { type: 'moss',    x: 2320, w: 120 },
      { type: 'flowers', x: 2480, color: '#ffcc44' },
    ],

    // ── Entities ─────────────────────────────────────────────
    crystals: [
      { x:  720, y: 330, color: '#7af0c8' },   // nestled in rising hillside
      { x: 1300, y: 260, color: '#a0c8ff' },   // mid-forest height
      { x: 2300, y: 185, color: '#f0c860' },   // high in the canopy
    ],
    embers:        [],
    mirrors:       [],
    beamWaypoints: [],
    shadows:       [],
    lantern: { x: 2530, y: 210 },

    spawnX: 60,
  },

  /* ══════════════════════════════════════════════════════════
     LEVEL 2 — CRYSTAL CAVERN
     Mission : Activate 3 Ancient Mirrors to guide light
     Vibe    : Underground cave, glowing crystals, blue-violet
  ══════════════════════════════════════════════════════════ */
  {
    id:         2,
    name:       'Crystal Cavern',
    flavour:    'Forgotten starlight sleeps deep underground…',
    mission:    'Glide to the 3 Ancient Mirrors and activate them with your glow.',
    theme:      'cave',
    worldWidth: 2700,
    ceilY:      60,

    skyTop:    '#04080e',
    skyBottom: '#0c1830',
    horizonColor: '#162850',
    groundFill:   '#0a1228',
    groundTop:    '#182240',
    mistColor:    'rgba(40,70,200,0.12)',

    // Cave floor — undulating, rises toward end where lantern is high
    terrain: [
      { x: 0,    y: 450 }, { x: 200,  y: 445 }, { x: 400,  y: 430 },
      { x: 580,  y: 420 }, { x: 760,  y: 440 }, { x: 940,  y: 410 },
      { x: 1120, y: 395 }, { x: 1280, y: 420 }, { x: 1440, y: 388 },
      { x: 1600, y: 360 }, { x: 1760, y: 385 }, { x: 1920, y: 340 },
      { x: 2060, y: 310 }, { x: 2200, y: 340 }, { x: 2360, y: 295 },
      { x: 2500, y: 270 }, { x: 2620, y: 260 }, { x: 2700, y: 262 },
    ],

    // Cave has stalactites instead of far trees
    farTrees: [
      { x:  120, type: 'stala', scale: 1.0 }, { x:  350, type: 'stala', scale: 1.2 },
      { x:  600, type: 'stala', scale: 0.9 }, { x:  850, type: 'stala', scale: 1.1 },
      { x: 1100, type: 'stala', scale: 1.0 }, { x: 1380, type: 'stala', scale: 1.3 },
      { x: 1640, type: 'stala', scale: 0.95}, { x: 1900, type: 'stala', scale: 1.1 },
      { x: 2150, type: 'stala', scale: 1.0 }, { x: 2420, type: 'stala', scale: 1.2 },
      { x: 2620, type: 'stala', scale: 0.9 },
    ],

    // Crystal formations instead of mid trees
    midTrees: [
      { x:  100, type: 'crystal', scale: 1.3 }, { x:  300, type: 'crystal', scale: 1.5 },
      { x:  520, type: 'crystal', scale: 1.2 }, { x:  730, type: 'crystal', scale: 1.6 },
      { x:  950, type: 'crystal', scale: 1.4 }, { x: 1140, type: 'crystal', scale: 1.3 },
      { x: 1340, type: 'crystal', scale: 1.5 }, { x: 1540, type: 'crystal', scale: 1.2 },
      { x: 1760, type: 'crystal', scale: 1.6 }, { x: 1980, type: 'crystal', scale: 1.4 },
      { x: 2200, type: 'crystal', scale: 1.3 }, { x: 2420, type: 'crystal', scale: 1.5 },
    ],

    // Large close stalactites / rock pillars that hang in front of Lumen
    closeTrees: [
      { x:  280, type: 'stala', scale: 1.0 }, { x:  650, type: 'stala', scale: 1.1 },
      { x: 1050, type: 'stala', scale: 1.0 }, { x: 1480, type: 'stala', scale: 0.95},
      { x: 1870, type: 'stala', scale: 1.1 }, { x: 2340, type: 'stala', scale: 1.0 },
    ],

    foliage: [],

    // Ground details: glowing crystal clusters and cave pools
    details: [
      { type: 'cavecrystal', x:  160, color: '#60aaff' },
      { type: 'pool',        x:  400, w: 70  },
      { type: 'cavecrystal', x:  660, color: '#aa60ff' },
      { type: 'cavecrystal', x:  920, color: '#60ffcc' },
      { type: 'pool',        x: 1180, w: 90  },
      { type: 'cavecrystal', x: 1420, color: '#60aaff' },
      { type: 'pool',        x: 1680, w: 60  },
      { type: 'cavecrystal', x: 1940, color: '#ff60aa' },
      { type: 'cavecrystal', x: 2200, color: '#60ccff' },
      { type: 'pool',        x: 2440, w: 80  },
    ],

    crystals: [],
    embers:   [],

    mirrors: [
      { x:  580, y: 370 },
      { x: 1300, y: 330 },
      { x: 2020, y: 285 },
    ],

    beamWaypoints: [
      { x: 30,   y: 300 },
      { x: 580,  y: 320 },
      { x: 1300, y: 278 },
      { x: 2020, y: 235 },
      { x: 2610, y: 215 },
    ],

    shadows: [
      { x:  750, y: 420, left:  600, right: 1000 },
      { x: 1650, y: 380, left: 1440, right: 1920 },
    ],

    lantern: { x: 2620, y: 215 },

    spawnX: 60,
  },

  /* ══════════════════════════════════════════════════════════
     LEVEL 3 — SHADOW CANOPY
     Mission : Gather 4 Ancient Embers hidden in the dark canopy
     Vibe    : Midnight forest, starry sky, towering silhouettes
  ══════════════════════════════════════════════════════════ */
  {
    id:         3,
    name:       'Shadow Canopy',
    flavour:    'The ancient forest holds its breath in the deep dark…',
    mission:    'Gather the 4 Ancient Embers hidden high in the canopy.',
    theme:      'night',
    worldWidth: 2900,
    ceilY:      22,

    skyTop:    '#02030a',
    skyBottom: '#080a1a',
    horizonColor: '#10142e',
    groundFill:   '#060810',
    groundTop:    '#101626',
    mistColor:    'rgba(15,10,50,0.18)',

    // Dramatic night terrain — deep valleys, rising peaks
    terrain: [
      { x: 0,    y: 450 }, { x: 200,  y: 442 }, { x: 380,  y: 425 },
      { x: 560,  y: 410 }, { x: 740,  y: 390 }, { x: 900,  y: 415 },
      { x: 1060, y: 375 }, { x: 1220, y: 340 }, { x: 1380, y: 370 },
      { x: 1540, y: 310 }, { x: 1700, y: 280 }, { x: 1840, y: 310 },
      { x: 2000, y: 260 }, { x: 2160, y: 230 }, { x: 2300, y: 255 },
      { x: 2460, y: 210 }, { x: 2620, y: 195 }, { x: 2750, y: 210 },
      { x: 2900, y: 220 },
    ],

    farTrees: [
      { x:  130, type: 'pine',  scale: 1.2 }, { x:  330, type: 'pine',  scale: 1.4 },
      { x:  550, type: 'pine',  scale: 1.1 }, { x:  760, type: 'pine',  scale: 1.3 },
      { x:  980, type: 'pine',  scale: 1.2 }, { x: 1190, type: 'pine',  scale: 1.5 },
      { x: 1420, type: 'pine',  scale: 1.1 }, { x: 1650, type: 'pine',  scale: 1.3 },
      { x: 1880, type: 'pine',  scale: 1.2 }, { x: 2110, type: 'pine',  scale: 1.4 },
      { x: 2340, type: 'pine',  scale: 1.1 }, { x: 2570, type: 'pine',  scale: 1.3 },
      { x: 2780, type: 'pine',  scale: 1.2 },
    ],

    midTrees: [
      { x:  80,  type: 'pine', scale: 1.8 }, { x:  270, type: 'round', scale: 1.6 },
      { x:  470, type: 'pine', scale: 2.0 }, { x:  680, type: 'round', scale: 1.7 },
      { x:  890, type: 'pine', scale: 1.9 }, { x: 1100, type: 'round', scale: 1.8 },
      { x: 1310, type: 'pine', scale: 2.1 }, { x: 1520, type: 'round', scale: 1.7 },
      { x: 1740, type: 'pine', scale: 2.0 }, { x: 1960, type: 'round', scale: 1.8 },
      { x: 2180, type: 'pine', scale: 1.9 }, { x: 2400, type: 'round', scale: 2.0 },
      { x: 2620, type: 'pine', scale: 1.8 }, { x: 2820, type: 'round', scale: 1.7 },
    ],

    // Very large close trees — dramatic depth occlusion
    closeTrees: [
      { x:  220, type: 'oak',  scale: 1.2 }, { x:  620, type: 'pine', scale: 1.0 },
      { x: 1030, type: 'oak',  scale: 1.1 }, { x: 1450, type: 'pine', scale: 1.0 },
      { x: 1860, type: 'oak',  scale: 1.2 }, { x: 2280, type: 'pine', scale: 1.0 },
      { x: 2680, type: 'oak',  scale: 1.1 },
    ],

    // Canopy patches — dense in nightmare forest
    foliage: [
      { x:  150, w: 220, y: 165 }, { x:  480, w: 260, y: 145 },
      { x:  820, w: 240, y: 150 }, { x: 1160, w: 280, y: 130 },
      { x: 1500, w: 250, y: 120 }, { x: 1850, w: 270, y: 105 },
      { x: 2200, w: 260, y:  95 }, { x: 2560, w: 250, y:  90 },
    ],

    details: [
      { type: 'mushroom', x:  160  },
      { type: 'flowers',  x:  420, color: '#6640ff' },
      { type: 'mushroom', x:  700  },
      { type: 'stream',   x:  960, w: 60 },
      { type: 'flowers',  x: 1240, color: '#ff4488' },
      { type: 'mushroom', x: 1520  },
      { type: 'stream',   x: 1780, w: 80 },
      { type: 'flowers',  x: 2040, color: '#4488ff' },
      { type: 'mushroom', x: 2320  },
      { type: 'flowers',  x: 2580, color: '#ff6644' },
    ],

    crystals: [],

    embers: [
      { x:  680, y: 345 },   // ground-level — easy start
      { x: 1180, y: 280 },   // mid-height
      { x: 1800, y: 218 },   // high in the canopy
      { x: 2560, y: 148 },   // topmost — deep in the dark canopy
    ],

    mirrors:       [],
    beamWaypoints: [],

    shadows: [
      { x:  400, y: 400, left:  200, right:  750 },
      { x: 1000, y: 390, left:  800, right: 1300 },
      { x: 1600, y: 370, left: 1360, right: 1840 },
      { x: 2200, y: 340, left: 1980, right: 2450 },
    ],

    lantern: { x: 2780, y: 163 },

    spawnX: 60,
  },

];

