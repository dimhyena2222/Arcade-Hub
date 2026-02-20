// ============================================================
//  TIDEBREAK: Legacy of the Storms — DATA.JS
//  All static game data: creatures, moves, items, dialogue
// ============================================================

'use strict';

// ─── TYPE SYSTEM ────────────────────────────────────────────
const TYPE_CHART = {
    // [attacker][defender] = multiplier (2 = super, 0.5 = resist, 0 = immune)
    EMBER:  { EMBER:1, STONE:0.5, TIDE:0.5, FLORA:2,  GALE:1,   VOLT:1   },
    STONE:  { EMBER:2, STONE:1,   TIDE:1,   FLORA:0.5, GALE:0.5, VOLT:1   },
    TIDE:   { EMBER:2, STONE:1,   TIDE:0.5, FLORA:0.5, GALE:1,   VOLT:0.5 },
    FLORA:  { EMBER:0.5,STONE:2,  TIDE:2,   FLORA:0.5, GALE:1,   VOLT:1   },
    GALE:   { EMBER:1, STONE:2,   TIDE:1,   FLORA:1,   GALE:0.5, VOLT:0.5 },
    VOLT:   { EMBER:1, STONE:0.5, TIDE:2,   FLORA:1,   GALE:2,   VOLT:0.5 },
};

// ─── WEATHER STATES ─────────────────────────────────────────
const WEATHER = {
    CLEAR:    { label: '☀ Clear Skies',   class: '',        typeBonus: null,    typePenalty: null    },
    RAIN:     { label: '🌧 Tidal Storm',   class: 'rainy',   typeBonus: 'TIDE',  typePenalty: 'EMBER' },
    ASHFALL:  { label: '🌋 Ashfall',       class: 'ashfall', typeBonus: 'EMBER', typePenalty: 'FLORA' },
    GALE:     { label: '💨 Storm Gale',    class: 'stormy',  typeBonus: 'GALE',  typePenalty: null    },
    SURGE:    { label: '⚡ Volt Surge',    class: 'surge',   typeBonus: 'VOLT',  typePenalty: 'TIDE'  },
};

