// ============================================================
//  TIDEBREAK: Legacy of the Storms — OVERWORLD.JS
//  Canvas tile map, player movement, NPCs, encounters, weather
// ============================================================

'use strict';

const OverworldEngine = (() => {

    // ── CONSTANTS ─────────────────────────────────────────────
    const TILE_SIZE    = 48;
    const MAP_COLS     = 40;
    const MAP_ROWS     = 30;
    const ENCOUNTER_RATE = 0.12;
    // Viewport: fixed tile window the player sees (GBA-style)
    const VIEW_COLS    = 15;   // tiles wide visible at once
    const VIEW_ROWS    = 11;   // tiles tall visible at once
    const VIEW_W       = VIEW_COLS * TILE_SIZE;   // 720px
    const VIEW_H       = VIEW_ROWS * TILE_SIZE;   // 528px

    // ── TILE TYPES ───────────────────────────────────────────
    const T = {
        WATER:  0,
        SAND:   1,
        GRASS:  2,
        PATH:   3,
        WALL:   4,
        SHORE:  5,
        HOUSE:  6,
        DOCK:   7,
        DEEP:   8,  // deep water (decorative)
        ROCK:   9,
        FLOWER: 10,
        TREE:   11,
        ROUTE:  12, // tall grass on a route — encounter zone
        SIGN:   13, // sign post (solid/interact)
        TALL:   14, // tall grass (slightly darker than GRASS)
        FENCE:  15, // wooden fence (solid)
        CENTER: 16, // Tidecenter building (solid, interact-able doorstep)
        FLOOR:  17, // interior floor tile
        EXIT:   18, // exit/door tile back to overworld
    };

    // ── BRINEFALL MAP (40×30) ────────────────────────────────
    // Village in cols 0-23 (original shape), Route 1 in cols 24-39 heading east
    // Route 2 stub heading north from col 13 at rows 0-3
    const MAPS = {
        brinefall: {
            tiles: [
                //  0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23 |  24  25  26  27  28  29  30  31  32  33  34  35  36  37  38  39
                [ 8,  8,  8,  8,  8,  8,  8,  0,  0,  0,  0,  0,  0,  3,  3,  0,  0,  0,  0,  0,  0,  0,  0,  0,  11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11], // row 0 — route 2 path from col 13
                [ 8,  8,  8,  0,  0,  0,  0,  0,  5,  5,  5,  5,  5,  3,  5,  5,  5,  5,  5,  5,  5,  5,  0,  0,  11, 11, 14, 14, 14, 14, 14, 14, 14, 14, 11, 11, 11, 11, 11, 11], // row 1
                [ 8,  8,  0,  0,  5,  5,  5,  5,  1,  1,  1,  1,  1,  3,  1,  1,  1,  1,  1,  1,  1,  5,  5,  0,  11, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 11, 11, 11, 11, 11], // row 2
                [ 8,  0,  0,  5,  1,  1,  1,  1,  3,  3,  3,  3,  3,  3,  3,  3,  3,  1,  1,  1,  1,  1,  5,  5,  14, 14, 14, 12, 12, 12, 12, 12, 14, 14, 14, 14, 11, 11, 11, 11], // row 3
                [ 0,  0,  5,  1,  1,  6,  1,  1,  3,  1,  1,  1,  1, 11, 11,  3,  1,  1, 16, 16,  1,  1,  1,  5,  14, 14, 12, 12, 12, 12, 12, 12, 12, 14, 14, 14, 14, 11, 11, 11], // row 4 — Tidecenter cols 18-19
                [ 0,  5,  1,  1,  1,  1,  1,  1,  3,  1,  1,  1,  1,  1,  1,  3,  1,  1, 16, 16,  1,  1,  1,  5,  14, 12, 12, 12, 12, 12, 12, 12, 12, 12, 14, 14, 14, 11, 11, 11], // row 5 — Tidecenter cols 18-19
                [ 0,  5,  1,  1,  1,  1,  1,  1,  3,  1, 10,  1,  1,  1,  1,  3,  1,  1,  1,  3,  1,  6,  1,  5,  15, 12, 12, 12, 10, 12, 12, 12, 12, 12, 12, 14, 14, 11, 11, 11], // row 6 — col 19 = PATH (Tidecenter door)
                [ 0,  5,  1,  6,  1,  1,  1,  1,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  1,  1,  5,   3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3, 14, 14, 11, 11, 11], // row 7 — route path
                [ 0,  5,  1,  1,  1,  1,  1,  1,  1,  1,  3,  1,  1,  1,  1,  1,  3,  1,  1,  1,  1,  1,  1,  5,  14, 14, 14, 12, 12, 12, 12, 12, 14, 14, 14, 14, 14, 14, 11, 11], // row 8
                [ 0,  5,  1,  1,  1,  1,  1,  1,  1,  1,  3,  1,  6,  1,  1,  1,  3,  1,  1,  1,  1,  1,  1,  1,  5,  14, 14, 12, 12, 12, 12, 12, 12, 14, 14, 14, 14, 11, 11, 11], // row 9
                [ 0,  5,  1,  1, 11, 11,  1,  1,  1,  1,  3,  1,  1,  1,  1,  1,  3,  1,  1, 11, 11,  1,  1,  1,  5,  14, 12, 12, 12, 12, 12, 12, 12, 12, 14, 14, 14, 11, 11, 11], // row 10
                [ 0,  5,  1,  1,  1,  1,  1,  1,  2,  2,  3,  2,  2,  2,  2,  2,  3,  2,  2,  1,  1,  1,  1,  1,  5,  14, 14, 12, 12, 12, 12, 12, 14, 14, 14, 14, 11, 11, 11, 11], // row 11
                [ 0,  5,  1,  1,  1,  1,  1,  2,  2,  2,  3,  2,  2, 10,  2,  2,  3,  2,  2,  2,  1,  1,  1,  1,  5,  14, 14, 14, 12, 12, 12, 14, 14, 14, 14, 11, 11, 11, 11, 11], // row 12
                [ 0,  5,  1,  1,  1,  1,  2,  2,  2,  2,  3,  2,  2,  2,  2,  2,  3,  2,  2,  2,  2,  1,  1,  1,  5,   5, 14, 14, 14, 14, 14, 14, 14, 14, 11, 11, 11, 11, 11, 11], // row 13
                [ 0,  5,  5,  1,  1,  1,  1,  1,  1,  1,  3,  1,  1,  1,  1,  1,  3,  1,  1,  1,  1,  1,  1,  5,  5,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 14
                [ 0,  0,  5,  5,  1,  1,  1,  1,  1,  1,  7,  1,  1,  1,  1,  1,  7,  1,  1,  1,  1,  1,  5,  5,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 15
                [ 0,  0,  0,  5,  5,  1,  1,  1,  1,  1,  7,  1,  9,  1,  1,  1,  7,  1,  1,  1,  9,  1,  5,  5,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 16
                [ 0,  0,  0,  0,  5,  5,  5,  5,  5,  5,  7,  5,  5,  5,  5,  5,  7,  5,  5,  5,  5,  5,  5,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 17
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  7,  0,  0,  0,  0,  0,  7,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 18
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 19
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 20
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 21
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 22
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 23
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 24
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 25
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 26
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 27
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 28
                [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // row 29
            ],
            encounterZones: [T.GRASS, T.SHORE, T.ROUTE, T.TALL],
            playerStart: { x: 13, y: 12 },
            npcs: [
                { id: 'prof_maris',      tile: { x: 13, y: 9  } },
                { id: 'harbor_guard',    tile: { x: 10, y: 15 } },
                { id: 'elder_sota',      tile: { x: 5,  y: 8  } },
                { id: 'route1_hiker',    tile: { x: 30, y: 7  } },
                { id: 'route1_sign',     tile: { x: 24, y: 7  } },
            ],
            encounterTable: 'brinefall_shore',
            routeEncounterTable: 'brinefall_route1',
            ambientWeather: ['CLEAR', 'RAIN'],
        },
        // ── TIDECENTER INTERIOR ──────────────────────────────
        // 12×9 tile room — floor, walls, nurse NPC, PC terminal, exit door
        tidecenter: {
            tiles: [
                // 0  1  2  3  4  5  6  7  8  9 10 11
                [ 4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4], // row 0 — top wall
                [ 4, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,  4], // row 1
                [ 4, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,  4], // row 2
                [ 4, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,  4], // row 3
                [ 4, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,  4], // row 4
                [ 4, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,  4], // row 5
                [ 4, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17,  4], // row 6
                [ 4,  4,  4,  4,  4, 18,  4,  4,  4,  4,  4,  4], // row 7 — exit at col 5
                [ 4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4,  4], // row 8
            ],
            encounterZones: [],
            playerStart: { x: 5, y: 6 },
            npcs: [
                { id: 'tidecenter_nurse', tile: { x: 3, y: 2 } },
                { id: 'tidecenter_pc',    tile: { x: 9, y: 2 } },
            ],
            encounterTable: null,
            routeEncounterTable: null,
            ambientWeather: ['CLEAR'],
            isInterior: true,
            exitMap: 'brinefall',
            exitPos:  { x: 19, y: 7 },  // tile in front of the Tidecenter door outside
        },
    };

    // ── TILE RENDER DATA ─────────────────────────────────────
    // Each tile has a base color + optional detail painter
    const TILE_BASE = {
        [T.WATER]: '#0e3854',
        [T.DEEP]:  '#071e30',
        [T.SAND]:  '#c8a96a',
        [T.GRASS]: '#2c6b3a',
        [T.PATH]:  '#9e8060',
        [T.WALL]:  '#2a2020',
        [T.SHORE]: '#1a4d6b',
        [T.HOUSE]: '#4a2a18',
        [T.DOCK]:  '#6b4a2a',
        [T.ROCK]:  '#555058',
        [T.FLOWER]:'#2c6b3a',
        [T.TREE]:  '#1a4a22',
        [T.ROUTE]: '#1e5c28',  // darker tall grass on routes
        [T.SIGN]:  '#6b4a2a',  // wooden sign post
        [T.TALL]:  '#245230',  // tall grass (encounter)
        [T.FENCE]: '#7a5a30',  // wooden fence
        [T.CENTER]:'#1a3a6a',  // Tidecenter — teal-blue building
        [T.FLOOR]: '#2a2a3a',  // interior floor — dark stone tile
        [T.EXIT]:  '#3a5a3a',  // exit doormat — green-tinted
    };

    // Pre-render tile textures to offscreen canvases for performance
    let tileCache = null; // Structure: { [tileType]: [CanvasFrame0, CanvasFrame1, ...] }
    let animTimer = 0;

    function buildTileCache() {
        tileCache = {};
        const types = Object.keys(TILE_BASE);
        
        types.forEach(tKey => {
            const t = parseInt(tKey);
            const frames = [];
            const numFrames = (t === T.WATER || t === T.DEEP) ? 4 : 1;

            for (let f = 0; f < numFrames; f++) {
                const oc = document.createElement('canvas');
                oc.width = oc.height = TILE_SIZE;
                const ox = oc.getContext('2d');
                drawPixelTile(ox, t, f);
                frames.push(oc);
            }
            tileCache[t] = frames;
        });
    }

    function drawPixelTile(ox, t, frame) {
        const vP = 4; // Virtual Pixel size (12x12 grid for 48px tile)
        const grid = TILE_SIZE / vP;
        
        const base = TILE_BASE[t] || '#111';
        ox.fillStyle = base;
        ox.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

        const P = (x, y, color) => {
            ox.fillStyle = color;
            ox.fillRect(x * vP, y * vP, vP, vP);
        };

        switch(t) {
            case T.WATER: {
                const c1 = '#1a5d8b'; // Lighter
                const c2 = '#0a3854'; // Darker
                // Animated wave pattern
                for (let i = 0; i < grid; i++) {
                    for (let j = 0; j < grid; j++) {
                        const wave = Math.sin((i + frame * 2) * 0.8) + Math.cos((j + frame) * 0.5);
                        if (wave > 1.2) P(i, j, c1);
                        else if (wave < -1.2) P(i, j, c2);
                    }
                }
                break;
            }
            case T.DEEP: {
                const c1 = '#0e2a42';
                const c2 = '#04121a';
                for (let i = 0; i < grid; i++) {
                    for (let j = 0; j < grid; j++) {
                        const wave = Math.sin((i - frame) * 0.5) * Math.cos((j + frame) * 0.8);
                        if (wave > 0.6) P(i, j, c1);
                        else if (wave < -0.6) P(i, j, c2);
                    }
                }
                break;
            }
            case T.GRASS: {
                const dark = '#1a4d22';
                const light = '#3db87a';
                // Random blades
                [[2,2],[6,4],[9,2],[3,8],[7,9],[10,7]].forEach(([px,py]) => {
                    P(px, py, light); P(px, py+1, dark);
                });
                break;
            }
            case T.SAND: {
                const dark = '#b8985a';
                const highlight = '#dcc080';
                [[1,3],[4,1],[8,4],[10,2],[3,9],[7,10],[11,6]].forEach(([px,py]) => {
                    P(px, py, dark);
                });
                P(2,2, highlight); P(9,9, highlight);
                break;
            }
            case T.PATH: {
                const edge = '#8a6a4a';
                const stone = '#b09070';
                ox.fillStyle = edge;
                ox.fillRect(0, 0, TILE_SIZE, vP);
                ox.fillRect(0, 0, vP, TILE_SIZE);
                [[3,3,6,4],[2,8,8,2],[8,4,3,6]].forEach(([px,py,pw,ph]) => {
                    ox.fillStyle = stone;
                    ox.fillRect(px*vP, py*vP, pw*vP, ph*vP);
                });
                break;
            }
            case T.TREE: {
                const trunk = '#4a2a10';
                const leaves = '#1a4a22';
                const leafHigh = '#2a7a32';
                // Trunk
                ox.fillStyle = trunk;
                ox.fillRect(5*vP, 8*vP, 2*vP, 4*vP);
                // Canopy
                ox.fillStyle = leaves;
                ox.fillRect(2*vP, 2*vP, 8*vP, 7*vP);
                ox.fillRect(3*vP, 1*vP, 6*vP, 1*vP);
                P(4,3, leafHigh); P(7,5, leafHigh);
                break;
            }
            case T.HOUSE: {
                const wall = '#5a3520';
                const roof = '#3a1a00';
                const window = '#1a6b8a';
                ox.fillStyle = wall; ox.fillRect(vP, vP, 10*vP, 10*vP);
                ox.fillStyle = roof; ox.fillRect(0, 0, TILE_SIZE, 2*vP);
                ox.fillStyle = window; ox.fillRect(3*vP, 4*vP, 2*vP, 2*vP);
                break;
            }
            case T.ROCK: {
                const dark = '#444';
                const mid = '#666';
                const light = '#888';
                ox.fillStyle = dark; ox.fillRect(3*vP, 4*vP, 7*vP, 6*vP);
                ox.fillStyle = mid; ox.fillRect(4*vP, 5*vP, 5*vP, 4*vP);
                P(5,6, light);
                break;
            }
            case T.FLOWER: {
                const stalk = '#1a4d22';
                const petal = '#e8b84b';
                [[3,3],[8,4],[4,9],[9,8]].forEach(([px,py]) => {
                    P(px, py, stalk); P(px, py-1, petal);
                });
                break;
            }
            case T.DOCK: {
                const wood = '#6b4a2a';
                const gap = '#3a1a00';
                ox.fillStyle = wood; ox.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
                ox.fillStyle = gap;
                ox.fillRect(2*vP, 0, vP, TILE_SIZE);
                ox.fillRect(6*vP, 0, vP, TILE_SIZE);
                ox.fillRect(10*vP, 0, vP, TILE_SIZE);
                break;
            }
            case T.SHORE: {
                const wet = '#1a4d6b';
                const sand = '#c8a96a';
                ox.fillStyle = sand; ox.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
                ox.fillStyle = wet; ox.fillRect(0, 8*vP, TILE_SIZE, 4*vP);
                break;
            }
            case T.ROUTE: {
                // Dark tall grass on a route — encounter zone, darker than GRASS
                const dark  = '#164020';
                const light = '#2a8050';
                const mid   = '#1e5828';
                // Fill base
                ox.fillStyle = mid; ox.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
                // Blade clusters
                [[1,1],[4,3],[7,1],[2,7],[5,9],[9,5],[10,2],[0,10],[6,6],[3,0],[8,8],[11,4]].forEach(([px,py]) => {
                    P(px, py, light); P(px, py+1, dark);
                });
                break;
            }
            case T.TALL: {
                // Slightly lighter tall grass
                const dark  = '#1a4d22';
                const light = '#32a060';
                ox.fillStyle = '#245230'; ox.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
                [[2,0],[5,2],[9,1],[3,6],[7,8],[10,5],[0,4],[6,10],[11,7],[1,9],[4,3],[8,0]].forEach(([px,py]) => {
                    P(px, py, light); P(px, py+1, dark);
                });
                break;
            }
            case T.SIGN: {
                // Wooden sign post
                const post = '#5a3a10';
                const board = '#c8a060';
                const text_line = '#3a2000';
                ox.fillStyle = post; ox.fillRect(5*vP, 5*vP, 2*vP, 7*vP);   // post
                ox.fillStyle = board; ox.fillRect(2*vP, 1*vP, 8*vP, 5*vP);  // sign board
                ox.fillStyle = text_line;
                ox.fillRect(3*vP, 2*vP, 6*vP, vP);    // text line 1
                ox.fillRect(3*vP, 4*vP, 4*vP, vP);    // text line 2
                break;
            }
            case T.FENCE: {
                // Wooden fence — horizontal rails
                const rail = '#9a7a40';
                const post = '#7a5a20';
                ox.fillStyle = post;
                ox.fillRect(0,    2*vP, vP, 8*vP);   // left post
                ox.fillRect(11*vP,2*vP, vP, 8*vP);   // right post
                ox.fillStyle = rail;
                ox.fillRect(0, 3*vP, TILE_SIZE, vP);   // top rail
                ox.fillRect(0, 7*vP, TILE_SIZE, vP);   // bottom rail
                break;
            }
            case T.CENTER: {
                // Tidecenter — teal-blue building with red cross
                const wall  = '#1a3a6a';
                const roof  = '#0d2040';
                const cross = '#e84040';
                const win   = '#60c8e0';
                ox.fillStyle = wall; ox.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
                ox.fillStyle = roof; ox.fillRect(0, 0, TILE_SIZE, 3*vP);
                // Red cross emblem
                ox.fillStyle = cross;
                ox.fillRect(5*vP, 3*vP, 2*vP, 6*vP);
                ox.fillRect(4*vP, 5*vP, 4*vP, 2*vP);
                // Window
                ox.fillStyle = win; ox.fillRect(8*vP, 4*vP, 3*vP, 3*vP);
                break;
            }
            case T.FLOOR: {
                // Interior floor — dark checkered stone tiles
                const dark  = '#222230';
                const light = '#2e2e40';
                const grout = '#181820';
                ox.fillStyle = dark; ox.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
                // Grout lines
                ox.fillStyle = grout;
                ox.fillRect(0, 5*vP, TILE_SIZE, vP/2);
                ox.fillRect(0, 10*vP, TILE_SIZE, vP/2);
                ox.fillRect(6*vP, 0, vP/2, TILE_SIZE);
                // Subtle stone panel shading
                ox.fillStyle = light;
                ox.fillRect(vP, vP, 5*vP, 4*vP);
                ox.fillRect(7*vP, 6*vP, 4*vP, 4*vP);
                break;
            }
            case T.EXIT: {
                // Exit doormat — green tinted with arrow indicator
                const base = '#2a4a2a';
                const stripe = '#3a6a3a';
                const arrow = '#60c060';
                ox.fillStyle = base; ox.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
                ox.fillStyle = stripe;
                ox.fillRect(2*vP, 2*vP, TILE_SIZE-4*vP, 2*vP);
                ox.fillRect(2*vP, 9*vP, TILE_SIZE-4*vP, 2*vP);
                // Down-arrow (exit indicator)
                ox.fillStyle = arrow;
                ox.fillRect(5*vP, 4*vP, 2*vP, 4*vP);
                ox.fillRect(4*vP, 6*vP, 4*vP, 2*vP);
                ox.fillRect(3*vP, 7*vP, 6*vP, 1*vP);
                break;
            }
        }
    }

    // ── CREATURE SPRITE PAINTERS ─────────────────────────────
    // These draw blocky pixel-art style battle sprites
    const SPRITE_PAINTERS = {
        pyroshell(ctx, x, y, size) {
            const s = size / 80;
            const p = s * 4; // Pixel size
            
            // Shell
            ctx.fillStyle = '#3a1000'; ctx.fillRect(x+12*s, y+32*s, 56*s, 32*s);
            ctx.fillStyle = '#c04010'; ctx.fillRect(x+16*s, y+28*s, 48*s, 36*s);
            ctx.fillStyle = '#ff8c40'; ctx.fillRect(x+20*s, y+24*s, 40*s, 20*s);
            
            // Spots
            ctx.fillStyle = '#8b3a0a';
            ctx.fillRect(x+28*s, y+36*s, p, p); ctx.fillRect(x+44*s, y+44*s, p, p);
            
            // Head
            ctx.fillStyle = '#8b3000'; ctx.fillRect(x+32*s, y+12*s, 16*s, 16*s);
            ctx.fillStyle = '#ffa060'; ctx.fillRect(x+34*s, y+14*s, 12*s, 12*s);
            
            // Eyes
            ctx.fillStyle = '#fff'; ctx.fillRect(x+36*s, y+18*s, p, p); ctx.fillRect(x+44*s, y+18*s, p, p);
            ctx.fillStyle = '#000'; ctx.fillRect(x+37*s, y+19*s, s*2, s*2); ctx.fillRect(x+45*s, y+19*s, s*2, s*2);
            
            // Legs
            ctx.fillStyle = '#3a1000';
            [[16,60],[32,64],[48,64],[60,60]].forEach(([lx,ly]) => {
                ctx.fillRect(x+lx*s, y+ly*s, 8*s, 8*s);
            });
        },
        verdantide(ctx, x, y, size) {
            const s = size / 80;
            const p = s * 4;
            
            // Blocky body segments
            ctx.fillStyle = '#004a30';
            [[16,64,16,12],[28,52,20,16],[40,36,24,20],[56,12,16,24]].forEach(([bx,by,bw,bh]) => {
                ctx.fillRect(x+bx*s, y+by*s, bw*s, bh*s);
            });
            ctx.fillStyle = '#00b87a';
            [[20,66,8,8],[32,54,12,12],[44,38,16,16],[60,14,12,12]].forEach(([bx,by,bw,bh]) => {
                ctx.fillRect(x+bx*s, y+by*s, bw*s, bh*s);
            });
            
            // Head
            ctx.fillStyle = '#60ffcc'; ctx.fillRect(x+58*s, y+8*s, 16*s, 16*s);
            ctx.fillStyle = '#fff'; ctx.fillRect(x+66*s, y+12*s, p, p);
            ctx.fillStyle = '#000'; ctx.fillRect(x+67*s, y+13*s, s*2, s*2);
            
            // Fins
            ctx.fillStyle = '#2ab5c7';
            ctx.fillRect(x+24*s, y+44*s, 12*s, 8*s);
            ctx.fillRect(x+48*s, y+24*s, 10*s, 6*s);
        },
        galeimp(ctx, x, y, size) {
            const s = size / 80;
            const p = s * 4;
            
            // Body
            ctx.fillStyle = '#1a3a5a'; ctx.fillRect(x+30*s, y+30*s, 20*s, 24*s);
            ctx.fillStyle = '#3a8aaa'; ctx.fillRect(x+32*s, y+32*s, 16*s, 20*s);
            
            // Cloud tail
            ctx.fillStyle = '#fff';
            ctx.fillRect(x+24*s, y+50*s, 32*s, 12*s);
            ctx.fillRect(x+28*s, y+58*s, 24*s, 8*s);
            
            // Head
            ctx.fillStyle = '#7ec8e3'; ctx.fillRect(x+30*s, y+14*s, 20*s, 18*s);
            ctx.fillStyle = '#fff'; ctx.fillRect(x+34*s, y+20*s, p, p); ctx.fillRect(x+42*s, y+20*s, p, p);
            ctx.fillStyle = '#000'; ctx.fillRect(x+35*s, y+21*s, s*2, s*2); ctx.fillRect(x+43*s, y+21*s, s*2, s*2);
            
            // Sparkles
            ctx.fillStyle = '#f0e040';
            ctx.fillRect(x+20*s, y+20*s, p, p); ctx.fillRect(x+56*s, y+40*s, p, p);
        },
        coralshrimp(ctx, x, y, size) {
            const s = size/80;
            // Body segments
            const colors = ['#ff8888','#ff6060','#e04040'];
            for(let i=0;i<4;i++){
                ctx.fillStyle=colors[i%3];
                ctx.beginPath();ctx.ellipse(x+(30+i*8)*s,y+(40+i*3)*s,10*s,7*s,0.3,0,Math.PI*2);ctx.fill();
            }
            // Head
            ctx.fillStyle='#ff9090';
            ctx.beginPath();ctx.ellipse(x+25*s,y+36*s,12*s,10*s,0,0,Math.PI*2);ctx.fill();
            // Antennae
            ctx.strokeStyle='#ffaaaa';ctx.lineWidth=1.5*s;
            ctx.beginPath();ctx.moveTo(x+20*s,y+28*s);ctx.lineTo(x+8*s,y+14*s);ctx.stroke();
            ctx.beginPath();ctx.moveTo(x+25*s,y+26*s);ctx.lineTo(x+16*s,y+10*s);ctx.stroke();
            // Eye
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+20*s,y+33*s,4*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#200000';ctx.beginPath();ctx.arc(x+21*s,y+33*s,2.5*s,0,Math.PI*2);ctx.fill();
            // Claws
            ctx.fillStyle='#e04040';
            ctx.beginPath();ctx.ellipse(x+14*s,y+44*s,8*s,5*s,-0.4,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.ellipse(x+14*s,y+52*s,8*s,5*s,0.4,0,Math.PI*2);ctx.fill();
            // Legs
            ctx.strokeStyle='#ff7070';ctx.lineWidth=1.5*s;
            for(let i=0;i<4;i++){
                ctx.beginPath();ctx.moveTo(x+(34+i*7)*s,y+50*s);ctx.lineTo(x+(34+i*7)*s,y+64*s);ctx.stroke();
            }
        },
        driftmoss(ctx, x, y, size) {
            const s=size/80;
            // Kelp strands
            const kelp=[['#2a8050',0],['#1a6040',10],['#3aaa70',-8],['#0a5030',20]];
            kelp.forEach(([col,ox],i)=>{
                ctx.strokeStyle=col;ctx.lineWidth=(6+i*2)*s;ctx.lineCap='round';
                ctx.beginPath();
                ctx.moveTo(x+(30+ox)*s,y+70*s);
                ctx.bezierCurveTo(x+(20+ox)*s,y+50*s,x+(45+ox)*s,y+30*s,x+(30+ox)*s,y+10*s);
                ctx.stroke();
            });
            // Bioluminescent nodes
            [['rgba(0,255,140,0.7)',35,25],['rgba(0,200,100,0.5)',25,45],['rgba(80,255,160,0.6)',48,35]].forEach(([col,nx,ny])=>{
                ctx.fillStyle=col;ctx.beginPath();ctx.arc(x+nx*s,y+ny*s,4*s,0,Math.PI*2);ctx.fill();
            });
        },
        sandpecker(ctx, x, y, size) {
            const s=size/80;
            // Body
            const bg=ctx.createRadialGradient(x+40*s,y+48*s,5*s,x+40*s,y+44*s,20*s);
            bg.addColorStop(0,'#e8e8c8');bg.addColorStop(1,'#90a050');
            ctx.fillStyle=bg;ctx.beginPath();ctx.ellipse(x+40*s,y+48*s,16*s,20*s,-0.1,0,Math.PI*2);ctx.fill();
            // Wing
            ctx.fillStyle='#708040';
            ctx.beginPath();ctx.moveTo(x+24*s,y+44*s);ctx.bezierCurveTo(x+15*s,y+30*s,x+30*s,y+58*s,x+36*s,y+56*s);ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(x+56*s,y+44*s);ctx.bezierCurveTo(x+65*s,y+30*s,x+50*s,y+58*s,x+44*s,y+56*s);ctx.closePath();ctx.fill();
            // Head
            ctx.fillStyle='#d0d0a8';ctx.beginPath();ctx.ellipse(x+40*s,y+28*s,13*s,12*s,0,0,Math.PI*2);ctx.fill();
            // Beak
            ctx.fillStyle='#c0a000';ctx.beginPath();ctx.moveTo(x+40*s,y+30*s);ctx.lineTo(x+26*s,y+26*s);ctx.lineTo(x+40*s,y+34*s);ctx.closePath();ctx.fill();
            // Eye
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+45*s,y+24*s,4*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#100800';ctx.beginPath();ctx.arc(x+46*s,y+24*s,2.5*s,0,Math.PI*2);ctx.fill();
            // Legs
            ctx.strokeStyle='#c0a000';ctx.lineWidth=2.5*s;
            ctx.beginPath();ctx.moveTo(x+34*s,y+66*s);ctx.lineTo(x+30*s,y+76*s);ctx.stroke();
            ctx.beginPath();ctx.moveTo(x+46*s,y+66*s);ctx.lineTo(x+50*s,y+76*s);ctx.stroke();
        },
        gravelcrab(ctx, x, y, size) {
            const s=size/80;
            // Main shell
            const g=ctx.createRadialGradient(x+40*s,y+46*s,8*s,x+40*s,y+46*s,30*s);
            g.addColorStop(0,'#9090a0');g.addColorStop(0.6,'#606070');g.addColorStop(1,'#303038');
            ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x+40*s,y+48*s,30*s,22*s,0,0,Math.PI*2);ctx.fill();
            // Shell ridges
            ctx.strokeStyle='rgba(140,140,160,0.4)';ctx.lineWidth=1.5*s;
            for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x+40*s,y+48*s,(10+i*8)*s,(7+i*5)*s,0,0,Math.PI*2);ctx.stroke();}
            // Claws
            [[12,52,16,12,-0.3],[62,52,16,12,0.3]].forEach(([cx,cy,cw,ch,ang])=>{
                ctx.fillStyle='#707080';ctx.beginPath();ctx.ellipse(x+cx*s,y+cy*s,cw*s,ch*s,ang,0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#505060';ctx.beginPath();ctx.ellipse(x+(cx-4)*s,y+(cy+6)*s,8*s,6*s,ang+0.4,0,Math.PI*2);ctx.fill();
            });
            // Eyes on stalks
            ctx.strokeStyle='#808090';ctx.lineWidth=2*s;
            ctx.beginPath();ctx.moveTo(x+32*s,y+30*s);ctx.lineTo(x+30*s,y+20*s);ctx.stroke();
            ctx.beginPath();ctx.moveTo(x+48*s,y+30*s);ctx.lineTo(x+50*s,y+20*s);ctx.stroke();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+30*s,y+18*s,5*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+50*s,y+18*s,5*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#100010';ctx.beginPath();ctx.arc(x+31*s,y+18*s,3*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#100010';ctx.beginPath();ctx.arc(x+51*s,y+18*s,3*s,0,Math.PI*2);ctx.fill();
        },
        thorneel(ctx, x, y, size) {
            const s=size/80;
            // Body
            ctx.lineWidth=14*s;ctx.lineCap='round';
            const eg=ctx.createLinearGradient(x+10*s,y+70*s,x+70*s,y+10*s);
            eg.addColorStop(0,'#003040');eg.addColorStop(0.5,'#00a0c0');eg.addColorStop(1,'#40e8ff');
            ctx.strokeStyle=eg;
            ctx.beginPath();ctx.moveTo(x+20*s,y+70*s);ctx.bezierCurveTo(x+10*s,y+40*s,x+70*s,y+40*s,x+60*s,y+10*s);ctx.stroke();
            // Dorsal spines
            ctx.strokeStyle='rgba(80,220,255,0.8)';ctx.lineWidth=2.5*s;
            [[35,46,30,32],[42,38,37,24],[50,28,46,16]].forEach(([x1,y1,x2,y2])=>{
                ctx.beginPath();ctx.moveTo(x+x1*s,y+y1*s);ctx.lineTo(x+x2*s,y+y2*s);ctx.stroke();
            });
            // Electric glow
            ctx.fillStyle='rgba(0,200,255,0.12)';ctx.beginPath();ctx.arc(x+40*s,y+40*s,30*s,0,Math.PI*2);ctx.fill();
            // Head
            ctx.fillStyle='#40d8f0';ctx.beginPath();ctx.ellipse(x+60*s,y+12*s,12*s,9*s,-0.4,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+65*s,y+9*s,3.5*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#001820';ctx.beginPath();ctx.arc(x+66*s,y+9*s,2*s,0,Math.PI*2);ctx.fill();
        },
        ashwing(ctx, x, y, size) {
            const s=size/80;
            // Wings
            const wg=ctx.createRadialGradient(x+40*s,y+44*s,5*s,x+40*s,y+44*s,36*s);
            wg.addColorStop(0,'#d06020');wg.addColorStop(0.5,'#604030');wg.addColorStop(1,'rgba(20,10,5,0)');
            // Left wing
            ctx.fillStyle=wg;ctx.beginPath();ctx.moveTo(x+40*s,y+44*s);ctx.bezierCurveTo(x+8*s,y+10*s,x+0*s,y+50*s,x+20*s,y+60*s);ctx.closePath();ctx.fill();
            // Right wing
            ctx.beginPath();ctx.moveTo(x+40*s,y+44*s);ctx.bezierCurveTo(x+72*s,y+10*s,x+80*s,y+50*s,x+60*s,y+60*s);ctx.closePath();ctx.fill();
            // Ash pattern
            ctx.fillStyle='rgba(80,60,50,0.5)';
            [[15,30,20,14],[55,25,20,14]].forEach(([wx,wy,ww,wh])=>{ctx.beginPath();ctx.ellipse(x+wx*s,y+wy*s,ww*s,wh*s,0,0,Math.PI*2);ctx.fill();});
            // Body
            ctx.fillStyle='#a06040';ctx.beginPath();ctx.ellipse(x+40*s,y+44*s,10*s,18*s,0,0,Math.PI*2);ctx.fill();
            // Head
            ctx.fillStyle='#c07848';ctx.beginPath();ctx.ellipse(x+40*s,y+26*s,9*s,11*s,0,0,Math.PI*2);ctx.fill();
            // Antennae (feathery)
            ctx.strokeStyle='#d08050';ctx.lineWidth=1.5*s;
            ctx.beginPath();ctx.moveTo(x+34*s,y+16*s);ctx.bezierCurveTo(x+22*s,y+4*s,x+18*s,y+2*s,x+16*s,y+0);ctx.stroke();
            ctx.beginPath();ctx.moveTo(x+46*s,y+16*s);ctx.bezierCurveTo(x+58*s,y+4*s,x+62*s,y+2*s,x+64*s,y+0);ctx.stroke();
            // Eyes
            ctx.fillStyle='#ff4010';ctx.beginPath();ctx.arc(x+35*s,y+23*s,4*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#ff4010';ctx.beginPath();ctx.arc(x+45*s,y+23*s,4*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#200000';ctx.beginPath();ctx.arc(x+36*s,y+23*s,2.5*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#200000';ctx.beginPath();ctx.arc(x+46*s,y+23*s,2.5*s,0,Math.PI*2);ctx.fill();
        },
        leviatyr(ctx, x, y, size) {
            const s=size/80;
            // Giant sea body
            const g=ctx.createRadialGradient(x+40*s,y+50*s,10*s,x+40*s,y+50*s,40*s);
            g.addColorStop(0,'#204080');g.addColorStop(0.6,'#102050');g.addColorStop(1,'#050a18');
            ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x+40*s,y+52*s,36*s,26*s,0,0,Math.PI*2);ctx.fill();
            // Bioluminescent markings
            ctx.strokeStyle='rgba(0,180,255,0.6)';ctx.lineWidth=1.5*s;
            [[40,36,28],[40,52,18],[40,64,12]].forEach(([ex,ey,er])=>{ctx.beginPath();ctx.arc(x+ex*s,y+ey*s,er*s,0,Math.PI);ctx.stroke();});
            // Tentacles
            ctx.strokeStyle='#1a4080';ctx.lineWidth=6*s;ctx.lineCap='round';
            [[-15,10],[0,-5],[15,10],[-25,25],[25,25]].forEach(([tx,ty],i)=>{
                ctx.beginPath();ctx.moveTo(x+(40+tx)*s,y+72*s);ctx.bezierCurveTo(x+(30+tx)*s,y+(80+ty)*s,x+(50+tx)*s,y+(85+ty)*s,x+(40+tx)*s,y+(90+ty)*s);ctx.stroke();
            });
            // Head
            ctx.fillStyle='#1a3060';ctx.beginPath();ctx.ellipse(x+40*s,y+24*s,22*s,18*s,0,0,Math.PI*2);ctx.fill();
            // Eyes - glowing deep blue
            ctx.fillStyle='rgba(0,100,255,0.3)';ctx.beginPath();ctx.arc(x+28*s,y+20*s,10*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(0,100,255,0.3)';ctx.beginPath();ctx.arc(x+52*s,y+20*s,10*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#0060ff';ctx.beginPath();ctx.arc(x+28*s,y+20*s,6*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#0060ff';ctx.beginPath();ctx.arc(x+52*s,y+20*s,6*s,0,Math.PI*2);ctx.fill();
        },
        pyrodrakon(ctx, x, y, size) {
            const s=size/80;
            // Dragon body
            const g=ctx.createRadialGradient(x+40*s,y+48*s,8*s,x+40*s,y+48*s,36*s);
            g.addColorStop(0,'#ff4010');g.addColorStop(0.5,'#a01000');g.addColorStop(1,'#1a0000');
            ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x+40*s,y+50*s,28*s,24*s,0,0,Math.PI*2);ctx.fill();
            // Spine ridges
            ctx.fillStyle='#ff6020';
            for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x+(30+i*5)*s,y+28*s);ctx.lineTo(x+(32+i*5)*s,y+18*s);ctx.lineTo(x+(34+i*5)*s,y+28*s);ctx.closePath();ctx.fill();}
            // Wings
            const wg=ctx.createLinearGradient(x,y+20*s,x+20*s,y+60*s);
            wg.addColorStop(0,'rgba(200,40,0,0.7)');wg.addColorStop(1,'rgba(80,0,0,0.4)');
            ctx.fillStyle=wg;
            ctx.beginPath();ctx.moveTo(x+12*s,y+36*s);ctx.bezierCurveTo(x+0,y+10*s,x+5*s,y+60*s,x+24*s,y+56*s);ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(x+68*s,y+36*s);ctx.bezierCurveTo(x+80*s,y+10*s,x+75*s,y+60*s,x+56*s,y+56*s);ctx.closePath();ctx.fill();
            // Head
            ctx.fillStyle='#c03000';ctx.beginPath();ctx.ellipse(x+40*s,y+20*s,18*s,14*s,0,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#e04020';ctx.beginPath();ctx.moveTo(x+28*s,y+12*s);ctx.lineTo(x+22*s,y+2*s);ctx.lineTo(x+34*s,y+10*s);ctx.closePath();ctx.fill();
            ctx.beginPath();ctx.moveTo(x+52*s,y+12*s);ctx.lineTo(x+58*s,y+2*s);ctx.lineTo(x+46*s,y+10*s);ctx.closePath();ctx.fill();
            ctx.fillStyle='#ff8000';ctx.beginPath();ctx.arc(x+32*s,y+17*s,5*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#ff8000';ctx.beginPath();ctx.arc(x+48*s,y+17*s,5*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#300000';ctx.beginPath();ctx.arc(x+33*s,y+17*s,3*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#300000';ctx.beginPath();ctx.arc(x+49*s,y+17*s,3*s,0,Math.PI*2);ctx.fill();
        },
        tempestara(ctx, x, y, size) {
            const s=size/80;
            // Storm serpent body
            ctx.lineWidth=10*s;ctx.lineCap='round';
            const sg=ctx.createLinearGradient(x+5*s,y+70*s,x+75*s,y+5*s);
            sg.addColorStop(0,'#303060');sg.addColorStop(0.5,'#8060c0');sg.addColorStop(1,'#d0c0ff');
            ctx.strokeStyle=sg;
            ctx.beginPath();ctx.moveTo(x+10*s,y+72*s);ctx.bezierCurveTo(x+5*s,y+40*s,x+75*s,y+40*s,x+70*s,y+8*s);ctx.stroke();
            // Lightning crackles
            ctx.strokeStyle='rgba(220,200,255,0.7)';ctx.lineWidth=1.5*s;
            [[30,50,22,36],[50,34,58,20],[40,42,32,28]].forEach(([x1,y1,x2,y2])=>{
                ctx.beginPath();ctx.moveTo(x+x1*s,y+y1*s);ctx.lineTo(x+x2*s,y+y2*s);ctx.stroke();
            });
            // Electrical aura
            ctx.fillStyle='rgba(140,100,255,0.1)';ctx.beginPath();ctx.ellipse(x+40*s,y+40*s,35*s,32*s,0,0,Math.PI*2);ctx.fill();
            // Head
            ctx.fillStyle='#a080e0';ctx.beginPath();ctx.ellipse(x+70*s,y+10*s,14*s,11*s,-0.3,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+76*s,y+7*s,4.5*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#1a0040';ctx.beginPath();ctx.arc(x+77*s,y+7*s,2.5*s,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='rgba(200,180,255,0.9)';ctx.beginPath();ctx.arc(x+77*s,y+6*s,1*s,0,Math.PI*2);ctx.fill();
        },
    };

    function drawSprite(ctx, defId, x, y, size) {
        // Lookup by defId → spriteClass name → painter
        const painter = SPRITE_PAINTERS[defId];
        if (painter) {
            ctx.save();
            painter(ctx, x, y, size);
            ctx.restore();
        } else {
            // Fallback: colored circle
            const def = CREATURE_DEFS[defId];
            const color = def ? '#2ab5c7' : '#555';
            const g = ctx.createRadialGradient(x+size/2, y+size/2, 4, x+size/2, y+size/2, size/2);
            g.addColorStop(0, color); g.addColorStop(1, '#050e18');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x+size/2, y+size/2, size/2-2, 0, Math.PI*2); ctx.fill();
        }
    }

    // ── STATE ────────────────────────────────────────────────
    let canvas, ctx;
    let currentMap = null;
    let inBattle = false;   // guards against multiple simultaneous encounters
    let player = {
        x: 13, y: 12,
        px: 13*TILE_SIZE,
        py: 12*TILE_SIZE,
        targetPx: 13*TILE_SIZE,
        targetPy: 12*TILE_SIZE,
        moving: false,
        facing: 'down',
        walkFrame: 0,       // 0=neutral, 1=left foot fwd, 2=right foot fwd
        walkTimer: 0,
    };
    let camera = { x: 0, y: 0 };
    let dialogueQueue = [];
    let inDialogue = false;
    let currentNpcId = null;
    let currentMapId = 'brinefall';
    let interactPrompt = null; // { label, tx, ty } — tile to show "E to interact" over
    let animFrame = null;
    let weatherTimer = null;
    let lastTime = 0;
    const WALK_SPEED = 6;   // pixels per frame — 48px tile crossed in 8 frames (~133ms, GBA-paced)

    // ── INIT ─────────────────────────────────────────────────
    function init() {
        canvas = document.getElementById('overworld-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        bindInput();
        loadMap('brinefall');
        startLoop();
    }

    function loadMap(mapId) {
        currentMap = MAPS[mapId];
        if (!currentMap) return;
        currentMapId = mapId;
        player.x = currentMap.playerStart.x;
        player.y = currentMap.playerStart.y;
        player.px = player.x * TILE_SIZE;
        player.py = player.y * TILE_SIZE;
        player.targetPx = player.px;
        player.targetPy = player.py;
        player.moving = false;
        interactPrompt = null;
        buildTileCache();
        resizeCanvas();
        // Toggle CSS class for interior background/canvas styling
        const screenEl = document.getElementById('screen-overworld');
        if (screenEl) {
            screenEl.classList.toggle('interior-active', !!currentMap.isInterior);
        }
        const locEl = document.getElementById('hud-location');
        if (locEl) {
            locEl.textContent = currentMap.isInterior
                ? 'Tidecenter'
                : (REGIONS[mapId]?.name || mapId);
        }
        if (!currentMap.isInterior) scheduleWeatherCycle();
    }

    function resizeCanvas() {
        if (!currentMap) { canvas.width = VIEW_W; canvas.height = VIEW_H; return; }
        // For interior maps: canvas fits the whole room; for overworld: fixed viewport
        if (currentMap.isInterior) {
            const cols = currentMap.tiles[0].length;
            const rows = currentMap.tiles.length;
            canvas.width  = cols * TILE_SIZE;
            canvas.height = rows * TILE_SIZE;
        } else {
            canvas.width  = VIEW_W;
            canvas.height = VIEW_H;
        }
    }

    window.addEventListener('resize', () => { if (canvas) resizeCanvas(); });

    // ── INPUT ────────────────────────────────────────────────
    const keysHeld = {};
    function bindInput() {
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', e => { keysHeld[e.key] = false; });
        const dlgBox = document.getElementById('overworld-dlg');
        if (dlgBox) dlgBox.addEventListener('click', () => { if (inDialogue) advanceDialogue(); });
    }

    function onKeyDown(e) {
        const owActive = document.getElementById('screen-overworld')?.classList.contains('active');
        if (!owActive) return;

        const menuEl = document.getElementById('action-menu');
        const menuOpen = menuEl && !menuEl.classList.contains('hidden');

        // Alt opens the start menu (Pokémon-style)
        if (e.key === 'Alt') { e.preventDefault(); Game.toggleStartMenu(); return; }

        if (e.key === 'Escape') {
            e.preventDefault();
            // Close start menu first if open
            const sm = document.getElementById('start-menu');
            if (sm && !sm.classList.contains('hidden')) { Game.closeStartMenu(); return; }
            toggleActionMenu();
            return;
        }

        const startMenuOpen = document.getElementById('start-menu') && !document.getElementById('start-menu').classList.contains('hidden');
        if (startMenuOpen) return;
        if (menuOpen) return;

        if (inDialogue) {
            if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') advanceDialogue();
            return;
        }

        if (e.key === 'e' || e.key === 'E' || e.key === 'z' || e.key === 'Z' || e.key === 'Enter') { checkInteract(); return; }

        keysHeld[e.key] = true;
    }

    // ── MOVEMENT (smooth interpolation) ─────────────────────
    function processMovement() {
        if (player.moving || inDialogue) return;
        const menuOpen = document.getElementById('action-menu') && !document.getElementById('action-menu').classList.contains('hidden');
        if (menuOpen) return;
        const startMenuOpen = document.getElementById('start-menu') && !document.getElementById('start-menu').classList.contains('hidden');
        if (startMenuOpen) return;

        let dx = 0, dy = 0;
        if (keysHeld['ArrowUp']    || keysHeld['w'] || keysHeld['W']) { dy = -1; player.facing = 'up'; }
        else if (keysHeld['ArrowDown']  || keysHeld['s'] || keysHeld['S']) { dy =  1; player.facing = 'down'; }
        else if (keysHeld['ArrowLeft']  || keysHeld['a'] || keysHeld['A']) { dx = -1; player.facing = 'left'; }
        else if (keysHeld['ArrowRight'] || keysHeld['d'] || keysHeld['D']) { dx =  1; player.facing = 'right'; }

        if (dx === 0 && dy === 0) { updateInteractPrompt(); return; }

        const mapCols = currentMap.tiles[0].length;
        const mapRows = currentMap.tiles.length;
        const nx = player.x + dx;
        const ny = player.y + dy;
        if (nx < 0 || ny < 0 || nx >= mapCols || ny >= mapRows) { updateInteractPrompt(); return; }

        const tile = currentMap.tiles[ny][nx];
        // Solid tiles block movement (NPCs no longer block — use E to interact)
        if (tile === T.WALL || tile === T.HOUSE || tile === T.TREE || tile === T.ROCK ||
            tile === T.WATER || tile === T.DEEP || tile === T.FENCE || tile === T.CENTER) {
            updateInteractPrompt();
            return;
        }

        // NPC tiles still block movement
        const npcAtTile = currentMap.npcs.find(n => n.tile.x === nx && n.tile.y === ny);
        if (npcAtTile) { updateInteractPrompt(); return; }

        // Start smooth movement
        player.x = nx; player.y = ny;
        player.targetPx = nx * TILE_SIZE;
        player.targetPy = ny * TILE_SIZE;
        player.moving = true;
        player.walkTimer++;
        // Track steps
        if (Game.state.stats) Game.state.stats.stepsWalked++;
        // 3-frame cycle: advance pose every other step for choppy GBA feel
        player.walkFrame = (player.walkFrame % 2) + 1;  // alternates 1 → 2 → 1 → 2…

        // Exit tile — leave interior
        if (tile === T.EXIT && currentMap.isInterior) {
            const exitMap = currentMap.exitMap;
            const exitPos = currentMap.exitPos;
            loadMap(exitMap);
            if (exitPos) {
                player.x = exitPos.x; player.y = exitPos.y;
                player.px = player.x * TILE_SIZE; player.py = player.y * TILE_SIZE;
                player.targetPx = player.px; player.targetPy = player.py;
            }
            player.moving = false;
            return;
        }

        // Encounter check (only on overworld)
        if (!currentMap.isInterior && currentMap.encounterZones.includes(tile)) {
            if (Math.random() < ENCOUNTER_RATE) {
                player.pendingEncounter = true;
            }
        }

        updateInteractPrompt();
    }

    // Update the floating interact prompt based on what's adjacent
    function updateInteractPrompt() {
        if (inDialogue) { interactPrompt = null; return; }
        let tx = player.x, ty = player.y;
        if (player.facing === 'up')    ty--;
        if (player.facing === 'down')  ty++;
        if (player.facing === 'left')  tx--;
        if (player.facing === 'right') tx++;

        const mapCols = currentMap ? currentMap.tiles[0].length : MAP_COLS;
        const mapRows = currentMap ? currentMap.tiles.length    : MAP_ROWS;
        if (tx < 0 || ty < 0 || tx >= mapCols || ty >= mapRows) { interactPrompt = null; return; }

        const facedTile = currentMap.tiles[ty][tx];
        const facedNpc  = currentMap.npcs.find(n => n.tile.x === tx && n.tile.y === ty);
        const facedExit = facedTile === T.EXIT && currentMap.isInterior;

        if (facedNpc || facedTile === T.CENTER || facedTile === T.SIGN || facedExit) {
            let label = '[ E ] Interact';
            if (facedTile === T.CENTER) label = '[ E ] Enter Tidecenter';
            if (facedExit)             label = '[ E ] Exit';
            if (facedNpc) {
                const npcData = NPCS[facedNpc.id];
                label = `[ E ] Talk to ${npcData ? npcData.name : facedNpc.id}`;
            }
            interactPrompt = { label, tx, ty };
        } else {
            interactPrompt = null;
        }
    }

    function updatePlayerPosition() {
        if (!player.moving) return;
        const dx = player.targetPx - player.px;
        const dy = player.targetPy - player.py;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <= WALK_SPEED) {
            player.px = player.targetPx;
            player.py = player.targetPy;
            player.moving = false;
            if (player.pendingEncounter) {
                player.pendingEncounter = false;
                triggerWildEncounter();
            }
        } else {
            player.px += (dx / dist) * WALK_SPEED;
            player.py += (dy / dist) * WALK_SPEED;
        }
    }

    // ── ENCOUNTERS ───────────────────────────────────────────
    function triggerWildEncounter() {
        if (inBattle) return;  // prevent stacking encounters
        // Pick encounter table based on tile the player is standing on
        const tile = currentMap.tiles[player.y] && currentMap.tiles[player.y][player.x];
        let tableId = currentMap.encounterTable;
        if (tile === T.ROUTE || tile === T.TALL) {
            tableId = currentMap.routeEncounterTable || tableId;
        }
        const wild = createWildEncounter(tableId);
        if (!wild || !Game.state.party.length) return;
        const lead = Game.state.party[0];

        inBattle = true;
        // Show centered encounter flash alert, then start battle
        Game.showEncounterAlert(wild.name, () => {
            BattleEngine.startBattle(lead, wild, {
                weather: Game.state.weather,
                wildBattle: true,
                canRun: true,
                onBattleEnd(result) {
                    inBattle = false;
                    if (result === 'win') {
                        if (Game.state.stats) Game.state.stats.battlesWon++;
                    } else if (result === 'capture') {
                        if (Game.state.stats) Game.state.stats.battlesWon++;
                    } else if (result === 'lose') {
                        if (Game.state.stats) Game.state.stats.battlesLost++;
                        // Check if whole party is fainted
                        const allFainted = Game.state.party.every(c => c.stats.vit <= 0);
                        if (allFainted) {
                            Game.blackout();
                        } else {
                            Game.notify('Your companion fainted...', 'warning');
                            lead.stats.vit = Math.max(1, Math.floor(lead.stats.maxVit * 0.1));
                            Game.updatePartyStrip();
                        }
                    }
                    if (result === 'win' || result === 'capture') {
                        // Tide Shard drop on Route 1 if mission is active
                        const gs = Game.state;
                        const quest = gs.quests && gs.quests.tide_shard_recovery;
                        const onRoute = (tile === T.ROUTE || tile === T.TALL);
                        if (quest && quest.active && !quest.complete && onRoute) {
                            if (Math.random() < 0.4) {
                                quest.shardsFound = (quest.shardsFound || 0) + 1;
                                if (!gs.items.tide_shard) gs.items.tide_shard = 0;
                                gs.items.tide_shard++;
                                const found = quest.shardsFound;
                                const req = quest.shardsRequired;
                                Game.notify(`A Tide Shard surfaced! (${found}/${req})`, 'success');
                                if (found >= req) {
                                    quest.complete = true;
                                    quest.active = false;
                                    setTimeout(() => {
                                        Game.notify('All Tide Shards recovered! Return to Prof. Maris.', 'success');
                                    }, 1800);
                                }
                            }
                        }
                    }
                    Game.updatePartyStrip();
                },
            });
        });
    }

    // ── NPC INTERACTION ──────────────────────────────────────
    function checkInteract() {
        let tx = player.x, ty = player.y;
        if (player.facing === 'up')    ty--;
        if (player.facing === 'down')  ty++;
        if (player.facing === 'left')  tx--;
        if (player.facing === 'right') tx++;

        if (!currentMap) return;
        const facedTile = currentMap.tiles[ty] && currentMap.tiles[ty][tx];

        // Exit tile inside interior — go back to overworld
        if (facedTile === T.EXIT && currentMap.isInterior) {
            const exitMap = currentMap.exitMap;
            const exitPos = currentMap.exitPos;
            loadMap(exitMap);
            if (exitPos) {
                player.x = exitPos.x; player.y = exitPos.y;
                player.px = player.x * TILE_SIZE; player.py = player.y * TILE_SIZE;
                player.targetPx = player.px; player.targetPy = player.py;
            }
            return;
        }

        // Entering the Tidecenter from outside (CENTER tile on overworld)
        if (facedTile === T.CENTER) {
            loadMap('tidecenter');
            return;
        }

        const npc = currentMap.npcs.find(n => n.tile.x === tx && n.tile.y === ty);
        if (npc) {
            // Tidecenter interior NPCs open their overlays directly
            if (npc.id === 'tidecenter_nurse') { Game.openTidecenter(); return; }
            if (npc.id === 'tidecenter_pc')    { Game.openPCStorage();  return; }
            startNpcDialogue(npc.id);
        }
    }

    function startNpcDialogue(npcId) {
        const npcData = NPCS[npcId];
        if (!npcData) return;
        inDialogue = true;
        currentNpcId = npcId;

        // Quest-aware dialogue for Prof Maris
        let lines = [...npcData.dialogues];
        if (npcId === 'prof_maris') {
            const quest = Game.state.quests && Game.state.quests.tide_shard_recovery;
            if (quest && quest.complete) {
                lines = [
                    'You found all three Tide Shards! Extraordinary work.',
                    'These resonance fragments will allow me to triangulate the Aether Current\'s break point.',
                    'This changes everything. The next disruption — we may be able to prevent it.',
                    'Take this — a small token of thanks. Keep your companion close. The journey is far from over.',
                ];
            } else if (quest && quest.active && (quest.shardsFound || 0) > 0) {
                const found = quest.shardsFound;
                const req   = quest.shardsRequired;
                lines = [
                    `Good progress — you've found ${found} of ${req} Tide Shards so far.`,
                    'Keep battling wild creatures in Route 1\'s tall grass. The remaining shards will surface.',
                    'Be careful out there.',
                ];
            } else if (!quest || !quest.active) {
                lines = [
                    'Oh — you\'re here! Good. I have a task that cannot wait.',
                    'MISSION: Tide Shard Recovery',
                    'There are three Tide Shards scattered through Brinefall and Route 1.',
                    'Each shard contains a fragment of the Aether Current\'s resonance signature.',
                    'I need them recovered before Solterra agents locate them first.',
                    'Search the tall grass of Route 1. Creatures in that area have been seen carrying shards.',
                    'Defeat or capture enough wild creatures — the shards will surface. I\'m counting on you.',
                ];
            }
        }

        dialogueQueue = lines;
        showDialogue(npcData.name, dialogueQueue.shift());
    }

    function showDialogue(speaker, text) {
        const dlgBox = document.getElementById('overworld-dlg');
        const spkEl  = document.getElementById('ow-dlg-speaker');
        const txtEl  = document.getElementById('ow-dlg-text');
        if (!dlgBox) return;
        spkEl.textContent = speaker;
        txtEl.textContent = text;
        dlgBox.classList.remove('hidden');
    }

    function advanceDialogue() {
        if (!inDialogue) return;
        if (dialogueQueue.length > 0) {
            const npcData = NPCS[currentNpcId];
            showDialogue(npcData?.name || '', dialogueQueue.shift());
        } else {
            inDialogue = false;
            currentNpcId = null;
            document.getElementById('overworld-dlg')?.classList.add('hidden');
        }
    }

    // ── ACTION MENU ──────────────────────────────────────────
    function toggleActionMenu() {
        const menu = document.getElementById('action-menu');
        if (!menu) return;
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            menu.classList.add('menu-open');
        } else {
            menu.classList.remove('menu-open');
            setTimeout(() => menu.classList.add('hidden'), 180);
        }
    }

    // ── WEATHER ──────────────────────────────────────────────
    function scheduleWeatherCycle() {
        if (weatherTimer) clearTimeout(weatherTimer);
        const delay = (180 + Math.random() * 240) * 1000;
        weatherTimer = setTimeout(() => {
            if (!currentMap || !Game.state.options?.weather) return scheduleWeatherCycle();
            const opts = currentMap.ambientWeather;
            const nw = opts[Math.floor(Math.random() * opts.length)];
            if (nw !== Game.state.weather) Game.setWeather(nw);
            scheduleWeatherCycle();
        }, delay);
    }

    // ── CAMERA ───────────────────────────────────────────────
    function updateCamera() {
        if (currentMap && currentMap.isInterior) {
            // No scrolling in interiors — camera stays at 0
            camera.x = 0; camera.y = 0;
            return;
        }
        const mapW = MAP_COLS * TILE_SIZE, mapH = MAP_ROWS * TILE_SIZE;
        // Centre camera on player, clamped to map edges
        camera.x = Math.max(0, Math.min(mapW - VIEW_W, player.px + TILE_SIZE / 2 - VIEW_W / 2));
        camera.y = Math.max(0, Math.min(mapH - VIEW_H, player.py + TILE_SIZE / 2 - VIEW_H / 2));
    }

    // ── RENDER LOOP ──────────────────────────────────────────
    function startLoop() {
        function loop(time) {
            const dt = time - lastTime; lastTime = time;
            animTimer = time;
            const owActive = document.getElementById('screen-overworld')?.classList.contains('active');
            if (owActive) {
                processMovement();
                updatePlayerPosition();
                updateCamera();
                // Always refresh interact prompt (handles idle standing near NPCs/tiles)
                if (!player.moving && !inDialogue) updateInteractPrompt();
                render(time);
            }
            animFrame = requestAnimationFrame(loop);
        }
        animFrame = requestAnimationFrame(loop);
    }

    function render(time) {
        if (!ctx || !currentMap) return;

        const isInterior = currentMap.isInterior;
        const mapCols = currentMap.tiles[0].length;
        const mapRows = currentMap.tiles.length;
        const renderW = isInterior ? mapCols * TILE_SIZE : VIEW_W;
        const renderH = isInterior ? mapRows * TILE_SIZE : VIEW_H;

        ctx.clearRect(0, 0, renderW, renderH);
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        // Frame calculation for animated tiles
        const frameIndex = Math.floor(time / 400) % 4;

        // Draw only the tiles visible in the viewport
        const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
        const endCol   = Math.min(mapCols, startCol + (isInterior ? mapCols : VIEW_COLS + 2));
        const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
        const endRow   = Math.min(mapRows, startRow + (isInterior ? mapRows : VIEW_ROWS + 2));

        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const tile = currentMap.tiles[row][col];
                const tileFrames = tileCache && tileCache[tile];
                if (tileFrames) {
                    const f = tileFrames.length > 1 ? frameIndex % tileFrames.length : 0;
                    ctx.drawImage(tileFrames[f], col*TILE_SIZE, row*TILE_SIZE);
                } else {
                    ctx.fillStyle = TILE_BASE[tile] || '#111';
                    ctx.fillRect(col*TILE_SIZE, row*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        // Shadows under entities
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        currentMap.npcs.forEach(npc => {
            ctx.beginPath();
            ctx.ellipse(npc.tile.x*TILE_SIZE+TILE_SIZE/2, npc.tile.y*TILE_SIZE+TILE_SIZE-6, 14, 5, 0, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.beginPath();
        ctx.ellipse(player.px+TILE_SIZE/2, player.py+TILE_SIZE-6, 14, 5, 0, 0, Math.PI*2);
        ctx.fill();

        // Draw NPCs
        currentMap.npcs.forEach(npc => drawNPC(npc));

        // Draw player
        drawPlayer();

        // Draw interact prompt above the target tile
        if (interactPrompt && !inDialogue) {
            drawInteractPrompt(interactPrompt);
        }

        ctx.restore();
    }

    function drawInteractPrompt(prompt) {
        // Hover bubble above the target NPC/tile
        const wx = prompt.tx * TILE_SIZE + TILE_SIZE / 2;
        const wy = prompt.ty * TILE_SIZE - 8;

        const text = prompt.label;
        ctx.save();
        ctx.font = 'bold 11px "Courier New", monospace';
        const tw = ctx.measureText(text).width;
        const pad = 8;
        const bw = tw + pad * 2;
        const bh = 20;
        const bx = wx - bw / 2;
        const by = wy - bh;

        // Bouncy float animation
        const bounce = Math.sin(Date.now() / 400) * 3;

        // Background pill
        ctx.fillStyle = 'rgba(10,20,40,0.88)';
        ctx.beginPath();
        ctx.roundRect(bx, by + bounce, bw, bh, 5);
        ctx.fill();

        // Teal border
        ctx.strokeStyle = '#40c8ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by + bounce, bw, bh, 5);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#e0f4ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, wx, by + bh / 2 + bounce);
        ctx.restore();
    }

    function drawNPC(npc) {
        const px = npc.tile.x * TILE_SIZE;
        const py = npc.tile.y * TILE_SIZE;
        const npcDef = NPCS[npc.id];
        if (!npcDef) return;

        const s = TILE_SIZE / 40;
        const p = s * 4; // Virtual Pixel size

        // Common blocky body
        if (npc.id === 'prof_maris') {
            // Lab coat (blocky)
            ctx.fillStyle = '#e8eaf0'; ctx.fillRect(px+8*s, py+18*s, 24*s, 18*s);
            ctx.fillStyle = '#4a8ab0'; ctx.fillRect(px+12*s, py+20*s, 16*s, 12*s);
            // Skin
            ctx.fillStyle = '#d4a070';
            ctx.fillRect(px+14*s, py+6*s, 12*s, 12*s); // Head
            ctx.fillRect(px+4*s, py+30*s, 4*s, 4*s); // Hands
            ctx.fillRect(px+32*s, py+30*s, 4*s, 4*s);
            // Hair
            ctx.fillStyle = '#c0c0c0'; ctx.fillRect(px+12*s, py+4*s, 16*s, 4*s);
            // Glasses
            ctx.fillStyle = '#404040'; ctx.fillRect(px+14*s, py+10*s, 12*s, 2*s);
            // Legs
            ctx.fillStyle = '#3a5080'; ctx.fillRect(px+10*s, py+36*s, 8*s, 8*s); ctx.fillRect(px+22*s, py+36*s, 8*s, 8*s);
        } else if (npc.id === 'harbor_guard') {
            // Armor
            ctx.fillStyle = '#4a5060'; ctx.fillRect(px+8*s, py+18*s, 24*s, 20*s);
            ctx.fillStyle = '#606878'; ctx.fillRect(px+10*s, py+20*s, 20*s, 8*s);
            // Helmet
            ctx.fillStyle = '#505868'; ctx.fillRect(px+12*s, py+6*s, 16*s, 12*s);
            ctx.fillStyle = '#c8a070'; ctx.fillRect(px+14*s, py+12*s, 12*s, 4*s); // Face slit
            // Spear
            ctx.fillStyle = '#8a7050'; ctx.fillRect(px+34*s, py+2*s, 2*s, 44*s);
            ctx.fillStyle = '#a0b8d0'; ctx.fillRect(px+33*s, py+2*s, 4*s, 6*s);
        } else if (npc.id === 'route1_sign') {
            // Sign post — tall wooden post with sign board
            ctx.fillStyle = '#6b4a1a'; ctx.fillRect(px+20*s, py+10*s, 4*s, 30*s); // post
            ctx.fillStyle = '#c8a060'; ctx.fillRect(px+8*s,  py+6*s, 24*s, 16*s); // board
            ctx.fillStyle = '#3a2000';
            ctx.fillRect(px+10*s, py+9*s,  18*s, 2*s);  // line 1
            ctx.fillRect(px+10*s, py+13*s, 12*s, 2*s);  // line 2
            ctx.fillRect(px+10*s, py+17*s, 16*s, 2*s);  // line 3
        } else if (npc.id === 'route1_hiker') {
            // Hiker — brown hat, vest, backpack
            ctx.fillStyle = '#7a4a18'; ctx.fillRect(px+10*s, py+4*s,  20*s, 6*s);  // hat brim
            ctx.fillStyle = '#5a3010'; ctx.fillRect(px+12*s, py+0,     16*s, 6*s);  // hat top
            ctx.fillStyle = '#c8a070'; ctx.fillRect(px+14*s, py+8*s,  12*s, 10*s); // face
            ctx.fillStyle = '#5a7a30'; ctx.fillRect(px+10*s, py+18*s, 20*s, 20*s); // vest/shirt
            ctx.fillStyle = '#8a9a50'; ctx.fillRect(px+12*s, py+20*s, 16*s, 8*s);  // vest front
            ctx.fillStyle = '#3a5018'; ctx.fillRect(px+26*s, py+12*s,  8*s, 22*s); // backpack
            ctx.fillStyle = '#4a2a10'; ctx.fillRect(px+10*s, py+38*s,  8*s, 8*s);  // left leg
            ctx.fillStyle = '#4a2a10'; ctx.fillRect(px+22*s, py+38*s,  8*s, 8*s);  // right leg
            ctx.fillStyle = '#3a1a00'; ctx.fillRect(px+10*s, py+44*s,  8*s, 4*s);  // boot L
            ctx.fillStyle = '#3a1a00'; ctx.fillRect(px+22*s, py+44*s,  8*s, 4*s);  // boot R
        } else if (npc.id === 'tidecenter_nurse') {
            // Nurse — white uniform, teal cross hat, kind face
            ctx.fillStyle = '#e8f4f8'; ctx.fillRect(px+10*s, py+18*s, 20*s, 22*s); // uniform
            ctx.fillStyle = '#c8e8f0'; ctx.fillRect(px+12*s, py+20*s, 16*s, 10*s); // apron front
            ctx.fillStyle = '#c08870'; ctx.fillRect(px+14*s, py+6*s,  12*s, 12*s); // face
            ctx.fillStyle = '#ff8080'; ctx.fillRect(px+12*s, py+2*s,  16*s,  6*s); // hat base
            ctx.fillStyle = '#fff';    ctx.fillRect(px+18*s, py+2*s,   4*s,  6*s); // hat white
            ctx.fillStyle = '#40c0d0'; // teal cross on hat
            ctx.fillRect(px+19*s, py+1*s, 2*s, 6*s);
            ctx.fillRect(px+18*s, py+3*s, 4*s, 2*s);
            ctx.fillStyle = '#b07040'; ctx.fillRect(px+12*s, py+4*s, 16*s, 4*s); // hair
            ctx.fillStyle = '#e0e0e0'; ctx.fillRect(px+10*s, py+40*s, 8*s, 8*s); ctx.fillRect(px+22*s, py+40*s, 8*s, 8*s);
            ctx.fillStyle = '#d0b0a0'; ctx.fillRect(px+10*s, py+46*s, 8*s, 2*s); ctx.fillRect(px+22*s, py+46*s, 8*s, 2*s);
        } else if (npc.id === 'tidecenter_pc') {
            // PC terminal — glowing blue monitor
            ctx.fillStyle = '#0a1820'; ctx.fillRect(px+2*s,  py+6*s,  36*s, 26*s); // outer frame
            ctx.fillStyle = '#1a2a40'; ctx.fillRect(px+4*s,  py+8*s,  32*s, 24*s); // body
            ctx.fillStyle = '#40c8ff'; ctx.fillRect(px+6*s,  py+10*s, 28*s, 18*s); // screen glow
            ctx.fillStyle = '#204060'; ctx.fillRect(px+8*s,  py+12*s, 24*s, 14*s); // screen inner
            ctx.fillStyle = '#40e8ff';
            ctx.fillRect(px+10*s, py+15*s, 10*s, 1*s);
            ctx.fillRect(px+10*s, py+18*s, 16*s, 1*s);
            ctx.fillRect(px+10*s, py+21*s, 8*s,  1*s);
            ctx.fillStyle = '#1a2a40'; ctx.fillRect(px+14*s, py+32*s, 12*s, 4*s); // stand
            ctx.fillStyle = '#2a3a50'; ctx.fillRect(px+8*s,  py+36*s, 24*s, 4*s); // base
        } else {
            // Default / elder_sota — Robe
            ctx.fillStyle = '#7a5a30'; ctx.fillRect(px+10*s, py+18*s, 20*s, 28*s);
            ctx.fillStyle = '#9a7a50'; ctx.fillRect(px+14*s, py+22*s, 12*s, 12*s);
            // Head/Beard
            ctx.fillStyle = '#c89060'; ctx.fillRect(px+14*s, py+8*s, 12*s, 10*s);
            ctx.fillStyle = '#e8e0d0'; ctx.fillRect(px+12*s, py+6*s, 16*s, 4*s); ctx.fillRect(px+14*s, py+18*s, 12*s, 6*s);
        }

        // Name tag (blocky) — skip for sign
        if (npc.id !== 'route1_sign') {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(px, py-16, TILE_SIZE, 14);
            ctx.fillStyle = '#e8b84b';
            ctx.font = `bold ${8*s}px "Cinzel", serif`;
            ctx.textAlign = 'center';
            ctx.fillText(npcDef.name.split(' ').slice(-1)[0].substring(0, 8), px+TILE_SIZE/2, py-4);
        }
    }

    function drawPlayer() {
        const px = player.px;
        const py = player.py;
        const s = TILE_SIZE / 16;      // 1 virtual pixel = 3px at TILE_SIZE 48
        const frame = player.walkFrame; // 0=neutral, 1=left-fwd, 2=right-fwd
        const moving = player.moving;
        const facing = player.facing;
        const gender = (typeof Game !== 'undefined') ? (Game.state.playerGender || 'male') : 'male';

        const P = (ox, oy, w, h, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(px + ox*s, py + oy*s, w*s, h*s);
        };

        if (gender === 'male') {
            // ── MALE: green-banded cap, navy shirt, black shorts ──

            // --- Legs (drawn first, body covers upper overlap) ---
            if (!moving || frame === 0) {
                // Neutral: both legs level
                P(2, 10, 5, 5, '#1e1e2e');  // left leg
                P(9, 10, 5, 5, '#1e1e2e');  // right leg
                P(2, 14, 5, 1, '#111');      // left shoe
                P(9, 14, 5, 1, '#111');      // right shoe
            } else if (frame === 1) {
                // Left foot forward
                P(2, 11, 5, 4, '#1e1e2e');  P(2, 14, 5, 1, '#111');  // left forward
                P(9,  9, 5, 5, '#2e2e3e');  P(9, 13, 5, 1, '#0a0a0a'); // right back
            } else {
                // Right foot forward
                P(2,  9, 5, 5, '#2e2e3e');  P(2, 13, 5, 1, '#0a0a0a'); // left back
                P(9, 11, 5, 4, '#1e1e2e');  P(9, 14, 5, 1, '#111');    // right forward
            }

            // Shorts divider line
            P(2, 10, 12, 1, '#111');

            // Shirt body (navy)
            P(2,  7, 12, 4, '#1a2a4a');
            // Shirt collar accent (teal stripe at shoulder)
            P(2,  7, 12, 1, '#2ab5c7');

            // Backpack (shown on left side of body for down/up)
            if (facing !== 'left' && facing !== 'right') {
                P(1, 7, 2, 5, '#3a7a40');   // left-side pack
                P(1, 7, 2, 1, '#5aaa60');   // pack highlight
            }

            // Arms (skin tone, slightly inset from edge)
            P(1,  8, 2, 3, '#d4a070');   // left arm
            P(13, 8, 2, 3, '#d4a070');   // right arm
            // Cuffs
            P(1,  10, 2, 1, '#1a2a4a');
            P(13, 10, 2, 1, '#1a2a4a');

            // Neck
            P(6, 6, 4, 2, '#d4a070');

            // Head (skin)
            P(3, 1, 10, 5, '#d4a070');
            // Ear dots
            P(3, 3, 1, 1, '#c09060');
            P(12, 3, 1, 1, '#c09060');

            // Face
            if (facing === 'down') {
                P(5, 3, 2, 1, '#222');   // left eye
                P(9, 3, 2, 1, '#222');   // right eye
                P(7, 4, 2, 1, '#b87050'); // mouth
            } else if (facing === 'left') {
                P(3, 3, 2, 1, '#222');
                P(3, 4, 1, 1, '#b87050');
            } else if (facing === 'right') {
                P(11, 3, 2, 1, '#222');
                P(12, 4, 1, 1, '#b87050');
            }
            // (up = back of head, no face)

            // Cap — green band + white front panel + dark visor brim
            P(2, 0, 12, 3, '#3a8a45');   // green cap band
            P(4, 0,  5, 3, '#eaeaea');   // white front panel
            P(4, 0,  5, 1, '#ffffff');   // highlight on white
            P(1, 2, 14, 1, '#222');      // brim underside (dark strip)
            P(0, 1,  2, 1, '#2a6a32');   // left cap side
            P(14,1,  2, 1, '#2a6a32');   // right cap side
            // Cap button
            P(7, 0, 2, 1, '#3a8a45');

        } else {
            // ── FEMALE: white hair clip, red top, black shorts ──

            // --- Legs ---
            if (!moving || frame === 0) {
                P(3, 10, 4, 5, '#111');   // left leg
                P(9, 10, 4, 5, '#111');   // right leg
                P(3, 14, 4, 1, '#333');   // left shoe
                P(9, 14, 4, 1, '#333');   // right shoe
            } else if (frame === 1) {
                P(3, 11, 4, 4, '#111');   P(3, 14, 4, 1, '#333');  // left forward
                P(9,  9, 4, 5, '#1e1e1e'); P(9, 13, 4, 1, '#222'); // right back
            } else {
                P(3,  9, 4, 5, '#1e1e1e'); P(3, 13, 4, 1, '#222'); // left back
                P(9, 11, 4, 4, '#111');   P(9, 14, 4, 1, '#333');  // right forward
            }

            // Shorts divider
            P(3, 10, 10, 1, '#080808');

            // Top (red, sleeveless — slightly narrower than body)
            P(3, 7, 10, 4, '#b81818');
            // Neckline V
            P(6, 7, 4, 1, '#cc2828');
            P(7, 6, 2, 1, '#d4a070');   // skin showing at neckline

            // Arms (bare skin, slender)
            P(1, 7, 3, 4, '#d4a070');   // left arm
            P(12,7, 3, 4, '#d4a070');   // right arm
            P(1, 10,3, 1, '#c09060');   // arm shadow
            P(12,10,3, 1, '#c09060');

            // Neck
            P(6, 5, 4, 2, '#d4a070');

            // Head
            P(3, 1, 10, 5, '#d4a070');
            // Ear dots
            P(3, 3, 1, 1, '#c09060');
            P(12,3, 1, 1, '#c09060');

            // Face
            if (facing === 'down') {
                P(5, 3, 2, 1, '#222');
                P(9, 3, 2, 1, '#222');
                P(7, 4, 2, 1, '#b87050');
            } else if (facing === 'left') {
                P(3, 3, 2, 1, '#222');
                P(3, 4, 1, 1, '#b87050');
            } else if (facing === 'right') {
                P(11, 3, 2, 1, '#222');
                P(12, 4, 1, 1, '#b87050');
            }

            // Hair (dark brown base, visible around headband)
            P(3, 2, 10, 1, '#3a1e08');   // hair above headband
            P(3, 5,  3, 2, '#3a1e08');   // left side bangs
            P(10,5,  3, 2, '#3a1e08');   // right side bangs
            // Hair back (up/side directions show more hair)
            if (facing === 'up' || facing === 'left' || facing === 'right') {
                P(3, 5, 10, 1, '#3a1e08');
            }

            // Headband (white clip-style, sits at y=1)
            P(2, 1, 12, 2, '#f0f0f0');   // white headband
            P(7, 0,  2, 1, '#e0e0e0');   // top of clip
            P(2, 1,  1, 2, '#d0d0d0');   // left shadow
            P(13,1,  1, 2, '#d0d0d0');   // right shadow
        }
    }

    // ── PUBLIC ───────────────────────────────────────────────
    return {
        init,
        loadMap,
        toggleActionMenu,
        drawSprite,
        SPRITE_PAINTERS,

        teleportPlayer(tx, ty) {
            player.x = tx; player.y = ty;
            player.px = tx * TILE_SIZE; player.py = ty * TILE_SIZE;
            player.targetPx = player.px; player.targetPy = player.py;
            player.moving = false;
            player.pendingEncounter = false;
            interactPrompt = null;
            inBattle = false;
        },

        // Enter the Tidecenter interior map directly (used by blackout)
        enterTidecenter() {
            loadMap('tidecenter');
        },

        pauseLoop() {
            if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
        },
        resumeLoop() {
            if (!animFrame) startLoop();
        },
        setWeatherVisual(weatherKey) {
            const wDef = WEATHER[weatherKey];
            const layer = document.getElementById('weather-layer');
            if (layer && wDef) {
                layer.className = 'weather-layer';
                if (wDef.class) layer.classList.add(wDef.class);
            }
            const hudWeather = document.getElementById('hud-weather');
            if (hudWeather && wDef) hudWeather.textContent = wDef.label;
        },
    };
})();
