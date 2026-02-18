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
    let tileCache = null;

    function buildTileCache() {
        tileCache = {};
        const types = Object.keys(TILE_BASE);
        types.forEach(tKey => {
            const t = parseInt(tKey);
            const oc = document.createElement('canvas');
            oc.width = oc.height = TILE_SIZE;
            const ox = oc.getContext('2d');
            drawTileTexture(ox, t, 0, 0);
            tileCache[t] = oc;
        });
    }

    function drawTileTexture(ox, t, px, py) {
        const base = TILE_BASE[t] || '#111';
        ox.fillStyle = base;
        ox.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        switch(t) {
            case T.WATER:
            case T.DEEP: {
                // Subtle wave lines
                const alpha = t === T.DEEP ? 0.04 : 0.07;
                ox.strokeStyle = `rgba(100,200,240,${alpha})`;
                ox.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    ox.beginPath();
                    ox.moveTo(px + 4 + i*14, py + 8 + i*12);
                    ox.quadraticCurveTo(px + 12 + i*14, py + 4 + i*12, px + 20 + i*14, py + 8 + i*12);
                    ox.stroke();
                }
                break;
            }
            case T.SAND: {
                // Speckles
                ox.fillStyle = 'rgba(180,140,70,0.3)';
                for (let i = 0; i < 5; i++) {
                    const sx = px + (i*11+3) % TILE_SIZE;
                    const sy = py + (i*17+5) % TILE_SIZE;
                    ox.fillRect(sx, sy, 2, 1);
                }
                break;
            }
            case T.GRASS: {
                // Grass blades
                ox.strokeStyle = 'rgba(60,120,50,0.6)';
                ox.lineWidth = 1.5;
                [[8,36,10,28],[20,34,22,24],[32,38,34,26],[44,35,46,25],[14,38,13,26],[38,37,37,25]].forEach(([x1,y1,x2,y2]) => {
                    ox.beginPath();
                    ox.moveTo(px+x1, py+y1);
                    ox.lineTo(px+x2, py+y2);
                    ox.stroke();
                });
                // Lighter highlights
                ox.fillStyle = 'rgba(80,180,70,0.15)';
                ox.fillRect(px+4, py+4, 8, 4);
                break;
            }
            case T.PATH: {
                // Stone-like texture
                ox.fillStyle = 'rgba(140,110,70,0.2)';
                ox.fillRect(px+4, py+4, 16, 12);
                ox.fillRect(px+24, py+20, 18, 14);
                ox.fillStyle = 'rgba(255,255,255,0.04)';
                ox.fillRect(px+2, py+2, 44, 2);
                break;
            }
            case T.SHORE: {
                // Sandy fringe over water
                ox.fillStyle = 'rgba(200,160,80,0.15)';
                ox.fillRect(px, py+32, TILE_SIZE, 16);
                ox.strokeStyle = 'rgba(100,200,240,0.15)';
                ox.lineWidth = 1;
                ox.beginPath();
                ox.moveTo(px, py+38); ox.lineTo(px+TILE_SIZE, py+38);
                ox.stroke();
                break;
            }
            case T.HOUSE: {
                // Wall + window
                ox.fillStyle = '#5a3520';
                ox.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ox.fillStyle = '#7a4a30';
                ox.fillRect(px+2, py+2, TILE_SIZE-4, TILE_SIZE-4);
                // Window
                ox.fillStyle = '#1a3a5a';
                ox.fillRect(px+12, py+12, 12, 10);
                ox.strokeStyle = '#8a6040';
                ox.lineWidth = 1.5;
                ox.strokeRect(px+12, py+12, 12, 10);
                // Door
                ox.fillStyle = '#3a1a00';
                ox.fillRect(px+16, py+30, 10, 14);
                break;
            }
            case T.DOCK: {
                ox.fillStyle = '#7a5a32';
                for (let i = 0; i < 3; i++) {
                    ox.fillRect(px + i*16, py, 12, TILE_SIZE);
                }
                ox.fillStyle = 'rgba(0,0,0,0.2)';
                ox.fillRect(px, py, TILE_SIZE, 3);
                break;
            }
            case T.ROCK: {
                ox.fillStyle = '#666070';
                ox.beginPath();
                ox.ellipse(px+TILE_SIZE/2, py+TILE_SIZE/2+4, 16, 12, 0, 0, Math.PI*2);
                ox.fill();
                ox.fillStyle = '#888090';
                ox.beginPath();
                ox.ellipse(px+TILE_SIZE/2-2, py+TILE_SIZE/2+2, 12, 9, -0.2, 0, Math.PI*2);
                ox.fill();
                break;
            }
            case T.FLOWER: {
                // Grass base + flowers
                ox.fillStyle = '#2c6b3a';
                ox.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                [[10,30],[22,24],[36,32],[14,20],[40,22]].forEach(([fx,fy], i) => {
                    const colors = ['#e87878','#f0e040','#78c8e8','#e8a050'];
                    ox.fillStyle = colors[i%4];
                    ox.beginPath();
                    ox.arc(px+fx, py+fy, 3, 0, Math.PI*2);
                    ox.fill();
                });
                break;
            }
            case T.TREE: {
                // Dark ground + tree canopy
                ox.fillStyle = '#1a4a22';
                ox.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                // Trunk
                ox.fillStyle = '#6b4a20';
                ox.fillRect(px+18, py+30, 8, 16);
                // Canopy layers
                ox.fillStyle = '#2a7a32';
                ox.beginPath();
                ox.arc(px+22, py+20, 18, 0, Math.PI*2);
                ox.fill();
                ox.fillStyle = '#3a9a42';
                ox.beginPath();
                ox.arc(px+20, py+16, 13, 0, Math.PI*2);
                ox.fill();
                ox.fillStyle = 'rgba(100,200,80,0.25)';
                ox.beginPath();
                ox.arc(px+18, py+12, 8, 0, Math.PI*2);
                ox.fill();
                break;
            }
        }
    }

    // ── CREATURE SPRITE PAINTERS ─────────────────────────────
    // These draw pixel-art style battle sprites on canvas elements
    const SPRITE_PAINTERS = {
        pyroshell(ctx, x, y, size) {
            const s = size / 80;
            // Shell (round, orange-red gradient)
            const g = ctx.createRadialGradient(x+40*s, y+44*s, 5*s, x+40*s, y+44*s, 36*s);
            g.addColorStop(0, '#ff8c40'); g.addColorStop(0.5, '#c04010'); g.addColorStop(1, '#3a1000');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.ellipse(x+40*s, y+46*s, 34*s, 26*s, 0, 0, Math.PI*2); ctx.fill();
            // Shell pattern (hexagons approximated)
            ctx.strokeStyle = 'rgba(255,60,0,0.4)'; ctx.lineWidth = 1.5*s;
            [[40,44,14],[26,38,9],[54,38,9],[40,56,9]].forEach(([cx,cy,r]) => {
                ctx.beginPath(); ctx.arc(x+cx*s, y+cy*s, r*s, 0, Math.PI*2); ctx.stroke();
            });
            // Head
            const hg = ctx.createRadialGradient(x+40*s, y+22*s, 4*s, x+40*s, y+24*s, 16*s);
            hg.addColorStop(0,'#ffa060'); hg.addColorStop(1,'#8b3000');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.ellipse(x+40*s, y+24*s, 14*s, 14*s, 0, 0, Math.PI*2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x+34*s, y+20*s, 4*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x+46*s, y+20*s, 4*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#1a0000'; ctx.beginPath(); ctx.arc(x+35*s, y+20*s, 2.5*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#1a0000'; ctx.beginPath(); ctx.arc(x+47*s, y+20*s, 2.5*s, 0, Math.PI*2); ctx.fill();
            // Legs
            ctx.fillStyle = '#c04010';
            [[20,62,8,12],[34,68,8,10],[52,68,8,10],[62,60,10,12]].forEach(([lx,ly,lw,lh]) => {
                ctx.beginPath(); ctx.roundRect(x+lx*s, y+ly*s, lw*s, lh*s, 2*s); ctx.fill();
            });
            // Ember glow
            ctx.fillStyle = 'rgba(255,120,20,0.18)';
            ctx.beginPath(); ctx.ellipse(x+40*s, y+70*s, 26*s, 8*s, 0, 0, Math.PI*2); ctx.fill();
        },
        verdantide(ctx, x, y, size) {
            const s = size / 80;
            // Serpentine body
            ctx.lineWidth = 14*s; ctx.lineCap = 'round';
            const bg = ctx.createLinearGradient(x+10*s, y+70*s, x+70*s, y+10*s);
            bg.addColorStop(0,'#004a30'); bg.addColorStop(0.5,'#00b87a'); bg.addColorStop(1,'#60ffcc');
            ctx.strokeStyle = bg;
            ctx.beginPath();
            ctx.moveTo(x+15*s, y+68*s);
            ctx.bezierCurveTo(x+20*s, y+30*s, x+60*s, y+50*s, x+65*s, y+15*s);
            ctx.stroke();
            // Bioluminescent fins
            ctx.fillStyle = 'rgba(0,220,160,0.6)';
            [[30,45,14,6],[50,30,10,5],[40,58,12,5]].forEach(([fx,fy,fw,fh]) => {
                ctx.beginPath();
                ctx.ellipse(x+fx*s, y+fy*s, fw*s, fh*s, -0.4, 0, Math.PI*2);
                ctx.fill();
            });
            // Head
            const hg = ctx.createRadialGradient(x+64*s, y+16*s, 3*s, x+64*s, y+18*s, 13*s);
            hg.addColorStop(0,'#80ffcc'); hg.addColorStop(1,'#007050');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.ellipse(x+64*s, y+18*s, 13*s, 11*s, -0.3, 0, Math.PI*2); ctx.fill();
            // Eye
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x+70*s, y+14*s, 4*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#002a18'; ctx.beginPath(); ctx.arc(x+71*s, y+14*s, 2.5*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(0,255,160,0.6)'; ctx.beginPath(); ctx.arc(x+71*s, y+13*s, 1*s, 0, Math.PI*2); ctx.fill();
            // Glow
            ctx.fillStyle = 'rgba(0,200,120,0.12)';
            ctx.beginPath(); ctx.ellipse(x+40*s, y+72*s, 24*s, 7*s, 0, 0, Math.PI*2); ctx.fill();
        },
        galeimp(ctx, x, y, size) {
            const s = size / 80;
            // Body (lemur-like)
            const bg = ctx.createRadialGradient(x+40*s, y+46*s, 6*s, x+40*s, y+42*s, 22*s);
            bg.addColorStop(0,'#c8e8ff'); bg.addColorStop(0.6,'#4090b8'); bg.addColorStop(1,'#001830');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.ellipse(x+40*s, y+46*s, 18*s, 22*s, 0, 0, Math.PI*2); ctx.fill();
            // Wings
            ctx.fillStyle = 'rgba(180,240,255,0.4)';
            ctx.beginPath();
            ctx.moveTo(x+22*s, y+40*s);
            ctx.bezierCurveTo(x+5*s, y+20*s, x+12*s, y+55*s, x+28*s, y+52*s);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x+58*s, y+40*s);
            ctx.bezierCurveTo(x+75*s, y+20*s, x+68*s, y+55*s, x+52*s, y+52*s);
            ctx.closePath(); ctx.fill();
            // Tail (stripe)
            ctx.lineWidth = 5*s; ctx.lineCap = 'round';
            ctx.strokeStyle = '#fff8a0';
            ctx.beginPath(); ctx.moveTo(x+40*s, y+65*s); ctx.bezierCurveTo(x+30*s, y+78*s, x+50*s, y+80*s, x+42*s, y+75*s); ctx.stroke();
            ctx.strokeStyle = '#002040';
            ctx.beginPath(); ctx.moveTo(x+40*s, y+68*s); ctx.bezierCurveTo(x+32*s, y+78*s, x+48*s, y+80*s, x+42*s, y+76*s); ctx.stroke();
            // Head
            const hg = ctx.createRadialGradient(x+40*s, y+24*s, 4*s, x+40*s, y+26*s, 16*s);
            hg.addColorStop(0,'#d8f0ff'); hg.addColorStop(1,'#2060a0');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.ellipse(x+40*s, y+26*s, 16*s, 15*s, 0, 0, Math.PI*2); ctx.fill();
            // Ears
            ctx.fillStyle = '#3070b0';
            ctx.beginPath(); ctx.ellipse(x+28*s, y+16*s, 5*s, 9*s, -0.3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x+52*s, y+16*s, 5*s, 9*s, 0.3, 0, Math.PI*2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x+33*s, y+22*s, 5*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x+47*s, y+22*s, 5*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#0a0a20'; ctx.beginPath(); ctx.arc(x+34*s, y+22*s, 3*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#0a0a20'; ctx.beginPath(); ctx.arc(x+48*s, y+22*s, 3*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#f0e040'; ctx.beginPath(); ctx.arc(x+34*s, y+21*s, 1.2*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#f0e040'; ctx.beginPath(); ctx.arc(x+48*s, y+21*s, 1.2*s, 0, Math.PI*2); ctx.fill();
            // Spark aura
            ctx.fillStyle = 'rgba(240,224,64,0.15)';
            ctx.beginPath(); ctx.ellipse(x+40*s, y+70*s, 20*s, 6*s, 0, 0, Math.PI*2); ctx.fill();
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
        camera.x = Math.max(0, Math.min(mapW - cw, player.px + TILE_SIZE/2 - cw/2));
        camera.y = Math.max(0, Math.min(mapH - ch, player.py + TILE_SIZE/2 - ch/2));
    }

    // ── RENDER LOOP ──────────────────────────────────────────
    function startLoop() {
        function loop(time) {
            const dt = time - lastTime; lastTime = time;
            const owActive = document.getElementById('screen-overworld')?.classList.contains('active');
            if (owActive) {
                processMovement();
                updatePlayerPosition();
                updateCamera();
                render();
            }
            animFrame = requestAnimationFrame(loop);
        }
        animFrame = requestAnimationFrame(loop);
    }

    function render() {
        if (!ctx || !currentMap) return;
        const cw = canvas.width, ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        // Draw tiles from cache
        const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
        const endCol   = Math.min(MAP_COLS, startCol + Math.ceil(cw / TILE_SIZE) + 2);
        const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
        const endRow   = Math.min(MAP_ROWS, startRow + Math.ceil(ch / TILE_SIZE) + 2);

        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const tile = currentMap.tiles[row][col];
                const cached = tileCache && tileCache[tile];
                if (cached) {
                    ctx.drawImage(cached, col*TILE_SIZE, row*TILE_SIZE);
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

        if (npc.id === 'prof_maris') {
            // Professor Maris — researcher with glasses and lab coat
            // Lab coat body
            ctx.fillStyle = '#e8eaf0';
            ctx.beginPath(); ctx.roundRect(px+8*s, py+18*s, 24*s, 16*s, 2*s); ctx.fill();
            // Shirt under
            ctx.fillStyle = '#4a8ab0';
            ctx.fillRect(px+11*s, py+19*s, 18*s, 10*s);
            // Arms
            ctx.fillStyle = '#e8eaf0';
            ctx.fillRect(px+3*s, py+18*s, 7*s, 12*s);
            ctx.fillRect(px+30*s, py+18*s, 7*s, 12*s);
            // Hands
            ctx.fillStyle = '#d4a070';
            ctx.beginPath(); ctx.arc(px+6*s, py+30*s, 3.5*s, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(px+34*s, py+30*s, 3.5*s, 0, Math.PI*2); ctx.fill();
            // Legs/pants
            ctx.fillStyle = '#3a5080';
            ctx.fillRect(px+10*s, py+34*s, 9*s, 9*s);
            ctx.fillRect(px+21*s, py+34*s, 9*s, 9*s);
            // Shoes
            ctx.fillStyle = '#201810';
            ctx.beginPath(); ctx.roundRect(px+9*s, py+42*s, 11*s, 4*s, 2*s); ctx.fill();
            ctx.beginPath(); ctx.roundRect(px+20*s, py+42*s, 11*s, 4*s, 2*s); ctx.fill();
            // Head
            ctx.fillStyle = '#d4a070';
            ctx.beginPath(); ctx.ellipse(px+20*s, py+12*s, 10*s, 11*s, 0, 0, Math.PI*2); ctx.fill();
            // Hair (grey-white, side-parted)
            ctx.fillStyle = '#c0c0c0';
            ctx.beginPath(); ctx.ellipse(px+20*s, py+4*s, 10*s, 6*s, 0, Math.PI, Math.PI*2); ctx.fill();
            ctx.fillRect(px+10*s, py+4*s, 5*s, 6*s);
            // Glasses
            ctx.strokeStyle = '#404040'; ctx.lineWidth = 1.2*s;
            ctx.strokeRect(px+13*s, py+10*s, 7*s, 5*s);
            ctx.strokeRect(px+21*s, py+10*s, 7*s, 5*s);
            ctx.beginPath(); ctx.moveTo(px+20*s, py+12.5*s); ctx.lineTo(px+21*s, py+12.5*s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px+13*s, py+12*s); ctx.lineTo(px+10*s, py+11*s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px+28*s, py+12*s); ctx.lineTo(px+31*s, py+11*s); ctx.stroke();
            // Eyes behind glasses
            ctx.fillStyle = '#204060';
            ctx.beginPath(); ctx.arc(px+16.5*s, py+12.5*s, 1.5*s, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(px+24.5*s, py+12.5*s, 1.5*s, 0, Math.PI*2); ctx.fill();
            // Clipboard
            ctx.fillStyle = '#d0c070'; ctx.fillRect(px+32*s, py+20*s, 8*s, 10*s);
            ctx.fillStyle = '#404020'; ctx.fillRect(px+33*s, py+22*s, 6*s, 1.5*s);
            ctx.fillRect(px+33*s, py+25*s, 6*s, 1.5*s); ctx.fillRect(px+33*s, py+28*s, 4*s, 1.5*s);

        } else if (npc.id === 'harbor_guard') {
            // Guard — armored, stern
            // Armored body
            ctx.fillStyle = '#4a5060';
            ctx.beginPath(); ctx.roundRect(px+7*s, py+18*s, 26*s, 16*s, 2*s); ctx.fill();
            ctx.fillStyle = '#606878';
            ctx.fillRect(px+9*s, py+20*s, 22*s, 6*s);
            // Pauldrons
            ctx.fillStyle = '#505868';
            ctx.beginPath(); ctx.arc(px+7*s, py+20*s, 5*s, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(px+33*s, py+20*s, 5*s, 0, Math.PI*2); ctx.fill();
            // Arms
            ctx.fillStyle = '#4a5060';
            ctx.fillRect(px+2*s, py+18*s, 7*s, 14*s);
            ctx.fillRect(px+31*s, py+18*s, 7*s, 14*s);
            // Legs
            ctx.fillStyle = '#383840';
            ctx.fillRect(px+9*s, py+34*s, 10*s, 10*s);
            ctx.fillRect(px+21*s, py+34*s, 10*s, 10*s);
            ctx.fillStyle = '#201818';
            ctx.beginPath(); ctx.roundRect(px+8*s, py+43*s, 12*s, 4*s, 2*s); ctx.fill();
            ctx.beginPath(); ctx.roundRect(px+20*s, py+43*s, 12*s, 4*s, 2*s); ctx.fill();
            // Head with helmet
            ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.ellipse(px+20*s, py+13*s, 9*s, 9*s, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#505868';
            ctx.beginPath(); ctx.ellipse(px+20*s, py+8*s, 11*s, 9*s, 0, Math.PI, Math.PI*2); ctx.fill();
            ctx.fillRect(px+10*s, py+8*s, 20*s, 4*s);
            // Visor line
            ctx.strokeStyle = '#808898'; ctx.lineWidth = 1.5*s;
            ctx.beginPath(); ctx.moveTo(px+11*s, py+14*s); ctx.lineTo(px+29*s, py+14*s); ctx.stroke();
            // Eyes
            ctx.fillStyle = '#201810'; ctx.beginPath(); ctx.arc(px+16*s, py+14*s, 2*s, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(px+24*s, py+14*s, 2*s, 0, Math.PI*2); ctx.fill();
            // Spear
            ctx.strokeStyle = '#8a7050'; ctx.lineWidth = 2.5*s;
            ctx.beginPath(); ctx.moveTo(px+36*s, py+2*s); ctx.lineTo(px+36*s, py+46*s); ctx.stroke();
            ctx.fillStyle = '#a0b8d0'; ctx.beginPath();
            ctx.moveTo(px+34*s, py+2*s); ctx.lineTo(px+36*s, py+8*s); ctx.lineTo(px+38*s, py+2*s); ctx.closePath(); ctx.fill();

        } else {
            // Elder Sota — robed elder
            // Robe
            ctx.fillStyle = '#7a5a30';
            ctx.beginPath(); ctx.moveTo(px+10*s, py+20*s); ctx.lineTo(px+6*s, py+46*s);
            ctx.lineTo(px+34*s, py+46*s); ctx.lineTo(px+30*s, py+20*s); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#9a7a50';
            ctx.fillRect(px+12*s, py+20*s, 16*s, 10*s);
            // Arms
            ctx.fillStyle = '#7a5a30';
            ctx.fillRect(px+3*s, py+20*s, 8*s, 12*s);
            ctx.fillRect(px+29*s, py+20*s, 8*s, 12*s);
            ctx.fillStyle = '#c89060';
            ctx.beginPath(); ctx.arc(px+7*s, py+32*s, 3.5*s, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(px+33*s, py+32*s, 3.5*s, 0, Math.PI*2); ctx.fill();
            // Head
            ctx.fillStyle = '#c89060'; ctx.beginPath(); ctx.ellipse(px+20*s, py+12*s, 9*s, 10*s, 0, 0, Math.PI*2); ctx.fill();
            // White hair + beard
            ctx.fillStyle = '#e8e0d0';
            ctx.beginPath(); ctx.ellipse(px+20*s, py+5*s, 9*s, 5*s, 0, Math.PI, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(px+14*s, py+16*s); ctx.lineTo(px+12*s, py+26*s);
            ctx.lineTo(px+20*s, py+22*s); ctx.lineTo(px+28*s, py+26*s); ctx.lineTo(px+26*s, py+16*s); ctx.closePath(); ctx.fill();
            // Eyes
            ctx.fillStyle = '#402000'; ctx.beginPath(); ctx.arc(px+16*s, py+12*s, 2*s, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(px+24*s, py+12*s, 2*s, 0, Math.PI*2); ctx.fill();
            // Staff
            ctx.strokeStyle = '#604020'; ctx.lineWidth = 3*s;
            ctx.beginPath(); ctx.moveTo(px+34*s, py+0); ctx.lineTo(px+34*s, py+46*s); ctx.stroke();
            ctx.fillStyle = '#2ab5c7'; ctx.beginPath(); ctx.arc(px+34*s, py+3*s, 4*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'rgba(42,181,199,0.3)'; ctx.beginPath(); ctx.arc(px+34*s, py+3*s, 7*s, 0, Math.PI*2); ctx.fill();
        }

        // Name tag
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(px, py-16, TILE_SIZE, 14);
        ctx.fillStyle = '#e8b84b';
        ctx.font = `bold ${7*s}px "Cinzel", serif`;
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

        // Leg animation offsets for 4-frame walk cycle
        const leftLegY  = moving ? [0, -3, 0,  3][frame] : 0;
        const rightLegY = moving ? [0,  3, 0, -3][frame] : 0;
        const bobY      = moving ? [0, -2, 0, -1][frame] * s : 0;
        const armSwingL = moving ? [0,  4, 0, -4][frame] : 0;
        const armSwingR = moving ? [0, -4, 0,  4][frame] : 0;

        // Shoes
        ctx.fillStyle = '#201010';
        ctx.beginPath(); ctx.roundRect(px+9*s, py+40*s+leftLegY*s+bobY, 10*s, 5*s, 2*s); ctx.fill();
        ctx.beginPath(); ctx.roundRect(px+21*s, py+40*s+rightLegY*s+bobY, 10*s, 5*s, 2*s); ctx.fill();

        // Legs
        ctx.fillStyle = '#2a3a6a';
        ctx.fillRect(px+10*s, py+30*s+bobY, 8*s, 12*s + leftLegY*s);
        ctx.fillRect(px+22*s, py+30*s+bobY, 8*s, 12*s + rightLegY*s);

        // Body / shirt
        const bodyG = ctx.createLinearGradient(px+8*s, py+18*s, px+32*s, py+32*s);
        bodyG.addColorStop(0,'#2a7a50'); bodyG.addColorStop(1,'#184a30');
        ctx.fillStyle = bodyG;
        ctx.beginPath(); ctx.roundRect(px+8*s, py+18*s+bobY, 24*s, 14*s, 3*s); ctx.fill();

        // Arms
        ctx.fillStyle = '#2a7a50';
        ctx.fillRect(px+1*s, py+19*s+bobY+armSwingL*s, 8*s, 12*s);
        ctx.fillRect(px+31*s, py+19*s+bobY+armSwingR*s, 8*s, 12*s);
        // Hands
        ctx.fillStyle = '#d4a070';
        ctx.beginPath(); ctx.arc(px+5*s, py+31*s+bobY+armSwingL*s, 3.5*s, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(px+35*s, py+31*s+bobY+armSwingR*s, 3.5*s, 0, Math.PI*2); ctx.fill();

        // Neck
        ctx.fillStyle = '#d4a070'; ctx.fillRect(px+16*s, py+14*s+bobY, 8*s, 6*s);

        // Head
        const headG = ctx.createRadialGradient(px+20*s, py+9*s, 2*s, px+20*s, py+11*s, 11*s);
        headG.addColorStop(0,'#e8c880'); headG.addColorStop(1,'#c89050');
        ctx.fillStyle = headG;
        ctx.beginPath(); ctx.ellipse(px+20*s, py+11*s+bobY, 11*s, 11*s, 0, 0, Math.PI*2); ctx.fill();

        // Hair
        ctx.fillStyle = '#302010';
        ctx.beginPath(); ctx.ellipse(px+20*s, py+3*s+bobY, 11*s, 6*s, 0, Math.PI, Math.PI*2); ctx.fill();
        ctx.fillRect(px+9*s, py+3*s+bobY, 5*s, 8*s);

        // Face (direction-based)
        ctx.fillStyle = '#1a0800';
        if (facing === 'down' || facing === 'up') {
            const eyeY = facing === 'down' ? py+10*s+bobY : py+10*s+bobY;
            ctx.beginPath(); ctx.arc(px+15*s, eyeY, 2.5*s, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(px+25*s, eyeY, 2.5*s, 0, Math.PI*2); ctx.fill();
            if (facing === 'down') {
                ctx.fillStyle = '#c07050';
                ctx.beginPath(); ctx.arc(px+20*s, py+14*s+bobY, 2*s, 0, Math.PI); ctx.fill();
            }
        } else {
            // Side profile
            const eyeX = facing === 'right' ? px+24*s : px+16*s;
            ctx.beginPath(); ctx.arc(eyeX, py+10*s+bobY, 2.5*s, 0, Math.PI*2); ctx.fill();
        }

        // Backpack
        ctx.fillStyle = '#8b5a20';
        ctx.beginPath(); ctx.roundRect(px+9*s, py+18*s+bobY, 7*s, 12*s, 2*s); ctx.fill();
        ctx.fillStyle = '#a07030';
        ctx.fillRect(px+10*s, py+20*s+bobY, 5*s, 2*s);
        ctx.fillRect(px+10*s, py+24*s+bobY, 5*s, 2*s);
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
