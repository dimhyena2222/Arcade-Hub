// ============================================================
//  TIDEBREAK: Legacy of the Storms — OVERWORLD.JS
//  Canvas tile map, player movement, NPCs, encounters, weather
// ============================================================

'use strict';

const OverworldEngine = (() => {

    // ── CONSTANTS ─────────────────────────────────────────────
    const TILE_SIZE   = 40;
    const MAP_COLS    = 16;
    const MAP_ROWS    = 12;
    const PLAYER_SPEED = 1;     // tiles per keydown
    const ENCOUNTER_RATE = 0.12; // 12% chance per step on grass/shore tiles

    // ── TILE TYPES ───────────────────────────────────────────
    const T = {
        WATER:  0,
        SAND:   1,
        GRASS:  2,
        PATH:   3,
        WALL:   4,
        SHORE:  5,  // encounter zone near water
        HOUSE:  6,
        DOCK:   7,
        NPC:    8,  // overwritten with NPC id during render
    };

    // ── BRINEFALL VILLAGE MAP ────────────────────────────────
    // 16 cols × 12 rows  (0=water, 1=sand, 2=grass, 3=path, 4=wall, 5=shore, 6=house, 7=dock)
    const MAPS = {
        brinefall: {
            tiles: [
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0],
                [0,5,1,1,3,3,3,3,3,1,1,1,1,5,5,0],
                [0,5,1,6,3,1,1,1,3,1,6,1,1,5,0,0],
                [0,5,1,1,3,1,1,1,3,1,1,1,1,5,0,0],
                [0,5,1,6,3,3,3,3,3,3,3,1,6,5,0,0],
                [0,5,1,1,2,2,2,2,2,2,3,1,1,5,0,0],
                [0,5,1,1,2,2,2,2,2,2,3,1,1,5,0,0],
                [0,5,1,1,1,1,1,1,1,1,3,1,1,5,0,0],
                [0,5,5,5,5,5,5,5,5,5,7,5,5,5,0,0],
                [0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            ],
            encounterZones: [T.GRASS, T.SHORE],
            playerStart: { x: 7, y: 6 },
            npcs: [
                { id: 'prof_maris',   tile: { x: 7, y: 4  } },
                { id: 'harbor_guard', tile: { x: 10, y: 8 } },
                { id: 'elder_sota',   tile: { x: 3, y: 5  } },
            ],
            encounterTable: 'brinefall_shore',
            ambientWeather: ['CLEAR', 'RAIN'],
        },
    };

    // ── TILE COLORS ──────────────────────────────────────────
    const TILE_COLORS = {
        [T.WATER]:  '#0d2a3b',
        [T.SAND]:   '#c8a96a',
        [T.GRASS]:  '#2d6b3e',
        [T.PATH]:   '#9e8060',
        [T.WALL]:   '#3a3030',
        [T.SHORE]:  '#1a4d6b',
        [T.HOUSE]:  '#5a3520',
        [T.DOCK]:   '#6b4a2a',
    };

    // ── STATE ────────────────────────────────────────────────
    let canvas, ctx;
    let currentMap = null;
    let player = { x: 7, y: 6, moving: false, facing: 'down', stepAnim: 0 };
    let keys = {};
    let dialogueQueue = [];
    let inDialogue = false;
    let currentNpcId = null;
    let stepCount = 0;
    let animFrame = null;

    // Weather state
    let weatherTimer = 0;
    const WEATHER_DURATION = 300; // seconds before possible change

    // ── INIT ─────────────────────────────────────────────────
    function init() {
        canvas = document.getElementById('overworld-canvas');
        if (!canvas) return;

        canvas.width  = MAP_COLS * TILE_SIZE;
        canvas.height = MAP_ROWS * TILE_SIZE;
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

        document.getElementById('hud-location').textContent =
            REGIONS[mapId]?.name || mapId;

        scheduleWeatherCycle();
    }

    // ── INPUT ────────────────────────────────────────────────
    function bindInput() {
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', e => { keys[e.key] = false; });

        // Action menu toggle on Escape or M
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
                toggleActionMenu();
            }
            if ((e.key === 'z' || e.key === 'Z') && inDialogue) {
                advanceDialogue();
            }
        });

        // Allow clicking dialogue to advance
        const dlgBox = document.getElementById('overworld-dlg');
        if (dlgBox) dlgBox.addEventListener('click', () => {
            if (inDialogue) advanceDialogue();
        });
    }

    function onKeyDown(e) {
        if (inDialogue) {
            if (e.key === 'z' || e.key === 'Z') advanceDialogue();
            return;
        }
        if (document.getElementById('screen-overworld')?.classList.contains('active') === false) return;

        const actionMenuVisible = document.getElementById('action-menu')?.classList.contains('hidden') === false;
        if (actionMenuVisible && (e.key === 'Escape' || e.key === 'm' || e.key === 'M')) {
            toggleActionMenu();
            return;
        }
        if (actionMenuVisible) return;

        let dx = 0, dy = 0;
        switch(e.key) {
            case 'ArrowUp':    case 'w': case 'W': dy = -1; player.facing = 'up';    break;
            case 'ArrowDown':  case 's': case 'S': dy =  1; player.facing = 'down';  break;
            case 'ArrowLeft':  case 'a': case 'A': dx = -1; player.facing = 'left';  break;
            case 'ArrowRight': case 'd': case 'D': dx =  1; player.facing = 'right'; break;
            case 'z': case 'Z': case 'Enter': checkInteract(); return;
            default: return;
        }
        e.preventDefault();
        tryMove(dx, dy);
    }

    // ── MOVEMENT ─────────────────────────────────────────────
    function tryMove(dx, dy) {
        if (player.moving) return;

        const nx = player.x + dx;
        const ny = player.y + dy;

        if (nx < 0 || ny < 0 || nx >= MAP_COLS || ny >= MAP_ROWS) return;

        const tile = currentMap.tiles[ny][nx];
        if (tile === T.WALL || tile === T.HOUSE || tile === T.WATER) return;

        // Check NPC collision
        const npcAtTile = currentMap.npcs.find(n => n.tile.x === nx && n.tile.y === ny);
        if (npcAtTile) {
            startNpcDialogue(npcAtTile.id);
            return;
        }

        player.x = nx;
        player.y = ny;
        player.stepAnim = (player.stepAnim + 1) % 4;
        stepCount++;

        // Random encounter check
        if (currentMap.encounterZones.includes(tile)) {
            if (Math.random() < ENCOUNTER_RATE) {
                triggerWildEncounter();
                return;
            }
        }
    }

    // ── ENCOUNTERS ───────────────────────────────────────────
    function triggerWildEncounter() {
        const wild = createWildEncounter(currentMap.encounterTable);
        if (!wild) return;

        if (!Game.state.party.length) return;

        const lead = Game.state.party[0];
        BattleEngine.startBattle(lead, wild, {
            weather: Game.state.weather,
            wildBattle: true,
            canRun: true,
            onBattleEnd(result) {
                if (result === 'lose') {
                    Game.notify('Your companion fainted... Returning to Brinefall.', 'warning');
                    // Restore lead to 1 VIT for basic functionality
                    lead.stats.vit = Math.max(1, Math.floor(lead.stats.maxVit * 0.1));
                    Game.updatePartyStrip();
                }
            },
        });
    }

    // ── NPC INTERACTION ──────────────────────────────────────
    function checkInteract() {
        const facing = player.facing;
        let tx = player.x, ty = player.y;
        if (facing === 'up')    ty--;
        if (facing === 'down')  ty++;
        if (facing === 'left')  tx--;
        if (facing === 'right') tx++;

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
        const dlgBox   = document.getElementById('overworld-dlg');
        const spkEl    = document.getElementById('ow-dlg-speaker');
        const txtEl    = document.getElementById('ow-dlg-text');

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
            const dlgBox = document.getElementById('overworld-dlg');
            if (dlgBox) dlgBox.classList.add('hidden');
        }
    }

    // ── ACTION MENU ──────────────────────────────────────────
    function toggleActionMenu() {
        const menu = document.getElementById('action-menu');
        if (!menu) return;
        menu.classList.toggle('hidden');
    }

    // ── WEATHER CYCLE ────────────────────────────────────────
    function scheduleWeatherCycle() {
        clearTimeout(weatherTimer);
        const delay = (180 + Math.random() * 240) * 1000; // 3-7 min
        weatherTimer = setTimeout(() => {
            if (!currentMap) return;
            const options = currentMap.ambientWeather;
            const newWeather = options[Math.floor(Math.random() * options.length)];
            if (newWeather !== Game.state.weather) {
                Game.setWeather(newWeather);
            }
            scheduleWeatherCycle();
        }, delay);
    }

    // ── RENDER LOOP ──────────────────────────────────────────
    function startLoop() {
        function loop() {
            if (document.getElementById('screen-overworld')?.classList.contains('active')) {
                render();
            }
            animFrame = requestAnimationFrame(loop);
        }
        animFrame = requestAnimationFrame(loop);
    }

    function render() {
        if (!ctx || !currentMap) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw tiles
        for (let row = 0; row < MAP_ROWS; row++) {
            for (let col = 0; col < MAP_COLS; col++) {
                const tile = currentMap.tiles[row][col];
                ctx.fillStyle = TILE_COLORS[tile] || '#111';
                ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Grid lines (subtle)
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                // Grass detail
                if (tile === T.GRASS) {
                    ctx.fillStyle = 'rgba(255,255,255,0.06)';
                    ctx.fillRect(col * TILE_SIZE + 4, row * TILE_SIZE + 4, 6, 6);
                    ctx.fillRect(col * TILE_SIZE + 24, row * TILE_SIZE + 20, 4, 8);
                }
            }
        }

        // Draw NPCs
        currentMap.npcs.forEach(npc => {
            const npcDef = NPCS[npc.id];
            if (!npcDef) return;
            const px = npc.tile.x * TILE_SIZE;
            const py = npc.tile.y * TILE_SIZE;
            // Body
            ctx.fillStyle = '#f0d090';
            ctx.fillRect(px + 12, py + 4, 16, 16);    // head
            ctx.fillStyle = '#3a7fc1';
            ctx.fillRect(px + 10, py + 20, 20, 14);   // body
            ctx.fillStyle = '#c8a060';
            ctx.fillRect(px + 4, py + 20, 8, 12);     // left arm
            ctx.fillRect(px + 28, py + 20, 8, 12);    // right arm
            ctx.fillStyle = '#333';
            ctx.fillRect(px + 10, py + 34, 8, 6);     // left leg
            ctx.fillRect(px + 22, py + 34, 8, 6);     // right leg

            // Name tag
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(px, py - 14, 40, 12);
            ctx.fillStyle = '#fff';
            ctx.font = '8px Cinzel, serif';
            ctx.textAlign = 'center';
            ctx.fillText(npcDef.name.split(' ')[0].substring(0, 8), px + TILE_SIZE / 2, py - 4);
        });

        // Draw player
        drawPlayer();
    }

    function drawPlayer() {
        const px = player.x * TILE_SIZE;
        const py = player.y * TILE_SIZE;

        const legOffset = (player.stepAnim === 1 || player.stepAnim === 3) ? 2 : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(px + TILE_SIZE/2, py + TILE_SIZE - 4, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#e8c87a';  // skin
        ctx.fillRect(px + 13, py + 6, 14, 14);   // head

        ctx.fillStyle = '#1a6e4a';  // shirt
        ctx.fillRect(px + 10, py + 20, 20, 12);  // torso

        ctx.fillStyle = '#333';     // pants
        ctx.fillRect(px + 10, py + 32, 8, 6 + legOffset);     // left leg
        ctx.fillRect(px + 22, py + 32, 8, 6 + (legOffset > 0 ? 0 : 2)); // right leg

        // Eyes (direction-based)
        ctx.fillStyle = '#222';
        if (player.facing === 'down' || player.facing === 'up') {
            ctx.fillRect(px + 16, py + 12, 3, 3);
            ctx.fillRect(px + 21, py + 12, 3, 3);
        }
    }

    // ── PUBLIC ───────────────────────────────────────────────
    return {
        init,
        loadMap,
        toggleActionMenu,

        pauseLoop() {
            if (animFrame) {
                cancelAnimationFrame(animFrame);
                animFrame = null;
            }
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