// ─── MOVES DATABASE ─────────────────────────────────────────
const MOVES = {
    // ── EMBER ──
    ember_lash: {
        id: 'ember_lash',
        name: 'Ember Lash',
        type: 'EMBER',
        power: 45,
        aetCost: 0,
        accuracy: 95,
        description: 'A basic strike wrapped in volcanic heat.',
        weatherBonus: 'ASHFALL',
    },
    magma_burst: {
        id: 'magma_burst',
        name: 'Magma Burst',
        type: 'EMBER',
        power: 80,
        aetCost: 30,
        accuracy: 85,
        description: 'Launches superheated magma from the crest. Boosted in Ashfall.',
        weatherBonus: 'ASHFALL',
    },
    shell_ignite: {
        id: 'shell_ignite',
        name: 'Shell Ignite',
        type: 'EMBER',
        power: 0,
        aetCost: 20,
        accuracy: 100,
        description: 'Raises own ATK by heating the shell core. No damage.',
        effect: { target: 'self', stat: 'atk', stages: 1 },
    },
    cinder_stomp: {
        id: 'cinder_stomp',
        name: 'Cinder Stomp',
        type: 'EMBER',
        power: 60,
        aetCost: 15,
        accuracy: 90,
        description: 'A heavy stomp that scorches the ground underfoot.',
    },

    // ── STONE ──
    rock_crash: {
        id: 'rock_crash',
        name: 'Rock Crash',
        type: 'STONE',
        power: 50,
        aetCost: 0,
        accuracy: 90,
        description: 'Slams the enemy with raw mineral force.',
    },
    granite_wall: {
        id: 'granite_wall',
        name: 'Granite Wall',
        type: 'STONE',
        power: 0,
        aetCost: 25,
        accuracy: 100,
        description: 'Raises own DEF dramatically by hardening the outer shell.',
        effect: { target: 'self', stat: 'def', stages: 2 },
    },
    boulder_roll: {
        id: 'boulder_roll',
        name: 'Boulder Roll',
        type: 'STONE',
        power: 75,
        aetCost: 25,
        accuracy: 85,
        description: 'Curls into a boulder and crashes forward.',
    },

    // ── TIDE ──
    tide_strike: {
        id: 'tide_strike',
        name: 'Tide Strike',
        type: 'TIDE',
        power: 45,
        aetCost: 0,
        accuracy: 95,
        description: 'A basic water-infused slash.',
        weatherBonus: 'RAIN',
    },
    reef_surge: {
        id: 'reef_surge',
        name: 'Reef Surge',
        type: 'TIDE',
        power: 70,
        aetCost: 20,
        accuracy: 90,
        description: 'Fires a pressurized wave from bioluminescent fins. Boosted in Tidal Storm.',
        weatherBonus: 'RAIN',
    },
    brine_whip: {
        id: 'brine_whip',
        name: 'Brine Whip',
        type: 'TIDE',
        power: 55,
        aetCost: 10,
        accuracy: 95,
        description: 'A stinging lash of saltwater that may lower enemy SPD.',
        effect: { target: 'enemy', stat: 'spd', stages: -1, chance: 0.3 },
    },
    deep_current: {
        id: 'deep_current',
        name: 'Deep Current',
        type: 'TIDE',
        power: 90,
        aetCost: 40,
        accuracy: 80,
        description: 'Channels an ancient abyssal current for massive damage.',
        weatherBonus: 'RAIN',
    },

    // ── FLORA ──
    vine_snap: {
        id: 'vine_snap',
        name: 'Vine Snap',
        type: 'FLORA',
        power: 45,
        aetCost: 0,
        accuracy: 95,
        description: 'Whips the enemy with a sea-vine tendril.',
    },
    spore_veil: {
        id: 'spore_veil',
        name: 'Spore Veil',
        type: 'FLORA',
        power: 0,
        aetCost: 20,
        accuracy: 100,
        description: 'Releases bioluminescent spores. Raises own DEF.',
        effect: { target: 'self', stat: 'def', stages: 1 },
    },
    root_bind: {
        id: 'root_bind',
        name: 'Root Bind',
        type: 'FLORA',
        power: 40,
        aetCost: 15,
        accuracy: 90,
        description: 'Entangles the enemy in aquatic roots. Slows SPD.',
        effect: { target: 'enemy', stat: 'spd', stages: -1, chance: 0.5 },
    },
    verdant_bloom: {
        id: 'verdant_bloom',
        name: 'Verdant Bloom',
        type: 'FLORA',
        power: 0,
        aetCost: 35,
        accuracy: 100,
        description: 'Restores 30% max VIT. Heals self.',
        effect: { target: 'self', heal: 0.30 },
    },

    // ── GALE ──
    gust_claw: {
        id: 'gust_claw',
        name: 'Gust Claw',
        type: 'GALE',
        power: 40,
        aetCost: 0,
        accuracy: 100,
        description: 'A razor wind scratch. Never misses.',
        weatherBonus: 'GALE',
    },
    updraft: {
        id: 'updraft',
        name: 'Updraft',
        type: 'GALE',
        power: 0,
        aetCost: 15,
        accuracy: 100,
        description: 'Raises own SPD by riding a thermal column.',
        effect: { target: 'self', stat: 'spd', stages: 2 },
    },
    cyclone_blade: {
        id: 'cyclone_blade',
        name: 'Cyclone Blade',
        type: 'GALE',
        power: 75,
        aetCost: 25,
        accuracy: 90,
        description: 'Spins into a cutting vortex. Boosted during Storm Gale.',
        weatherBonus: 'GALE',
    },
    sky_slam: {
        id: 'sky_slam',
        name: 'Sky Slam',
        type: 'GALE',
        power: 95,
        aetCost: 45,
        accuracy: 80,
        description: 'Plummets from altitude with devastating force.',
    },

    // ── VOLT ──
    spark_bite: {
        id: 'spark_bite',
        name: 'Spark Bite',
        type: 'VOLT',
        power: 40,
        aetCost: 0,
        accuracy: 100,
        description: 'A quick electrostatic nip.',
        weatherBonus: 'SURGE',
    },
    static_burst: {
        id: 'static_burst',
        name: 'Static Burst',
        type: 'VOLT',
        power: 65,
        aetCost: 20,
        accuracy: 90,
        description: 'Discharges built-up static in a burst. Boosted in Volt Surge.',
        weatherBonus: 'SURGE',
    },
    lightning_dive: {
        id: 'lightning_dive',
        name: 'Lightning Dive',
        type: 'VOLT',
        power: 85,
        aetCost: 35,
        accuracy: 85,
        description: 'Charges at blinding speed wrapped in an electrical corona.',
        weatherBonus: 'SURGE',
    },
};

