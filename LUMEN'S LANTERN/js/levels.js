/* ============================================================
   LUMEN'S LANTERN — Level Definitions (v2 — Solara Arc)
   ============================================================

   New in v2:
     coins        : [{x,y}] — collectable gold coins (shop currency)
     pipes        : [{x, type, zoneId}] — portal to underground zone
     glintwick    : {x} — firefly vendor NPC spawn position
     vineAnchors  : [{x,y}] — press E to vine-dash (after buying ability)
     underground  : [{...}] — underground room definitions (800px wide)
     solara       : {x,y} — rescue target (Level 3 only)
     shadowBrambles: [{x,w}] — blocks Solara until all objectives met
*/

const LEVELS = [

  /* ══════════════════════════════════════════════════════════
     LEVEL 1 — MOSSY GLEN
     Glintwick is here with news of Solara.
  ══════════════════════════════════════════════════════════ */
  {
    id:         1,
    name:       'Mossy Glen',
    flavour:    'A firefly named Glintwick has heard whispers — Solara is missing…',
    mission:    'Collect the 3 Forest Crystals and speak with Glintwick.',
    theme:      'forest',
    worldWidth: 2600,
    ceilY:      28,

    skyTop:    '#1a2a10', skyBottom: '#4a7a28',
    horizonColor: '#6aaa3a', groundFill: '#1e3412',
    groundTop: '#3a6020', mistColor: 'rgba(120,200,80,0.10)',

    terrain: [
      {x:0,y:440},{x:180,y:435},{x:380,y:420},{x:560,y:400},{x:720,y:380},
      {x:900,y:360},{x:1060,y:390},{x:1220,y:340},{x:1380,y:310},{x:1530,y:350},
      {x:1680,y:290},{x:1830,y:260},{x:1970,y:300},{x:2100,y:270},{x:2240,y:240},
      {x:2380,y:260},{x:2500,y:250},{x:2600,y:255},
    ],

    farTrees: [
      {x:150,type:'pine',scale:1.0},{x:340,type:'round',scale:0.9},{x:560,type:'pine',scale:1.1},
      {x:780,type:'round',scale:1.0},{x:1000,type:'pine',scale:0.95},{x:1220,type:'round',scale:1.05},
      {x:1460,type:'pine',scale:1.0},{x:1680,type:'round',scale:1.1},{x:1900,type:'pine',scale:0.9},
      {x:2120,type:'round',scale:1.0},{x:2340,type:'pine',scale:1.05},{x:2540,type:'round',scale:0.95},
    ],
    midTrees: [
      {x:80,type:'round',scale:1.4},{x:260,type:'pine',scale:1.6},{x:440,type:'round',scale:1.3},
      {x:640,type:'pine',scale:1.5},{x:830,type:'round',scale:1.4},{x:1020,type:'pine',scale:1.7},
      {x:1180,type:'round',scale:1.5},{x:1360,type:'pine',scale:1.4},{x:1540,type:'round',scale:1.6},
      {x:1730,type:'pine',scale:1.5},{x:1910,type:'round',scale:1.3},{x:2080,type:'pine',scale:1.6},
      {x:2260,type:'round',scale:1.5},{x:2440,type:'pine',scale:1.4},
    ],
    closeTrees: [
      {x:200,type:'oak',scale:1.0},{x:550,type:'pine',scale:0.9},{x:920,type:'oak',scale:1.1},
      {x:1300,type:'pine',scale:1.0},{x:1650,type:'oak',scale:0.95},{x:2050,type:'pine',scale:1.0},
      {x:2400,type:'oak',scale:0.9},
    ],
    foliage: [
      {x:180,w:160,y:180},{x:500,w:200,y:160},{x:850,w:180,y:170},{x:1200,w:210,y:155},
      {x:1560,w:190,y:145},{x:1900,w:200,y:140},{x:2250,w:180,y:130},
    ],
    details: [
      {type:'flowers',x:140,color:'#ff88aa'},{type:'flowers',x:380,color:'#ffcc44'},
      {type:'mushroom',x:630},{type:'stream',x:780,w:60},{type:'flowers',x:1020,color:'#aa88ff'},
      {type:'moss',x:1150,w:100},{type:'stream',x:1440,w:80},{type:'mushroom',x:1700},
      {type:'flowers',x:1880,color:'#ff88aa'},{type:'stream',x:2100,w:70},
      {type:'moss',x:2320,w:120},{type:'flowers',x:2480,color:'#ffcc44'},
    ],

    // ── New in v2 ─────────────────────────────────────────────
    coins: [
      {x:180,y:395},{x:420,y:372},{x:640,y:348},{x:900,y:320},
      {x:1080,y:352},{x:1320,y:288},{x:1540,y:315},{x:1760,y:254},
      {x:2010,y:270},{x:2360,y:218},
    ],

    glintwick: { x: 360 },

    pipes: [
      { x: 700, type: 'root', zoneId: 0 },
    ],

    vineAnchors: [],

    underground: [
      {
        id: 0, name: 'Root Hollow',
        spawnX: 70, exitX: 720, type: 'root',
        theme: 'cave',
        skyTop: '#060c08', skyBottom: '#0a1410',
        groundFill: '#1a2a10', groundTop: '#2a4018',
        mistColor: 'rgba(60,160,40,0.08)',
        terrain: [
          {x:0,y:415},{x:80,y:408},{x:180,y:395},{x:280,y:400},{x:380,y:385},
          {x:480,y:392},{x:580,y:388},{x:680,y:400},{x:800,y:415},
        ],
        coins: [
          {x:100,y:368},{x:195,y:358},{x:300,y:366},{x:400,y:348},
          {x:500,y:355},{x:600,y:360},{x:695,y:370},{x:370,y:318},
        ],
      },
    ],

    // ── Existing entities ──────────────────────────────────────
    crystals: [
      {x:720,y:330,color:'#7af0c8'},{x:1300,y:260,color:'#a0c8ff'},{x:2300,y:185,color:'#f0c860'},
    ],
    embers: [], mirrors: [], beamWaypoints: [], shadows: [],
    lantern: { x: 2530, y: 210 },
    spawnX: 60,
  },

  /* ══════════════════════════════════════════════════════════
     LEVEL 2 — CRYSTAL CAVERN
     Clues about Solara are etched in the ancient mirrors.
  ══════════════════════════════════════════════════════════ */
  {
    id:         2,
    name:       'Crystal Cavern',
    flavour:    'The mirrors remember… Solara passed this way.',
    mission:    'Activate the 3 Ancient Mirrors — they hold the path to Solara.',
    theme:      'cave',
    worldWidth: 2700,
    ceilY:      60,

    skyTop:'#04080e', skyBottom:'#0c1830',
    horizonColor:'#162850', groundFill:'#0a1228',
    groundTop:'#182240', mistColor:'rgba(40,70,200,0.12)',

    terrain: [
      {x:0,y:450},{x:200,y:445},{x:400,y:430},{x:580,y:420},{x:760,y:440},
      {x:940,y:410},{x:1120,y:395},{x:1280,y:420},{x:1440,y:388},{x:1600,y:360},
      {x:1760,y:385},{x:1920,y:340},{x:2060,y:310},{x:2200,y:340},{x:2360,y:295},
      {x:2500,y:270},{x:2620,y:260},{x:2700,y:262},
    ],

    farTrees: [
      {x:120,type:'stala',scale:1.0},{x:350,type:'stala',scale:1.2},{x:600,type:'stala',scale:0.9},
      {x:850,type:'stala',scale:1.1},{x:1100,type:'stala',scale:1.0},{x:1380,type:'stala',scale:1.3},
      {x:1640,type:'stala',scale:0.95},{x:1900,type:'stala',scale:1.1},{x:2150,type:'stala',scale:1.0},
      {x:2420,type:'stala',scale:1.2},{x:2620,type:'stala',scale:0.9},
    ],
    midTrees: [
      {x:100,type:'crystal',scale:1.3},{x:300,type:'crystal',scale:1.5},{x:520,type:'crystal',scale:1.2},
      {x:730,type:'crystal',scale:1.6},{x:950,type:'crystal',scale:1.4},{x:1140,type:'crystal',scale:1.3},
      {x:1340,type:'crystal',scale:1.5},{x:1540,type:'crystal',scale:1.2},{x:1760,type:'crystal',scale:1.6},
      {x:1980,type:'crystal',scale:1.4},{x:2200,type:'crystal',scale:1.3},{x:2420,type:'crystal',scale:1.5},
    ],
    closeTrees: [
      {x:280,type:'stala',scale:1.0},{x:650,type:'stala',scale:1.1},{x:1050,type:'stala',scale:1.0},
      {x:1480,type:'stala',scale:0.95},{x:1870,type:'stala',scale:1.1},{x:2340,type:'stala',scale:1.0},
    ],
    foliage: [],
    details: [
      {type:'cavecrystal',x:160,color:'#60aaff'},{type:'pool',x:400,w:70},
      {type:'cavecrystal',x:660,color:'#aa60ff'},{type:'cavecrystal',x:920,color:'#60ffcc'},
      {type:'pool',x:1180,w:90},{type:'cavecrystal',x:1420,color:'#60aaff'},
      {type:'pool',x:1680,w:60},{type:'cavecrystal',x:1940,color:'#ff60aa'},
      {type:'cavecrystal',x:2200,color:'#60ccff'},{type:'pool',x:2440,w:80},
    ],

    // ── New in v2 ─────────────────────────────────────────────
    coins: [
      {x:180,y:408},{x:400,y:392},{x:620,y:404},{x:860,y:378},
      {x:1060,y:358},{x:1260,y:394},{x:1480,y:352},{x:1700,y:340},
      {x:1940,y:295},{x:2180,y:318},
    ],

    glintwick: { x: 200 },

    pipes: [
      { x: 1050, type: 'root', zoneId: 0 },
    ],

    vineAnchors: [
      { x: 720,  y: 280 },
      { x: 1520, y: 295 },
    ],

    underground: [
      {
        id: 0, name: 'Crystal Heart',
        spawnX: 70, exitX: 720, type: 'root',
        theme: 'cave',
        skyTop: '#020408', skyBottom: '#060c1a',
        groundFill: '#0a1228', groundTop: '#162040',
        mistColor: 'rgba(40,40,180,0.10)',
        terrain: [
          {x:0,y:420},{x:100,y:412},{x:200,y:405},{x:320,y:410},{x:420,y:398},
          {x:520,y:405},{x:640,y:400},{x:720,y:410},{x:800,y:418},
        ],
        coins: [
          {x:110,y:378},{x:215,y:368},{x:320,y:372},{x:420,y:358},
          {x:526,y:365},{x:638,y:372},
        ],
      },
    ],

    // ── Existing entities ──────────────────────────────────────
    crystals: [], embers: [],
    mirrors: [
      {x:580,y:370},{x:1300,y:330},{x:2020,y:285},
    ],
    beamWaypoints: [
      {x:30,y:300},{x:580,y:320},{x:1300,y:278},{x:2020,y:235},{x:2610,y:215},
    ],
    shadows: [
      {x:750,y:420,left:600,right:1000},{x:1650,y:380,left:1440,right:1920},
    ],
    lantern: { x: 2620, y: 215 },
    spawnX: 60,
  },

  /* ══════════════════════════════════════════════════════════
     LEVEL 3 — SHADOW CANOPY
     Solara is trapped here. Gather the embers to free her.
  ══════════════════════════════════════════════════════════ */
  {
    id:         3,
    name:       'Shadow Canopy',
    flavour:    'Somewhere in this darkness, Solara waits…',
    mission:    'Gather the 4 Ancient Embers to dissolve the shadow brambles and free Solara!',
    theme:      'night',
    worldWidth: 2900,
    ceilY:      22,

    skyTop:'#02030a', skyBottom:'#080a1a',
    horizonColor:'#10142e', groundFill:'#060810',
    groundTop:'#101626', mistColor:'rgba(15,10,50,0.18)',

    terrain: [
      {x:0,y:450},{x:200,y:442},{x:380,y:425},{x:560,y:410},{x:740,y:390},
      {x:900,y:415},{x:1060,y:375},{x:1220,y:340},{x:1380,y:370},{x:1540,y:310},
      {x:1700,y:280},{x:1840,y:310},{x:2000,y:260},{x:2160,y:230},{x:2300,y:255},
      {x:2460,y:210},{x:2620,y:195},{x:2750,y:210},{x:2900,y:220},
    ],

    farTrees: [
      {x:130,type:'pine',scale:1.2},{x:330,type:'pine',scale:1.4},{x:550,type:'pine',scale:1.1},
      {x:760,type:'pine',scale:1.3},{x:980,type:'pine',scale:1.2},{x:1190,type:'pine',scale:1.5},
      {x:1420,type:'pine',scale:1.1},{x:1650,type:'pine',scale:1.3},{x:1880,type:'pine',scale:1.2},
      {x:2110,type:'pine',scale:1.4},{x:2340,type:'pine',scale:1.1},{x:2570,type:'pine',scale:1.3},
      {x:2780,type:'pine',scale:1.2},
    ],
    midTrees: [
      {x:80,type:'pine',scale:1.8},{x:270,type:'round',scale:1.6},{x:470,type:'pine',scale:2.0},
      {x:680,type:'round',scale:1.7},{x:890,type:'pine',scale:1.9},{x:1100,type:'round',scale:1.8},
      {x:1310,type:'pine',scale:2.1},{x:1520,type:'round',scale:1.7},{x:1740,type:'pine',scale:2.0},
      {x:1960,type:'round',scale:1.8},{x:2180,type:'pine',scale:1.9},{x:2400,type:'round',scale:2.0},
      {x:2620,type:'pine',scale:1.8},{x:2820,type:'round',scale:1.7},
    ],
    closeTrees: [
      {x:220,type:'oak',scale:1.2},{x:620,type:'pine',scale:1.0},{x:1030,type:'oak',scale:1.1},
      {x:1450,type:'pine',scale:1.0},{x:1860,type:'oak',scale:1.2},{x:2280,type:'pine',scale:1.0},
      {x:2680,type:'oak',scale:1.1},
    ],
    foliage: [
      {x:150,w:220,y:165},{x:480,w:260,y:145},{x:820,w:240,y:150},{x:1160,w:280,y:130},
      {x:1500,w:250,y:120},{x:1850,w:270,y:105},{x:2200,w:260,y:95},{x:2560,w:250,y:90},
    ],
    details: [
      {type:'mushroom',x:160},{type:'flowers',x:420,color:'#6640ff'},
      {type:'mushroom',x:700},{type:'stream',x:960,w:60},
      {type:'flowers',x:1240,color:'#ff4488'},{type:'mushroom',x:1520},
      {type:'stream',x:1780,w:80},{type:'flowers',x:2040,color:'#4488ff'},
      {type:'mushroom',x:2320},{type:'flowers',x:2580,color:'#ff6644'},
    ],

    // ── New in v2 ─────────────────────────────────────────────
    coins: [
      {x:210,y:402},{x:450,y:375},{x:700,y:354},{x:940,y:378},
      {x:1160,y:312},{x:1420,y:278},{x:1700,y:248},{x:1970,y:228},
      {x:2290,y:200},{x:2580,y:162},
    ],

    glintwick: { x: 220 },

    pipes: [
      { x: 560, type: 'root', zoneId: 0 },
    ],

    vineAnchors: [
      { x: 820,  y: 258 },
      { x: 1460, y: 220 },
      { x: 2120, y: 178 },
    ],

    underground: [
      {
        id: 0, name: 'Shadow Burrow',
        spawnX: 70, exitX: 720, type: 'root',
        theme: 'night',
        skyTop: '#010205', skyBottom: '#050810',
        groundFill: '#060810', groundTop: '#0e1220',
        mistColor: 'rgba(15,5,40,0.15)',
        terrain: [
          {x:0,y:418},{x:100,y:410},{x:200,y:405},{x:300,y:412},{x:400,y:400},
          {x:500,y:408},{x:620,y:402},{x:720,y:412},{x:800,y:420},
        ],
        coins: [
          {x:105,y:378},{x:210,y:368},{x:325,y:374},{x:430,y:362},{x:580,y:370},
        ],
      },
    ],

    // Solara — trapped sprite (freed when all embers collected)
    solara: { x: 2680, y: 165 },

    // Shadow brambles encasing Solara
    shadowBrambles: [
      { x: 2640, w: 80  },
      { x: 2720, w: 80  },
    ],

    // ── Existing entities ──────────────────────────────────────
    crystals: [],
    embers: [
      {x:680,y:345},{x:1180,y:280},{x:1800,y:218},{x:2560,y:148},
    ],
    mirrors: [], beamWaypoints: [],
    shadows: [
      {x:400,y:400,left:200,right:750},{x:1000,y:390,left:800,right:1300},
      {x:1600,y:370,left:1360,right:1840},{x:2200,y:340,left:1980,right:2450},
    ],
    lantern: { x: 2780, y: 163 },
    spawnX: 60,
  },

];
