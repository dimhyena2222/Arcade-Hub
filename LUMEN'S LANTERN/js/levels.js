/* ============================================================
   LUMEN'S LANTERN — Level Definitions
   ============================================================ */

/*
  Platform format  : { x, y, w, h }   (top-left, world-space)
  Crystal / Ember  : { x, y }         (center, world-space)
  Lantern          : { x, y }         (center, world-space)
  Shadow creature  : { x, y, left, right }
  Mirror           : { x, y }         (center atop its platform)
  Beam waypoints   : [ {x, y}, … ]   (world-space, for LightBeam)
  Trees            : [ { x, tall, type } ]  0=round, 1=pine
*/

const LEVELS = [

  /* ══════════════════════════════════════════════════════════
     LEVEL 1 — MOSSY GLEN
     Mission: Find the 3 Forest Crystals, then light the lantern
     Theme  : Forest dawn, soft greens and amber sky
  ══════════════════════════════════════════════════════════ */
  {
    id:         1,
    name:       'Mossy Glen',
    flavour:    'A gentle forest waking up at dawn…',
    mission:    'Collect the 3 Forest Crystals to awaken the sleeping lantern.',
    theme:      'forest',
    worldWidth: 2450,

    // Sky gradient colours  [top, bottom]
    skyTop:    '#1a2a12',
    skyBottom: '#3a5c2a',

    // Ground fill
    groundColor: '#2d4a1e',
    groundTop:   '#4a7a30',

    // Mist / fog colour
    mistColor: 'rgba(100,180,80,0.12)',

    platforms: [
      // Continuous ground
      { x: 0,    y: 450, w: 2450, h: 50 },
      // Floating platforms – gentle staircase feel
      { x: 180,  y: 360, w: 130, h: 16 },
      { x: 390,  y: 295, w: 110, h: 16 },
      { x: 570,  y: 355, w: 120, h: 16 },
      { x: 740,  y: 270, w:  95, h: 16 },
      { x: 880,  y: 345, w: 120, h: 16 },
      { x: 1040, y: 280, w: 105, h: 16 },
      { x: 1180, y: 350, w: 115, h: 16 },
      { x: 1350, y: 225, w:  95, h: 16 },
      { x: 1480, y: 310, w: 120, h: 16 },
      { x: 1640, y: 245, w: 105, h: 16 },
      { x: 1780, y: 345, w: 115, h: 16 },
      { x: 1930, y: 265, w: 120, h: 16 },
      { x: 2080, y: 330, w: 105, h: 16 },
      { x: 2220, y: 200, w: 150, h: 16 },   // ← final high platform
    ],

    crystals: [
      { x: 622,  y: 328, color: '#7af0c8' },   // on platform y=355
      { x: 787,  y: 243, color: '#a0c8ff' },   // on platform y=270
      { x: 2295, y: 173, color: '#f0c860' },   // on final high platform y=200
    ],

    embers:   [],
    mirrors:  [],
    beamWaypoints: [],

    shadows: [],

    lantern: { x: 2340, y: 424 },   // sitting on ground near end

    spawnX: 60,
    spawnY: 410,

    trees: [
      { x: 100,  tall: 90,  type: 0 },
      { x: 300,  tall: 110, type: 1 },
      { x: 500,  tall: 80,  type: 0 },
      { x: 680,  tall: 130, type: 1 },
      { x: 850,  tall: 95,  type: 0 },
      { x: 1020, tall: 115, type: 1 },
      { x: 1200, tall: 85,  type: 0 },
      { x: 1400, tall: 125, type: 1 },
      { x: 1580, tall: 100, type: 0 },
      { x: 1750, tall: 90,  type: 1 },
      { x: 1940, tall: 120, type: 0 },
      { x: 2100, tall: 110, type: 1 },
      { x: 2300, tall: 100, type: 0 },
    ],
  },

  /* ══════════════════════════════════════════════════════════
     LEVEL 2 — CRYSTAL CAVERN
     Mission: Activate 3 Ancient Mirrors to guide light to lantern
     Theme  : Deep cave, blue-violet crystals and starlight
  ══════════════════════════════════════════════════════════ */
  {
    id:         2,
    name:       'Crystal Cavern',
    flavour:    'Deep underground, forgotten starlight sleeps in mirrors…',
    mission:    'Step on the 3 Ancient Mirrors to guide starlight to the Cave Lantern.',
    theme:      'cave',
    worldWidth: 2650,

    skyTop:    '#060e1a',
    skyBottom: '#0f1e38',
    groundColor: '#10183a',
    groundTop:   '#1e2e5a',
    mistColor: 'rgba(60,80,200,0.1)',

    platforms: [
      // Ground sections with gaps
      { x: 0,    y: 450, w: 260, h: 50 },
      { x: 340,  y: 450, w: 280, h: 50 },
      { x: 720,  y: 450, w: 240, h: 50 },
      { x: 1060, y: 450, w: 280, h: 50 },
      { x: 1460, y: 450, w: 290, h: 50 },
      { x: 1860, y: 450, w: 260, h: 50 },
      { x: 2230, y: 450, w: 420, h: 50 },
      // Floating platforms
      { x: 180,  y: 375, w: 115, h: 16 },
      { x: 370,  y: 310, w: 125, h: 16 },
      { x: 560,  y: 370, w: 105, h: 16 },
      { x: 730,  y: 280, w: 115, h: 16 },
      { x: 910,  y: 340, w: 120, h: 16 },
      { x: 1070, y: 268, w: 105, h: 16 },
      { x: 1230, y: 340, w: 120, h: 16 },
      { x: 1390, y: 248, w: 115, h: 16 },
      { x: 1540, y: 320, w: 105, h: 16 },
      { x: 1690, y: 238, w: 125, h: 16 },
      { x: 1840, y: 330, w: 105, h: 16 },
      { x: 1990, y: 258, w: 130, h: 16 },
      { x: 2150, y: 325, w: 105, h: 16 },
      { x: 2310, y: 196, w: 145, h: 16 },   // ← final high platform
    ],

    crystals: [],
    embers:   [],

    // Mirror x = center of its platform, y = platform top y
    mirrors: [
      { x: 433,  y: 310 },   // platform y=310
      { x: 1123, y: 268 },   // platform y=268
      { x: 1753, y: 238 },   // platform y=238
    ],

    // Beam: source → mirror1 → mirror2 → mirror3 → lantern
    beamWaypoints: [
      { x: 30,   y: 250 },   // source in the cave wall
      { x: 433,  y: 265 },   // mirror 1 face
      { x: 1123, y: 224 },   // mirror 2 face
      { x: 1753, y: 194 },   // mirror 3 face
      { x: 2383, y: 174 },   // lantern
    ],

    shadows: [
      { x: 720,  y: 433, left: 720,  right: 1060 },
      { x: 1460, y: 433, left: 1460, right: 1860 },
    ],

    lantern: { x: 2383, y: 174 },   // on final high platform y=196

    spawnX: 60,
    spawnY: 410,

    trees: [
      { x: 120,  tall: 60,  type: 2 },   // stalactite-style
      { x: 400,  tall: 55,  type: 2 },
      { x: 700,  tall: 70,  type: 2 },
      { x: 950,  tall: 50,  type: 2 },
      { x: 1200, tall: 65,  type: 2 },
      { x: 1500, tall: 55,  type: 2 },
      { x: 1800, tall: 75,  type: 2 },
      { x: 2050, tall: 60,  type: 2 },
      { x: 2350, tall: 65,  type: 2 },
    ],
  },

  /* ══════════════════════════════════════════════════════════
     LEVEL 3 — SHADOW CANOPY
     Mission: Gather 4 Ancient Embers to relight the Great Lantern
     Theme  : Midnight forest, heavy shadow, canopy stars
  ══════════════════════════════════════════════════════════ */
  {
    id:         3,
    name:       'Shadow Canopy',
    flavour:    'The ancient forest holds its breath in the long dark…',
    mission:    'Gather the 4 Ancient Embers and relight the Great Lantern.',
    theme:      'night',
    worldWidth: 2850,

    skyTop:    '#04060e',
    skyBottom: '#0b0d22',
    groundColor: '#080c14',
    groundTop:   '#141c2e',
    mistColor: 'rgba(20,10,60,0.15)',

    platforms: [
      // Broken ground with gaps
      { x: 0,    y: 450, w: 200, h: 50 },
      { x: 280,  y: 450, w: 190, h: 50 },
      { x: 550,  y: 450, w: 200, h: 50 },
      { x: 820,  y: 450, w: 160, h: 50 },
      { x: 1080, y: 450, w: 220, h: 50 },
      { x: 1400, y: 450, w: 190, h: 50 },
      { x: 1680, y: 450, w: 200, h: 50 },
      { x: 1980, y: 450, w: 190, h: 50 },
      { x: 2270, y: 450, w: 580, h: 50 },
      // Floating platforms – denser layout
      { x: 170,  y: 385, w: 105, h: 16 },
      { x: 348,  y: 326, w: 115, h: 16 },
      { x: 506,  y: 388, w: 105, h: 16 },
      { x: 666,  y: 305, w: 125, h: 16 },
      { x: 848,  y: 376, w: 105, h: 16 },
      { x: 1006, y: 262, w: 115, h: 16 },
      { x: 1160, y: 345, w: 105, h: 16 },
      { x: 1318, y: 255, w: 125, h: 16 },
      { x: 1466, y: 336, w: 105, h: 16 },
      { x: 1610, y: 215, w: 135, h: 16 },
      { x: 1770, y: 338, w: 110, h: 16 },
      { x: 1906, y: 235, w: 125, h: 16 },
      { x: 2064, y: 308, w: 105, h: 16 },
      { x: 2210, y: 175, w: 165, h: 16 },   // ember 4 here
      { x: 2470, y: 335, w: 125, h: 16 },
      { x: 2620, y: 195, w: 185, h: 16 },   // Great Lantern here
    ],

    crystals: [],

    embers: [
      { x: 403,  y: 296 },   // platform y=326
      { x: 1061, y: 232 },   // platform y=262
      { x: 1678, y: 188 },   // platform y=215  (← tough reach!)
      { x: 2293, y: 148 },   // platform y=175
    ],

    mirrors:  [],
    beamWaypoints: [],

    shadows: [
      { x: 280,  y: 435, left: 280,  right: 550  },
      { x: 820,  y: 435, left: 820,  right: 1080 },
      { x: 1400, y: 435, left: 1400, right: 1680 },
      { x: 1980, y: 435, left: 1980, right: 2270 },
    ],

    lantern: { x: 2713, y: 170 },   // on final platform y=195

    spawnX: 60,
    spawnY: 410,

    trees: [
      { x: 80,   tall: 140, type: 0 },
      { x: 300,  tall: 160, type: 1 },
      { x: 500,  tall: 130, type: 0 },
      { x: 730,  tall: 175, type: 1 },
      { x: 940,  tall: 145, type: 0 },
      { x: 1140, tall: 165, type: 1 },
      { x: 1360, tall: 140, type: 0 },
      { x: 1580, tall: 170, type: 1 },
      { x: 1800, tall: 155, type: 0 },
      { x: 2020, tall: 160, type: 1 },
      { x: 2240, tall: 145, type: 0 },
      { x: 2460, tall: 165, type: 1 },
      { x: 2680, tall: 150, type: 0 },
    ],
  },

];