// ─── CREATURE TEMPLATES ─────────────────────────────────────
// baseStats: { vit, atk, def, spd, aet }
// VIT = HP pool, ATK = offense, DEF = defense, SPD = speed (determines first turn), AET = resource pool

const CREATURE_DEFS = {

    // ═══ STARTERS ═══

    pyroshell: {
        id: 'pyroshell',
        name: 'PYROSHELL',
        types: ['EMBER', 'STONE'],
        desc: 'A stoic ember tortoise. Its volcanic shell hardens under pressure.',
        spriteClass: 'pyroshell-sprite',
        baseStats: { vit: 90, atk: 55, def: 80, spd: 35, aet: 70 },
        learnset: ['ember_lash', 'rock_crash', 'shell_ignite', 'magma_burst', 'granite_wall', 'cinder_stomp', 'boulder_roll'],
        startMoves: ['ember_lash', 'rock_crash', 'shell_ignite'],
        catchRate: 0,           // uncatchable (starter)
        region: null,
        loreNote: 'Found near geothermal vents in Cindercrag. Rarely seen in Brinefall.',
        codexNum: '001',
    },

    verdantide: {
        id: 'verdantide',
        name: 'VERDANTIDE',
        types: ['TIDE', 'FLORA'],
        desc: 'A reef serpent with bioluminescent fins. Adapts to any current.',
        spriteClass: 'verdantide-sprite',
        baseStats: { vit: 70, atk: 65, def: 65, spd: 65, aet: 80 },
        learnset: ['tide_strike', 'vine_snap', 'spore_veil', 'reef_surge', 'brine_whip', 'root_bind', 'verdant_bloom', 'deep_current'],
        startMoves: ['tide_strike', 'vine_snap', 'spore_veil'],
        catchRate: 0,
        region: null,
        loreNote: 'Swims the brine shelf around Verdant Shelf. Glows softly at night.',
        codexNum: '002',
    },

    galeimp: {
        id: 'galeimp',
        name: 'GALEIMP',
        types: ['GALE', 'VOLT'],
        desc: 'A sky-lemur that rides thermal updrafts. Erratic and fast.',
        spriteClass: 'galeimp-sprite',
        baseStats: { vit: 45, atk: 75, def: 40, spd: 95, aet: 75 },
        learnset: ['gust_claw', 'spark_bite', 'updraft', 'static_burst', 'cyclone_blade', 'lightning_dive', 'sky_slam'],
        startMoves: ['gust_claw', 'spark_bite', 'updraft'],
        catchRate: 0,
        region: null,
        loreNote: 'Nests in sky columns above the Sky Spire. Migrates during Volt Surges.',
        codexNum: '003',
    },

    // ═══ BRINEFALL WILDS ═══

    coralshrimp: {
        id: 'coralshrimp',
        name: 'CORALSHRIMP',
        types: ['TIDE'],
        desc: 'A luminous shrimp-creature that scuttles coastal shallows.',
        spriteClass: 'wild-sprite coralshrimp-sprite',
        baseStats: { vit: 40, atk: 30, def: 35, spd: 55, aet: 40 },
        learnset: ['tide_strike', 'brine_whip'],
        startMoves: ['tide_strike', 'brine_whip'],
        catchRate: 0.65,
        region: 'brinefall',
        loreNote: 'Harmless unless cornered. Its claws secrete brine acid.',
        codexNum: '004',
    },

    driftmoss: {
        id: 'driftmoss',
        name: 'DRIFTMOSS',
        types: ['FLORA', 'TIDE'],
        desc: 'Sentient kelp-mass that drifts with the ocean current.',
        spriteClass: 'wild-sprite driftmoss-sprite',
        baseStats: { vit: 55, atk: 35, def: 55, spd: 20, aet: 60 },
        learnset: ['vine_snap', 'root_bind', 'tide_strike', 'spore_veil'],
        startMoves: ['vine_snap', 'root_bind'],
        catchRate: 0.55,
        region: 'brinefall',
        loreNote: 'Absorbs nutrients from sea salt. Completely immobile on dry land.',
        codexNum: '005',
    },

    sandpecker: {
        id: 'sandpecker',
        name: 'SANDPECKER',
        types: ['GALE'],
        desc: 'A coastal bird that skims wave crests at alarming speed.',
        spriteClass: 'wild-sprite sandpecker-sprite',
        baseStats: { vit: 38, atk: 45, def: 30, spd: 75, aet: 45 },
        learnset: ['gust_claw', 'updraft', 'cyclone_blade'],
        startMoves: ['gust_claw', 'updraft'],
        catchRate: 0.60,
        region: 'brinefall',
        loreNote: 'Mates for life. If one is caught, the other will stalk the trainer for days.',
        codexNum: '006',
    },

    gravelcrab: {
        id: 'gravelcrab',
        name: 'GRAVELCRAB',
        types: ['STONE', 'TIDE'],
        desc: 'A heavy-shelled crab that burrows in tide pools.',
        spriteClass: 'wild-sprite gravelcrab-sprite',
        baseStats: { vit: 65, atk: 50, def: 70, spd: 25, aet: 50 },
        learnset: ['rock_crash', 'tide_strike', 'granite_wall', 'boulder_roll'],
        startMoves: ['rock_crash', 'tide_strike'],
        catchRate: 0.50,
        region: 'brinefall',
        loreNote: 'The shell is prized by collectors. Do not attempt to pry it loose.',
        codexNum: '007',
    },

    thorneel: {
        id: 'thorneel',
        name: 'THORNEEL',
        types: ['VOLT', 'TIDE'],
        desc: 'An electric eel with a barbed dorsal fin. Hunts in shallow reefs.',
        spriteClass: 'wild-sprite thorneel-sprite',
        baseStats: { vit: 50, atk: 65, def: 40, spd: 60, aet: 65 },
        learnset: ['spark_bite', 'tide_strike', 'static_burst', 'brine_whip'],
        startMoves: ['spark_bite', 'tide_strike'],
        catchRate: 0.45,
        region: 'brinefall',
        loreNote: 'Accidentally electrocutes fishermen. Not malicious — just curious.',
        codexNum: '008',
    },

    ashwing: {
        id: 'ashwing',
        name: 'ASHWING',
        types: ['EMBER', 'GALE'],
        desc: 'A smoldering moth with scorched wing patterns.',
        spriteClass: 'wild-sprite ashwing-sprite',
        baseStats: { vit: 42, atk: 58, def: 35, spd: 70, aet: 55 },
        learnset: ['ember_lash', 'gust_claw', 'cinder_stomp', 'cyclone_blade'],
        startMoves: ['ember_lash', 'gust_claw'],
        catchRate: 0.55,
        region: 'brinefall',
        loreNote: 'Drawn to volcanic ash. Rare in Brinefall — a sign of Cindercrag drift.',
        codexNum: '009',
    },

    // ═══ LEGENDARIES (uncatchable via normal means) ═══

    leviatyr: {
        id: 'leviatyr',
        name: 'LEVIATYR',
        types: ['TIDE', 'STONE'],
        desc: 'The Sea Colossus. Ancient sovereign of tectonic tides.',
        spriteClass: 'legendary-sprite leviatyr-sprite',
        baseStats: { vit: 200, atk: 140, def: 130, spd: 60, aet: 120 },
        learnset: ['deep_current', 'boulder_roll', 'granite_wall', 'tide_strike'],
        startMoves: ['deep_current', 'boulder_roll', 'granite_wall', 'tide_strike'],
        catchRate: 0.02,
        region: 'abyssal_trench',
        loreNote: 'Sleeps beneath the Abyssal Trench. Its snoring causes tidal shifts.',
        codexNum: 'Ω01',
    },

    pyrodrakon: {
        id: 'pyrodrakon',
        name: 'PYRODRAKON',
        types: ['EMBER', 'STONE'],
        desc: 'The Magma Titan. Shaper of continents.',
        spriteClass: 'legendary-sprite pyrodrakon-sprite',
        baseStats: { vit: 190, atk: 160, def: 110, spd: 70, aet: 120 },
        learnset: ['magma_burst', 'boulder_roll', 'shell_ignite', 'cinder_stomp'],
        startMoves: ['magma_burst', 'boulder_roll', 'shell_ignite', 'cinder_stomp'],
        catchRate: 0.02,
        region: 'cindercrag',
        loreNote: 'Locked in volcanic stasis. The Solterra Accord mines dangerously close to its resting place.',
        codexNum: 'Ω02',
    },

    tempestara: {
        id: 'tempestara',
        name: 'TEMPESTARA',
        types: ['GALE', 'VOLT'],
        desc: 'The Storm Sovereign. The failsafe of the world itself.',
        spriteClass: 'legendary-sprite tempestara-sprite',
        baseStats: { vit: 180, atk: 150, def: 90, spd: 160, aet: 150 },
        learnset: ['sky_slam', 'lightning_dive', 'cyclone_blade', 'static_burst'],
        startMoves: ['sky_slam', 'lightning_dive', 'cyclone_blade', 'static_burst'],
        catchRate: 0,   // truly uncatchable
        region: 'sky_spire',
        loreNote: 'Appears only when both factions have gone too far. Cannot be reasoned with.',
        codexNum: 'Ω03',
    },
};

