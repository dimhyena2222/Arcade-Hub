// ============================================================
//  TIDEBREAK: Legacy of the Storms — OVERWORLD.JS
//  Canvas tile map, player movement, NPCs, encounters, weather
// ============================================================

'use strict';

const OverworldEngine = (() => {

    // ── CONSTANTS ─────────────────────────────────────────────
    const TILE_SIZE    = 48;
    const MAP_COLS     = 28;
    const MAP_ROWS     = 20;
    const ENCOUNTER_RATE = 0.12;

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
    };

    // ── BRINEFALL MAP (28×20) ────────────────────────────────
    const MAPS = {
        brinefall: {
            tiles: [
                [8,8,8,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [8,8,8,0,0,0,0,0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0,0,0,0],
                [8,8,0,0,5,5,5,5,1,1,1,1,1,1,1,1,1,1,1,1,1,5,5,0,0,0,0,0],
                [8,0,0,5,1,1,1,1,3,3,3,3,3,3,3,3,3,1,1,1,1,1,5,5,0,0,0,0],
                [0,0,5,1,1,6,1,1,3,1,1,1,1,11,11,3,1,1,6,1,1,1,1,5,0,0,0,0],
                [0,5,1,1,1,1,1,1,3,1,1,1,1,1,1,3,1,1,1,1,1,1,1,5,0,0,0,0,0],
                [0,5,1,1,1,1,1,1,3,1,10,1,1,1,1,3,1,1,1,1,1,6,1,5,0,0,0,0],
                [0,5,1,6,1,1,1,1,3,3,3,3,3,3,3,3,3,3,3,1,1,1,1,5,0,0,0,0],
                [0,5,1,1,1,1,1,1,1,1,3,1,1,1,1,1,3,1,1,1,1,1,1,5,5,0,0,0],
                [0,5,1,1,1,1,1,1,1,1,3,1,6,1,1,1,3,1,1,1,1,1,1,1,5,0,0,0],
                [0,5,1,1,11,11,1,1,1,1,3,1,1,1,1,1,3,1,1,11,11,1,1,1,5,0,0,0],
                [0,5,1,1,1,1,1,1,2,2,3,2,2,2,2,2,3,2,2,1,1,1,1,1,5,0,0,0],
                [0,5,1,1,1,1,1,2,2,2,3,2,2,10,2,2,3,2,2,2,1,1,1,1,5,0,0,0],
                [0,5,1,1,1,1,2,2,2,2,3,2,2,2,2,2,3,2,2,2,2,1,1,1,5,5,0,0],
                [0,5,5,1,1,1,1,1,1,1,3,1,1,1,1,1,3,1,1,1,1,1,1,5,5,0,0,0],
                [0,0,5,5,1,1,1,1,1,1,7,1,1,1,1,1,7,1,1,1,1,1,5,5,0,0,0,0],
                [0,0,0,5,5,1,1,1,1,1,7,1,9,1,1,1,7,1,1,1,9,1,5,5,0,0,0,0],
                [0,0,0,0,5,5,5,5,5,5,7,5,5,5,5,5,7,5,5,5,5,5,5,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            ],
            encounterZones: [T.GRASS, T.SHORE],
            playerStart: { x: 13, y: 12 },
            npcs: [
                { id: 'prof_maris',   tile: { x: 13, y: 9  } },
                { id: 'harbor_guard', tile: { x: 10, y: 15 } },
                { id: 'elder_sota',   tile: { x: 5,  y: 8  } },
            ],
            encounterTable: 'brinefall_shore',
            ambientWeather: ['CLEAR', 'RAIN'],
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
    let player = {
        x: 13, y: 12,      // tile position
        px: 13*TILE_SIZE,   // pixel position (interpolated)
        py: 12*TILE_SIZE,
        targetPx: 13*TILE_SIZE,
        targetPy: 12*TILE_SIZE,
        moving: false,
        facing: 'down',
        walkFrame: 0,       // 0-3 walk cycle
        walkTimer: 0,
    };
    let camera = { x: 0, y: 0 };
    let dialogueQueue = [];
    let inDialogue = false;
    let currentNpcId = null;
    let animFrame = null;
    let weatherTimer = null;
    let lastTime = 0;
    const WALK_SPEED = 4;   // pixels per frame

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
        player.x = currentMap.playerStart.x;
        player.y = currentMap.playerStart.y;
        player.px = player.x * TILE_SIZE;
        player.py = player.y * TILE_SIZE;
        player.targetPx = player.px;
        player.targetPy = player.py;
        buildTileCache();
        resizeCanvas();
        const locEl = document.getElementById('hud-location');
        if (locEl) locEl.textContent = REGIONS[mapId]?.name || mapId;
        scheduleWeatherCycle();
    }

    function resizeCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
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

        if (e.key === 'Escape') { e.preventDefault(); toggleActionMenu(); return; }
        if (menuOpen) return;

        if (inDialogue) {
            if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter') advanceDialogue();
            return;
        }

        if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter') { checkInteract(); return; }

        keysHeld[e.key] = true;
    }

    // ── MOVEMENT (smooth interpolation) ─────────────────────
    function processMovement() {
        if (player.moving || inDialogue) return;
        const menuOpen = document.getElementById('action-menu') && !document.getElementById('action-menu').classList.contains('hidden');
        if (menuOpen) return;

        let dx = 0, dy = 0;
        if (keysHeld['ArrowUp']    || keysHeld['w'] || keysHeld['W']) { dy = -1; player.facing = 'up'; }
        else if (keysHeld['ArrowDown']  || keysHeld['s'] || keysHeld['S']) { dy =  1; player.facing = 'down'; }
        else if (keysHeld['ArrowLeft']  || keysHeld['a'] || keysHeld['A']) { dx = -1; player.facing = 'left'; }
        else if (keysHeld['ArrowRight'] || keysHeld['d'] || keysHeld['D']) { dx =  1; player.facing = 'right'; }

        if (dx === 0 && dy === 0) return;

        const nx = player.x + dx;
        const ny = player.y + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_COLS || ny >= MAP_ROWS) return;

        const tile = currentMap.tiles[ny][nx];
        if (tile === T.WALL || tile === T.HOUSE || tile === T.TREE || tile === T.ROCK ||
            tile === T.WATER || tile === T.DEEP) return;

        const npcAtTile = currentMap.npcs.find(n => n.tile.x === nx && n.tile.y === ny);
        if (npcAtTile) { startNpcDialogue(npcAtTile.id); return; }

        // Start smooth movement
        player.x = nx; player.y = ny;
        player.targetPx = nx * TILE_SIZE;
        player.targetPy = ny * TILE_SIZE;
        player.moving = true;
        player.walkTimer++;
        if (player.walkTimer % 2 === 0) player.walkFrame = (player.walkFrame + 1) % 4;

        // Encounter check
        if (currentMap.encounterZones.includes(tile)) {
            if (Math.random() < ENCOUNTER_RATE) {
                // Delay encounter until movement completes
                player.pendingEncounter = true;
            }
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
        const wild = createWildEncounter(currentMap.encounterTable);
        if (!wild || !Game.state.party.length) return;
        const lead = Game.state.party[0];
        BattleEngine.startBattle(lead, wild, {
            weather: Game.state.weather,
            wildBattle: true,
            canRun: true,
            onBattleEnd(result) {
                if (result === 'lose') {
                    Game.notify('Your companion fainted...', 'warning');
                    lead.stats.vit = Math.max(1, Math.floor(lead.stats.maxVit * 0.1));
                    Game.updatePartyStrip();
                }
            },
        });
    }

    // ── NPC INTERACTION ──────────────────────────────────────
    function checkInteract() {
        let tx = player.x, ty = player.y;
        if (player.facing === 'up')    ty--;
        if (player.facing === 'down')  ty++;
        if (player.facing === 'left')  tx--;
        if (player.facing === 'right') tx++;
        const npc = currentMap.npcs.find(n => n.tile.x === tx && n.tile.y === ty);
        if (npc) startNpcDialogue(npc.id);
    }

    function startNpcDialogue(npcId) {
        const npcData = NPCS[npcId];
        if (!npcData) return;
        inDialogue = true;
        currentNpcId = npcId;
        dialogueQueue = [...npcData.dialogues];
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
        const cw = canvas.width, ch = canvas.height;
        const mapW = MAP_COLS * TILE_SIZE, mapH = MAP_ROWS * TILE_SIZE;
        
        if (mapW > cw) {
            camera.x = Math.max(0, Math.min(mapW - cw, player.px + TILE_SIZE/2 - cw/2));
        } else {
            camera.x = 0;
        }

        if (mapH > ch) {
            camera.y = Math.max(0, Math.min(mapH - ch, player.py + TILE_SIZE/2 - ch/2));
        } else {
            camera.y = 0;
        }
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
                render(time);
            }
            animFrame = requestAnimationFrame(loop);
        }
        animFrame = requestAnimationFrame(loop);
    }

    function render(time) {
        if (!ctx || !currentMap) return;
        const cw = canvas.width, ch = canvas.height;
        const mapW = MAP_COLS * TILE_SIZE, mapH = MAP_ROWS * TILE_SIZE;

        // Calculate centering offsets for monitors larger than the map
        const offX = mapW < cw ? Math.floor((cw - mapW) / 2) : 0;
        const offY = mapH < ch ? Math.floor((ch - mapH) / 2) : 0;

        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(offX - camera.x, offY - camera.y);

        // Frame calculation for animated tiles
        const frameIndex = Math.floor(time / 400) % 4;

        // Draw tiles from cache
        const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
        const endCol   = Math.min(MAP_COLS, startCol + Math.ceil(cw / TILE_SIZE) + 2);
        const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
        const endRow   = Math.min(MAP_ROWS, startRow + Math.ceil(ch / TILE_SIZE) + 2);

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
        } else {
            // Robe
            ctx.fillStyle = '#7a5a30'; ctx.fillRect(px+10*s, py+18*s, 20*s, 28*s);
            ctx.fillStyle = '#9a7a50'; ctx.fillRect(px+14*s, py+22*s, 12*s, 12*s);
            // Head/Beard
            ctx.fillStyle = '#c89060'; ctx.fillRect(px+14*s, py+8*s, 12*s, 10*s);
            ctx.fillStyle = '#e8e0d0'; ctx.fillRect(px+12*s, py+6*s, 16*s, 4*s); ctx.fillRect(px+14*s, py+18*s, 12*s, 6*s);
        }

        // Name tag (blocky)
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(px, py-16, TILE_SIZE, 14);
        ctx.fillStyle = '#e8b84b';
        ctx.font = `bold ${8*s}px "Cinzel", serif`;
        ctx.textAlign = 'center';
        ctx.fillText(npcDef.name.split(' ').slice(-1)[0].substring(0, 8), px+TILE_SIZE/2, py-4);
    }

    function drawPlayer() {
        const px = player.px;
        const py = player.py;
        const s = TILE_SIZE / 40;
        const frame = player.walkFrame;
        const moving = player.moving;
        const facing = player.facing;

        // Pixel-walk offsets
        const bobY = moving ? [0, -4, 0, -4][frame] * s : 0;
        const legH = moving ? [12, 8, 12, 8][frame] * s : 12*s;

        // Legs (Full blocky)
        ctx.fillStyle = '#2a3a6a';
        ctx.fillRect(px+10*s, py+28*s+bobY, 8*s, legH);
        ctx.fillRect(px+22*s, py+28*s+bobY, 8*s, legH);

        // Body
        ctx.fillStyle = '#2a7a50';
        ctx.fillRect(px+8*s, py+16*s+bobY, 24*s, 16*s);
        
        // Arms
        ctx.fillRect(px+2*s, py+18*s+bobY, 6*s, 10*s);
        ctx.fillRect(px+32*s, py+18*s+bobY, 6*s, 10*s);

        // Head
        ctx.fillStyle = '#d4a070';
        ctx.fillRect(px+14*s, py+4*s+bobY, 12*s, 12*s);

        // Hair
        ctx.fillStyle = '#302010';
        ctx.fillRect(px+14*s, py+2*s+bobY, 12*s, 4*s);
        ctx.fillRect(px+12*s, py+4*s+bobY, 4*s, 8*s);

        // Face
        ctx.fillStyle = '#000';
        if (facing === 'right') {
            ctx.fillRect(px+22*s, py+8*s+bobY, 2*s, 2*s);
        } else if (facing === 'left') {
            ctx.fillRect(px+16*s, py+8*s+bobY, 2*s, 2*s);
        } else {
            ctx.fillRect(px+17*s, py+8*s+bobY, 2*s, 2*s);
            ctx.fillRect(px+21*s, py+8*s+bobY, 2*s, 2*s);
        }
    }

    // ── PUBLIC ───────────────────────────────────────────────
    return {
        init,
        loadMap,
        toggleActionMenu,
        drawSprite,
        SPRITE_PAINTERS,

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