// ─── NPC / ENCOUNTER TABLES ─────────────────────────────────
const ENCOUNTER_TABLES = {
    brinefall_shore: [
        { id: 'coralshrimp', weight: 30, minLv: 2, maxLv: 4 },
        { id: 'driftmoss',   weight: 20, minLv: 2, maxLv: 4 },
        { id: 'sandpecker',  weight: 25, minLv: 3, maxLv: 5 },
        { id: 'gravelcrab',  weight: 15, minLv: 3, maxLv: 5 },
        { id: 'thorneel',    weight: 7,  minLv: 4, maxLv: 6 },
        { id: 'ashwing',     weight: 3,  minLv: 4, maxLv: 6 },
    ],
    brinefall_route1: [
        { id: 'sandpecker',  weight: 30, minLv: 3, maxLv: 6 },
        { id: 'gravelcrab',  weight: 25, minLv: 4, maxLv: 7 },
        { id: 'ashwing',     weight: 20, minLv: 4, maxLv: 7 },
        { id: 'thorneel',    weight: 15, minLv: 5, maxLv: 8 },
        { id: 'coralshrimp', weight: 10, minLv: 3, maxLv: 5 },
    ],
    brinefall_village: [],  // no encounters in village
};

// ─── NPC DATA ────────────────────────────────────────────────
const NPCS = {
    prof_maris: {
        id: 'prof_maris',
        name: 'Professor Maris',
        tile: { x: 7, y: 4 },
        sprite: 'npc-maris',
        dialogues: [
            'Oh — you\'re here! Good. I have a task that cannot wait.',
            'MISSION: Tide Shard Recovery',
            'There are three Tide Shards scattered through Brinefall and Route 1.',
            'Each shard contains a fragment of the Aether Current\'s resonance signature.',
            'I need them recovered before Solterra agents locate them first.',
            'Search the tall grass of Route 1. Creatures in that area have been seen carrying shards.',
            'Defeat or capture enough wild creatures — the shards will surface. I\'m counting on you.',
        ],
    },
    harbor_guard: {
        id: 'harbor_guard',
        name: 'Harbor Guard',
        tile: { x: 9, y: 8 },
        sprite: 'npc-guard',
        dialogues: [
            'The northern routes to Cindercrag are closed. Solterra activity.',
            'Move along, traveler.',
        ],
    },
    elder_sota: {
        id: 'elder_sota',
        name: 'Elder Sota',
        tile: { x: 3, y: 5 },
        sprite: 'npc-elder',
        dialogues: [
            'Long ago, Brinefall was the heart of the Archipelago. Now we are caught between two storms.',
            'The Titans do not hate us. They simply remember a world without us.',
        ],
    },
    route1_hiker: {
        id: 'route1_hiker',
        name: 'Route Hiker',
        tile: { x: 30, y: 7 },
        sprite: 'npc-hiker',
        dialogues: [
            'Welcome to Route 1 — the Tidepath! Wild creatures lurk in the tall grass.',
            'I\'ve spotted Sandpeckers and Gravelcrabs out here. Keep your Tide Orbs handy!',
        ],
    },
    route1_sign: {
        id: 'route1_sign',
        name: 'Sign',
        tile: { x: 24, y: 7 },
        sprite: 'npc-sign',
        dialogues: [
            '→ ROUTE 1: TIDEPATH\n  Cindercrag: 2 days east\n  Beware wild creatures!',
        ],
    },
    tidecenter_nurse: {
        id: 'tidecenter_nurse',
        name: 'Nurse Cora',
        sprite: 'npc-nurse',
        dialogues: [
            'Welcome to the Tidecenter! Your companions can rest here any time.',
            'Would you like me to place your creatures in the Restoration Chamber?',
        ],
        dialogues_rest: [
            'Placing your companions in the Restoration Chamber now...',
            '...',
            'All done! Your companions are fully restored and ready to battle!',
        ],
        dialogues_after: [
            'Your companions are all healthy! Come back any time you need to rest.',
        ],
    },
    tidecenter_pc: {
        id: 'tidecenter_pc',
        name: 'TIDEBREAK PC',
        sprite: 'npc-pc',
        dialogues: [
            'TIDEBREAK PC — Bonded Creature Storage System',
        ],
    },
};

// ─── INTRO DIALOGUE ─────────────────────────────────────────
const INTRO_DIALOGUE = [
    {
        speaker: 'Professor Maris',
        text: 'Ah — you\'re finally here. I was beginning to worry the tides had taken you.',
        bg: 'lab',
        char: 'maris',
    },
    {
        speaker: 'Professor Maris',
        text: 'I am Professor Maris. Aether researcher and creature conservationist.',
        bg: 'lab',
        char: 'maris',
    },
    {
        // Gender select step — handled specially in game.js
        speaker: 'Professor Maris',
        text: 'Now then — before we begin, I should like to record your details. Are you a boy or a girl?',
        bg: 'lab',
        char: 'maris',
        genderSelect: true,
    },
    {
        speaker: 'Professor Maris',
        text: 'The Aether Currents that flow beneath the Aurelios Archipelago are... fractured. Something has disrupted their ancient rhythm.',
        bg: 'lab',
        char: 'maris',
    },
    {
        speaker: 'Professor Maris',
        text: 'Two factions are at war over the cause — and the solution. The Abyssal Dominion. The Solterra Accord.',
        bg: 'lab',
        char: 'maris',
    },
    {
        speaker: 'Professor Maris',
        text: 'Both are wrong. Both will cause catastrophe if left unchecked. I need someone outside their reach to investigate.',
        bg: 'lab',
        char: 'maris',
    },
    {
        speaker: 'Professor Maris',
        text: 'Before you leave — I have a task for you. Three Tide Shards have scattered across Brinefall and the route east.',
        bg: 'lab',
        char: 'maris',
    },
    {
        speaker: 'Professor Maris',
        text: 'MISSION: Tide Shard Recovery. Find the shards before the Solterra agents do. Battle creatures on Route 1 — the shards will surface.',
        bg: 'lab',
        char: 'maris',
        missionGrant: 'tide_shard_recovery',
    },
    {
        speaker: 'Professor Maris',
        text: 'A researcher alone cannot traverse these islands safely. You\'ll need a companion — a creature bonded to you through trust, not capture.',
        bg: 'lab',
        char: 'maris',
    },
    {
        speaker: 'Professor Maris',
        text: 'Three creatures have chosen to make this lab their home. They are curious, unaffiliated, and — I believe — waiting for exactly this moment.',
        bg: 'lab',
        char: 'maris',
    },
    {
        speaker: 'Professor Maris',
        text: 'Choose carefully. Your bond with your first companion will define how the world sees you.',
        bg: 'lab',
        char: 'maris',
        transition: 'starter',
    },
];

// ─── REGION DEFINITIONS ─────────────────────────────────────
const REGIONS = {
    brinefall: {
        id: 'brinefall',
        name: 'Brinefall Village',
        act: 1,
        unlocked: true,
        dominantWeather: ['CLEAR', 'RAIN'],
        weatherWeights: [60, 40],
        bgClass: 'bg-coastal',
        mapPos: { x: 45, y: 72 },
        description: 'A quiet coastal settlement. The starting point of your journey. Fishermen, researchers, and faction scouts all gather here.',
    },
    cindercrag: {
        id: 'cindercrag',
        name: 'Cindercrag',
        act: 2,
        unlocked: false,
        dominantWeather: ['ASHFALL', 'CLEAR'],
        weatherWeights: [55, 45],
        bgClass: 'bg-volcanic',
        mapPos: { x: 60, y: 55 },
        description: 'A volcanic island wracked by constant Ashfall events. Solterra drilling operations have awakened something ancient.',
    },
    verdant_shelf: {
        id: 'verdant_shelf',
        name: 'Verdant Shelf',
        act: 2,
        unlocked: false,
        dominantWeather: ['RAIN', 'CLEAR', 'GALE'],
        weatherWeights: [50, 30, 20],
        bgClass: 'bg-coastal',
        mapPos: { x: 30, y: 50 },
        description: 'A lush reef-island. Abyssal Dominion territory. Bio-diverse beyond any other region.',
    },
    sky_spire: {
        id: 'sky_spire',
        name: 'Sky Spire',
        act: 3,
        unlocked: false,
        dominantWeather: ['GALE', 'SURGE'],
        weatherWeights: [60, 40],
        bgClass: 'bg-sky',
        mapPos: { x: 50, y: 25 },
        description: 'A floating atoll suspended by ancient Aether pillars. Where the storm sovereign sleeps.',
    },
};

// ─── ITEMS ───────────────────────────────────────────────────
const ITEMS = {
    tide_orb: {
        id: 'tide_orb',
        name: 'Tide Orb',
        desc: 'A capture device attuned to the ocean\'s resonance. Used to form bonds with wild creatures.',
        useInBattle: true,
        useInWorld: false,
        effect: 'capture',
    },
    reef_salve: {
        id: 'reef_salve',
        name: 'Reef Salve',
        desc: 'A poultice made from sea-flora. Restores 40 VIT.',
        useInBattle: true,
        useInWorld: true,
        effect: { heal: 40 },
    },
    storm_draft: {
        id: 'storm_draft',
        name: 'Storm Draft',
        desc: 'Condensed storm energy. Restores 40 AET.',
        useInBattle: true,
        useInWorld: true,
        effect: { restoreAet: 40 },
    },
    tide_shard: {
        id: 'tide_shard',
        name: 'Tide Shard',
        desc: 'A crystallised fragment of the Aether Current\'s resonance signature. Prof. Maris needs these recovered.',
        useInBattle: false,
        useInWorld: false,
        effect: 'quest',
        questId: 'tide_shard_recovery',
    },
};

// ─── FACTION DATA ────────────────────────────────────────────
const FACTIONS = {
    abyssal: {
        id: 'abyssal',
        name: 'Abyssal Dominion',
        shortName: 'ABYSSAL',
        color: '#1a4d6b',
        description: 'Eco-extremists who believe civilization must return to the ocean.',
        titan: 'leviatyr',
    },
    solterra: {
        id: 'solterra',
        name: 'Solterra Accord',
        shortName: 'SOLTERRA',
        color: '#8b3a0a',
        description: 'Techno-dominators who believe humanity must master nature.',
        titan: 'pyrodrakon',
    },
};

// ─── HELPER: Create a live creature instance from a definition ───
function createCreatureInstance(defId, level = 5) {
    const def = CREATURE_DEFS[defId];
    if (!def) return null;

    // Scale stats with level (simple linear scale: base + (base * 0.08 * level))
    const scale = (base) => Math.floor(base + base * 0.08 * level);

    const maxVit = scale(def.baseStats.vit);
    const maxAet = scale(def.baseStats.aet);

    // Give creature its starting moves (or up to 4 from learnset for that level)
    const availableMoves = def.learnset.slice(0, Math.min(4, def.learnset.length));

    return {
        defId: defId,
        name: def.name,
        types: [...def.types],
        spriteClass: def.spriteClass,
        level: level,
        exp: 0,
        stats: {
            maxVit: maxVit,
            vit: maxVit,
            atk: scale(def.baseStats.atk),
            def: scale(def.baseStats.def),
            spd: scale(def.baseStats.spd),
            maxAet: maxAet,
            aet: maxAet,
        },
        statStages: { atk: 0, def: 0, spd: 0 },   // -3 to +3 modifiers
        moves: availableMoves.map(id => MOVES[id]),
        catchRate: def.catchRate,
        codexNum: def.codexNum,
        loreNote: def.loreNote,
    };
}

// ─── HELPER: Create a wild creature instance for an encounter ─
function createWildEncounter(regionId) {
    const table = ENCOUNTER_TABLES[regionId] || ENCOUNTER_TABLES['brinefall_shore'];
    if (!table.length) return null;

    const totalWeight = table.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * totalWeight;
    let entry = table[table.length - 1];
    for (const e of table) {
        roll -= e.weight;
        if (roll <= 0) { entry = e; break; }
    }

    const level = Math.floor(Math.random() * (entry.maxLv - entry.minLv + 1)) + entry.minLv;
    return createCreatureInstance(entry.id, level);
}
