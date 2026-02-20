// ============================================================
//  TIDEBREAK: Legacy of the Storms — GAME.JS
//  Master controller: screens, state, options, notify, sound
// ============================================================

'use strict';

const Game = (() => {

    // ── INITIAL STATE ────────────────────────────────────────
    const DEFAULT_STATE = () => ({
        started: false,
        currentScreen: 'screen-title',
        previousScreen: null,

        // Player
        playerName: 'Warden',
        playerGender: 'male',  // 'male' | 'female'

        // Party (array of live creature instances, max 6)
        party: [],

        // Codex (set of seen creature def IDs)
        codex: new Set(),

        // Inventory
        items: {
            tide_orb:    2,
            reef_salve:  0,
            storm_draft: 0,
        },

        // World
        currentRegion: 'brinefall',
        weather: 'CLEAR',
        unlockedRegions: new Set(['brinefall']),

        // Options
        options: {
            sound:     true,
            encounter: 'normal',   // 'low' | 'normal' | 'high'
            speed:     'normal',   // 'slow' | 'normal' | 'fast'
            textspeed: 'normal',   // 'slow' | 'normal' | 'fast'
            weather:   true,
        },

        // Story flags
        flags: {
            introComplete: false,
            starterChosen: false,
            ch1_guardTalked: false,
            ch1_marisQuestStarted: false,
            mission_tide_shard_recovery: false,
        },

        // Quest progress
        quests: {
            tide_shard_recovery: {
                active: false,
                shardsFound: 0,
                shardsRequired: 3,
                complete: false,
            },
        },

        // PC Storage (creature boxes)
        pc: [],   // array of creature instances stored in the PC

        // Player stats (tracking)
        stats: {
            stepsWalked:     0,
            creaturesCaught: 0,
            battlesWon:      0,
            battlesLost:     0,
            blackouts:       0,
        },

        // Dialogue state
        introIndex: 0,
    });

    let state = DEFAULT_STATE();
    let _audioCtx = null;

    // ── WEB AUDIO SOUND EFFECTS ──────────────────────────────
    function getAudioCtx() {
        if (!_audioCtx) {
            _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return _audioCtx;
    }

    function playSound(type) {
        if (!state.options.sound) return;
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);

            const now = ctx.currentTime;
            switch(type) {
                case 'select':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(880, now);
                    osc.frequency.setValueAtTime(1100, now + 0.06);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                    osc.start(now); osc.stop(now + 0.14);
                    break;
                case 'back':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.setValueAtTime(400, now + 0.07);
                    gain.gain.setValueAtTime(0.07, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                    osc.start(now); osc.stop(now + 0.18);
                    break;
                case 'encounter': {
                    // Three rising notes
                    const freqs = [440, 660, 880];
                    freqs.forEach((f, i) => {
                        const o2 = ctx.createOscillator();
                        const g2 = ctx.createGain();
                        o2.connect(g2); g2.connect(ctx.destination);
                        o2.type = 'square';
                        const t = now + i * 0.09;
                        o2.frequency.setValueAtTime(f, t);
                        g2.gain.setValueAtTime(0.09, t);
                        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                        o2.start(t); o2.stop(t + 0.12);
                    });
                    return;
                }
                case 'levelup': {
                    const notes = [523, 659, 784, 1047];
                    notes.forEach((f, i) => {
                        const o2 = ctx.createOscillator();
                        const g2 = ctx.createGain();
                        o2.connect(g2); g2.connect(ctx.destination);
                        o2.type = 'triangle';
                        const t = now + i * 0.1;
                        o2.frequency.setValueAtTime(f, t);
                        g2.gain.setValueAtTime(0.1, t);
                        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                        o2.start(t); o2.stop(t + 0.2);
                    });
                    return;
                }
                case 'capture': {
                    // Wobble down then ping
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                    osc.start(now); osc.stop(now + 0.45);
                    const o2 = ctx.createOscillator();
                    const g2 = ctx.createGain();
                    o2.connect(g2); g2.connect(ctx.destination);
                    o2.type = 'sine';
                    o2.frequency.setValueAtTime(1200, now + 0.5);
                    g2.gain.setValueAtTime(0.12, now + 0.5);
                    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
                    o2.start(now + 0.5); o2.stop(now + 0.75);
                    return;
                }
                default:
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    gain.gain.setValueAtTime(0.05, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                    osc.start(now); osc.stop(now + 0.1);
            }
        } catch(e) { /* AudioContext unavailable */ }
    }

    // ── SCREEN MANAGEMENT ────────────────────────────────────
    function showScreen(id) {
        const overlay = document.getElementById('screen-transition');
        const doSwitch = () => {
            const all = document.querySelectorAll('.screen');
            all.forEach(s => s.classList.remove('active'));
            const target = document.getElementById(id);
            if (target) {
                target.classList.add('active');
                state.previousScreen = state.currentScreen;
                state.currentScreen = id;
            }
            if (id === 'screen-overworld') {
                OverworldEngine.resumeLoop();
                updatePartyStrip();
            } else {
                OverworldEngine.pauseLoop();
            }
        };

        if (overlay) {
            overlay.classList.add('fading-in');
            setTimeout(() => {
                doSwitch();
                overlay.classList.remove('fading-in');
                overlay.classList.add('fading-out');
                setTimeout(() => overlay.classList.remove('fading-out'), 260);
            }, 220);
        } else {
            doSwitch();
        }
    }

    function closeOverlay() {
        playSound('back');
        if (state.previousScreen && state.previousScreen !== state.currentScreen) {
            showScreen(state.previousScreen);
        } else {
            showScreen('screen-overworld');
        }
    }

    // ── ESCAPE MENU ──────────────────────────────────────────
    function closeEscapeMenu() {
        playSound('back');
        const menu = document.getElementById('action-menu');
        if (!menu) return;
        menu.classList.remove('menu-open');
        setTimeout(() => menu.classList.add('hidden'), 180);
    }

    // ── OPTIONS ──────────────────────────────────────────────
    function toggleOption(key) {
        playSound('select');
        state.options[key] = !state.options[key];
        _renderOptionsScreen();
    }

    function cycleOption(key) {
        playSound('select');
        const cycles = {
            encounter: ['low', 'normal', 'high'],
            speed:     ['slow', 'normal', 'fast'],
            textspeed: ['slow', 'normal', 'fast'],
        };
        const opts = cycles[key];
        if (!opts) return;
        const idx = opts.indexOf(state.options[key]);
        state.options[key] = opts[(idx + 1) % opts.length];
        _renderOptionsScreen();
    }

    function _renderOptionsScreen() {
        const o = state.options;
        const soundBtn = document.getElementById('opt-sound');
        const encBtn   = document.getElementById('opt-encounter');
        const spdBtn   = document.getElementById('opt-speed');
        const txtBtn   = document.getElementById('opt-textspeed');
        const wxBtn    = document.getElementById('opt-weather');

        if (soundBtn) {
            soundBtn.textContent = o.sound ? 'ON' : 'OFF';
            soundBtn.className = 'option-toggle ' + (o.sound ? 'opt-on' : 'opt-off');
        }
        if (encBtn) {
            encBtn.textContent = o.encounter.toUpperCase();
        }
        if (spdBtn) {
            spdBtn.textContent = o.speed.toUpperCase();
        }
        if (txtBtn) {
            txtBtn.textContent = o.textspeed.toUpperCase();
        }
        if (wxBtn) {
            wxBtn.textContent = o.weather ? 'ON' : 'OFF';
            wxBtn.className = 'option-toggle ' + (o.weather ? 'opt-on' : 'opt-off');
        }
    }

    // ── NEW GAME ─────────────────────────────────────────────
    function startNewGame() {
        playSound('select');
        state = DEFAULT_STATE();
        state.introIndex = 0;
        showScreen('screen-intro');
        setTimeout(runIntroDialogue, 260);
    }

    // ── PROF MARIS CANVAS RENDER ─────────────────────────────
    let _marisMouthOpen = false;
    let _marisAnimId = null;

    function _drawMarisCanvas(mouthOpen) {
        const canvas = document.getElementById('intro-maris-canvas');
        if (!canvas) return;
        const cx = canvas.getContext('2d');
        cx.clearRect(0, 0, 160, 280);

        // All coordinates on a 160×280 pixel canvas — pixelated blocky style
        const P = (x, y, w, h, color) => { cx.fillStyle = color; cx.fillRect(x, y, w, h); };

        // ── Legs (dark slacks) ──
        P(44, 200, 28, 60, '#2a3060'); // left leg
        P(88, 200, 28, 60, '#2a3060'); // right leg
        P(40, 248, 34,  8, '#1a1830'); // shoes
        P(86, 248, 34,  8, '#1a1830');

        // ── Lab coat body (white) ──
        P(28, 120, 104, 88, '#e8eaf0');
        // ── Coat shading sides ──
        P(28, 120, 10, 88, '#c8cad0');
        P(122, 120, 10, 88, '#c8cad0');
        // ── Shirt underneath (light blue) ──
        P(50, 128, 60, 56, '#5a9ac8');
        // ── Coat lapels ──
        P(50, 120, 12, 36, '#d0d2d8');
        P(98, 120, 12, 36, '#d0d2d8');

        // ── Arms / coat sleeves ──
        P(8,  124, 24, 68, '#e8eaf0'); // left sleeve
        P(128, 124, 24, 68, '#e8eaf0'); // right sleeve
        P(8,  124, 6,  68, '#c8cad0'); // shading
        P(146, 124, 6,  68, '#c8cad0');
        // ── Hands (skin) ──
        P(8,   188, 20, 16, '#d4a870');
        P(132,  188, 20, 16, '#d4a870');

        // ── Neck ──
        P(68, 104, 24, 20, '#d4a870');

        // ── Head (skin tone) ──
        P(40,  32, 80, 76, '#d4a870');
        // ── Head shading ──
        P(40,  32,  8, 76, '#b88a50');
        P(112,  32,  8, 76, '#b88a50');

        // ── Hair (grey, side-parted pixel style) ──
        P(40,  16, 80, 24, '#b0b0b0');  // top
        P(40,  16,  8, 40, '#909090');  // left side
        P(112, 16,  8, 32, '#909090');  // right side

        // ── Glasses frame ──
        P(48, 64, 22, 4, '#303030'); // left frame top
        P(48, 80, 22, 4, '#303030'); // left frame bot
        P(48, 64,  4, 20, '#303030'); // left outer
        P(66, 64,  4, 20, '#303030'); // left inner
        P(90, 64, 22, 4, '#303030'); // right frame top
        P(90, 80, 22, 4, '#303030'); // right frame bot
        P(90, 64,  4, 20, '#303030'); // right outer
        P(108,64,  4, 20, '#303030'); // right inner
        P(70, 68, 20, 4, '#303030');  // bridge

        // ── Eyes (behind glasses) ──
        P(52, 68, 10, 8, '#fafafa'); // left white
        P(94, 68, 10, 8, '#fafafa'); // right white
        P(56, 70,  6, 4, '#203860'); // left iris
        P(98, 70,  6, 4, '#203860'); // right iris
        P(58, 71,  2, 2, '#000');    // left pupil
        P(100,71,  2, 2, '#000');    // right pupil

        // ── Eyebrows ──
        P(50, 58, 18, 4, '#888');
        P(92, 58, 18, 4, '#888');

        // ── Nose ──
        P(74, 78,  8, 8, '#b88a50');
        P(70, 84,  4, 4, '#b88a50');
        P(86, 84,  4, 4, '#b88a50');

        // ── Mouth (choppy open/closed) ──
        if (mouthOpen) {
            P(64, 96, 32, 10, '#1a0800'); // open mouth
            P(66, 98, 28,  4, '#c87060'); // tongue/gum
        } else {
            P(64, 97, 32,  5, '#1a0800'); // closed line
        }

        // ── Clipboard in right hand ──
        P(128, 148, 32, 44, '#ddc86a'); // clipboard board
        P(144, 142,  8,  8, '#888');    // clip
        P(132, 156, 24,  4, '#555');    // line 1
        P(132, 164, 24,  4, '#555');    // line 2
        P(132, 172, 18,  4, '#555');    // line 3
    }

    function _startMarisAnimation() {
        _stopMarisAnimation();
        let t = 0;
        function tick() {
            t++;
            // Toggle mouth every ~10 frames (~170ms) for choppy look
            if (t % 6 === 0) {
                _marisMouthOpen = !_marisMouthOpen;
                _drawMarisCanvas(_marisMouthOpen);
            }
            _marisAnimId = requestAnimationFrame(tick);
        }
        _marisAnimId = requestAnimationFrame(tick);
    }

    function _stopMarisAnimation() {
        if (_marisAnimId) { cancelAnimationFrame(_marisAnimId); _marisAnimId = null; }
        _marisMouthOpen = false;
        _drawMarisCanvas(false);
    }

    // ── INTRO DIALOGUE RUNNER ────────────────────────────────
    function runIntroDialogue() {
        const line = INTRO_DIALOGUE[state.introIndex];
        if (!line) {
            _stopMarisAnimation();
            showScreen('screen-starter');
            return;
        }

        const speakerEl = document.getElementById('dlg-speaker');
        const textEl    = document.getElementById('dlg-text');
        const bgEl      = document.getElementById('scene-bg');
        const arrowEl   = document.getElementById('dlg-arrow');

        if (speakerEl) speakerEl.textContent = line.speaker || '';
        if (textEl)    textEl.textContent    = line.text || '';
        if (bgEl)      bgEl.className        = 'scene-bg bg-' + (line.bg || 'lab');

        // Draw Maris and start mouth animation
        _drawMarisCanvas(false);
        _startMarisAnimation();

        // Show/hide gender select
        const genderOverlay = document.getElementById('gender-select-overlay');
        const dlgBox = document.getElementById('poke-dlg-box');
        if (line.genderSelect) {
            if (genderOverlay) genderOverlay.classList.remove('hidden');
            if (arrowEl) arrowEl.style.display = 'none';
            // Don't hook click advance on this step
            const scene = document.getElementById('intro-scene');
            if (scene) scene.onclick = null;
        } else {
            if (genderOverlay) genderOverlay.classList.add('hidden');
            if (arrowEl) arrowEl.style.display = '';
            const scene = document.getElementById('intro-scene');
            if (scene) {
                scene.onclick = null;
                scene.onclick = advanceIntro;
            }
        }
    }

    function advanceIntro() {
        playSound('select');
        // Check if the current line grants a mission before advancing
        const currentLine = INTRO_DIALOGUE[state.introIndex];
        if (currentLine && currentLine.missionGrant) {
            state.flags['mission_' + currentLine.missionGrant] = true;
            if (state.quests[currentLine.missionGrant]) {
                state.quests[currentLine.missionGrant].active = true;
            }
        }
        state.introIndex++;
        const line = INTRO_DIALOGUE[state.introIndex];
        if (!line || line.transition === 'starter') {
            state.flags.introComplete = true;
            _stopMarisAnimation();
            showScreen('screen-starter');
            return;
        }
        runIntroDialogue();
    }

    function selectGender(gender) {
        playSound('select');
        state.playerGender = gender;
        const overlay = document.getElementById('gender-select-overlay');
        if (overlay) overlay.classList.add('hidden');
        // Advance past the gender select line
        state.introIndex++;
        runIntroDialogue();
    }

    // ── STARTER SELECTION ────────────────────────────────────
    function selectStarter(id) {
        if (state.flags.starterChosen) return;
        if (!CREATURE_DEFS[id]) return;
        playSound('select');

        const creature = createCreatureInstance(id, 5);
        state.party.push(creature);
        state.flags.starterChosen = true;

        document.querySelectorAll('.starter-card').forEach(c => c.classList.remove('chosen'));
        const card = document.getElementById('sc-' + id);
        if (card) card.classList.add('chosen');

        notify(`${creature.name} has chosen to join you.`, 'success');

        state.items.tide_orb    = (state.items.tide_orb    || 0) + 5;
        state.items.reef_salve  = (state.items.reef_salve  || 0) + 2;
        state.items.storm_draft = (state.items.storm_draft || 0) + 1;
        state.codex.add(id);

        setTimeout(() => {
            showScreen('screen-overworld');
            OverworldEngine.init();
            updatePartyStrip();
        }, 1200);
    }

    // ── OPEN MENU OVERLAYS ────────────────────────────────────
    function openMenu(type) {
        playSound('select');
        // Close escape menu if open
        const esc = document.getElementById('action-menu');
        if (esc && esc.classList.contains('menu-open')) {
            esc.classList.remove('menu-open');
            esc.classList.add('hidden');
        }

        switch (type) {
            case 'team':
                renderTeamScreen();
                showScreen('screen-team');
                break;
            case 'codex':
                renderCodexScreen();
                showScreen('screen-codex');
                break;
            case 'map':
                renderMapScreen();
                showScreen('screen-map');
                break;
            case 'options':
                _renderOptionsScreen();
                showScreen('screen-options');
                break;
            case 'switch-battle':
                showBattleSwitchPanel(false);
                break;
            default:
                break;
        }
    }

    // ── CREATURE DETAIL SCREEN ───────────────────────────────
    function showCreatureDetail(creature) {
        if (!creature) return;
        playSound('select');

        const container = document.getElementById('creature-detail-body');
        if (!container) return;

        const def = CREATURE_DEFS[creature.defId] || {};
        const vPct = Math.round((creature.stats.vit / creature.stats.maxVit) * 100);
        const aPct = Math.round((creature.stats.aet / creature.stats.maxAet) * 100);
        const expPct = Math.round(((creature.exp || 0) / expToNextLevel(creature.level)) * 100);

        const statMax = 120;
        const stats = [
            { label: 'VIT', val: creature.stats.vit,    max: creature.stats.maxVit, pct: vPct, color: '#55c3a8' },
            { label: 'AET', val: creature.stats.aet,    max: creature.stats.maxAet, pct: aPct, color: '#6b8fff' },
            { label: 'ATK', val: creature.stats.atk,    max: statMax,               pct: Math.round((creature.stats.atk/statMax)*100), color: '#e05c2a' },
            { label: 'DEF', val: creature.stats.def,    max: statMax,               pct: Math.round((creature.stats.def/statMax)*100), color: '#8a7060' },
            { label: 'SPD', val: creature.stats.spd,    max: statMax,               pct: Math.round((creature.stats.spd/statMax)*100), color: '#f0e040' },
        ];

        container.innerHTML = `
            <div class="detail-header">
                <div class="detail-canvas-wrap">
                    <canvas id="detail-sprite-canvas" width="120" height="120"></canvas>
                </div>
                <div class="detail-meta">
                    <div class="detail-name">${creature.name}</div>
                    <div class="detail-num">#${String(def.codexNum || '??').padStart(3,'0')} · ${def.region || 'Brinefall Shores'}</div>
                    <div class="detail-types">
                        ${creature.types.map(t => `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`).join('')}
                    </div>
                    <div class="detail-level">LEVEL ${creature.level}</div>
                    <div class="detail-exp-row">
                        <span>EXP</span>
                        <div class="detail-exp-bar"><div class="detail-exp-fill" style="width:${expPct}%"></div></div>
                        <span>${creature.exp || 0} / ${expToNextLevel(creature.level)}</span>
                    </div>
                </div>
            </div>
            <div class="detail-section-title">STATS</div>
            <div class="detail-stats-grid">
                ${stats.map(s => `
                    <div class="detail-stat-row">
                        <div class="detail-stat-label">${s.label}</div>
                        <div class="detail-stat-bar"><div class="detail-stat-fill" style="width:${Math.min(100,s.pct)}%;background:${s.color}"></div></div>
                        <div class="detail-stat-val">${s.val}${s.max !== statMax ? '/'+s.max : ''}</div>
                    </div>
                `).join('')}
            </div>
            <div class="detail-section-title">MOVES</div>
            <div class="detail-moves-list">
                ${creature.moves.map(m => `
                    <div class="detail-move-row">
                        <span class="type-badge type-${m.type.toLowerCase()}">${m.type}</span>
                        <span class="detail-move-name">${m.name}</span>
                        <div class="detail-move-meta">PWR ${m.power || '—'} · AET ${m.aetCost || 0}</div>
                    </div>
                `).join('')}
            </div>
            <div class="detail-section-title">LORE</div>
            <div class="detail-lore">${def.loreNote || 'No lore recorded yet.'}</div>
            <div class="detail-close-row">
                <button class="btn-secondary close-btn" onclick="Game.closeCreatureDetail()">✕  CLOSE</button>
            </div>
        `;

        // Draw sprite on the detail canvas
        requestAnimationFrame(() => {
            const canvas = document.getElementById('detail-sprite-canvas');
            if (canvas && OverworldEngine.drawSprite) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, 120, 120);
                OverworldEngine.drawSprite(ctx, creature.defId, 0, 0, 120);
            }
        });

        showScreen('screen-creature-detail');
    }

    function closeCreatureDetail() {
        playSound('back');
        closeOverlay();
    }

    // ── TEAM SCREEN ──────────────────────────────────────────
    function renderTeamScreen() {
        const list = document.getElementById('team-list');
        if (!list) return;
        list.innerHTML = '';

        state.party.forEach((creature) => {
            const vPct = Math.round((creature.stats.vit / creature.stats.maxVit) * 100);
            const aPct = Math.round((creature.stats.aet / creature.stats.maxAet) * 100);

            const el = document.createElement('div');
            el.className = 'team-card';
            el.style.cursor = 'pointer';
            el.innerHTML = `
                <div class="team-sprite ${creature.spriteClass}"></div>
                <div class="team-info">
                    <div class="team-name">${creature.name} <span class="team-level">Lv.${creature.level}</span></div>
                    <div class="team-types">
                        ${creature.types.map(t => `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`).join('')}
                    </div>
                    <div class="team-stats">
                        <div class="stat-row"><span>VIT</span>
                            <div class="stat-bar"><div class="stat-fill" style="width:${vPct}%;background:#55c3a8"></div></div>
                            <span>${creature.stats.vit}/${creature.stats.maxVit}</span>
                        </div>
                        <div class="stat-row"><span>AET</span>
                            <div class="stat-bar"><div class="stat-fill" style="width:${aPct}%;background:#6b8fff"></div></div>
                            <span>${creature.stats.aet}/${creature.stats.maxAet}</span>
                        </div>
                    </div>
                    <div class="team-moves">
                        ${creature.moves.map(m =>
                            `<span class="type-badge type-${m.type.toLowerCase()}">${m.name}</span>`
                        ).join(' ')}
                    </div>
                    <div class="team-lore">${CREATURE_DEFS[creature.defId]?.loreNote || ''}</div>
                </div>
            `;
            el.addEventListener('click', () => showCreatureDetail(creature));
            list.appendChild(el);
        });

        if (state.party.length === 0) {
            list.innerHTML = '<p style="color:#888;text-align:center;padding:2rem">No companions yet.</p>';
        }
    }

    // ── CODEX SCREEN ─────────────────────────────────────────
    function renderCodexScreen() {
        const grid = document.getElementById('codex-grid');
        if (!grid) return;
        grid.innerHTML = '';

        Object.values(CREATURE_DEFS).forEach(def => {
            const seen = state.codex.has(def.id);
            const el = document.createElement('div');
            el.className = 'codex-card' + (seen ? '' : ' codex-unseen');

            if (seen) {
                el.innerHTML = `
                    <div class="codex-num">#${def.codexNum}</div>
                    <div class="codex-sprite ${def.spriteClass}"></div>
                    <div class="codex-name">${def.name}</div>
                    <div class="codex-types">
                        ${def.types.map(t => `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`).join('')}
                    </div>
                    <div class="codex-desc">${def.desc}</div>
                `;
                el.addEventListener('click', () => {
                    const inst = state.party.find(c => c.defId === def.id);
                    if (inst) showCreatureDetail(inst);
                });
            } else {
                el.innerHTML = `
                    <div class="codex-num">#${def.codexNum}</div>
                    <div class="codex-sprite mystery-sprite"></div>
                    <div class="codex-name">???</div>
                    <div class="codex-desc">Not yet encountered.</div>
                `;
            }
            grid.appendChild(el);
        });
    }

    // ── MAP SCREEN ───────────────────────────────────────────
    function renderMapScreen() {
        Object.entries(REGIONS).forEach(([regionId, region]) => {
            const islandEl = document.getElementById('island-' + regionId.replace('_', '-'));
            if (!islandEl) return;
            const dot = islandEl.querySelector('.island-dot');
            if (!dot) return;
            const label = islandEl.querySelector('.island-label small');

            dot.className = 'island-dot';
            if (state.unlockedRegions.has(regionId)) {
                dot.classList.add(regionId === 'sky_spire' ? 'legendary' : 'accessible');
                if (label) label.textContent = 'ACT ' + region.act;
            } else {
                dot.classList.add('locked');
                if (label) label.textContent = 'LOCKED';
            }
        });
    }

    // ── PARTY STRIP (HUD bottom) ─────────────────────────────
    function updatePartyStrip() {
        const strip = document.getElementById('party-strip');
        if (!strip) return;
        strip.innerHTML = '';

        state.party.forEach((creature, i) => {
            const pct = Math.max(0, (creature.stats.vit / creature.stats.maxVit) * 100);
            const icon = document.createElement('div');
            icon.className = 'party-icon' + (i === 0 ? ' party-lead' : '');
            icon.title = `${creature.name} Lv.${creature.level}`;
            icon.innerHTML = `
                <div class="party-mini-sprite ${creature.spriteClass}"></div>
                <div class="party-vit-bar">
                    <div class="party-vit-fill" style="width:${pct}%;background:${pct < 25 ? '#e05555' : '#55c3a8'}"></div>
                </div>
            `;
            icon.addEventListener('click', () => showCreatureDetail(creature));
            strip.appendChild(icon);
        });
    }

    // ── WEATHER SYSTEM ───────────────────────────────────────
    function setWeather(weatherKey) {
        if (!WEATHER[weatherKey]) return;
        state.weather = weatherKey;
        OverworldEngine.setWeatherVisual(weatherKey);
        const wDef = WEATHER[weatherKey];
        if (weatherKey !== 'CLEAR') showClimateEvent(wDef.label);
    }

    function showClimateEvent(label) {
        const banner = document.getElementById('climate-event-banner');
        const textEl = document.getElementById('climate-text');
        if (!banner || !textEl) return;
        textEl.textContent = label;
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 3500);
    }

    // ── CAPTURE CREATURE ─────────────────────────────────────
    function captureCreature(creature) {
        if (state.party.length >= 6) {
            notify(`Party is full! ${creature.name} released back into the wild.`, 'warning');
            return;
        }
        state.party.push(creature);
        state.codex.add(creature.defId);
        if (state.stats) state.stats.creaturesCaught++;
        playSound('capture');
        notify(`${creature.name} joined your party!`, 'success');
        updatePartyStrip();
    }

    // ── EXP / LEVELING ───────────────────────────────────────
    function grantExp(creature, amount) {
        creature.exp = (creature.exp || 0) + amount;
        const needed = expToNextLevel(creature.level);
        if (creature.exp >= needed) {
            creature.exp -= needed;
            levelUp(creature);
        }
        updatePartyStrip();
    }

    function expToNextLevel(level) {
        return Math.floor(20 + level * 18 + level * level * 2);
    }

    function levelUp(creature) {
        creature.level++;
        const def = CREATURE_DEFS[creature.defId];
        if (!def) return;
        const scale = (base) => Math.floor(base + base * 0.08 * creature.level);
        const newMaxVit = scale(def.baseStats.vit);
        const vitGain   = newMaxVit - creature.stats.maxVit;
        creature.stats.maxVit = newMaxVit;
        creature.stats.vit    = Math.min(newMaxVit, creature.stats.vit + vitGain);
        creature.stats.atk    = scale(def.baseStats.atk);
        creature.stats.def    = scale(def.baseStats.def);
        creature.stats.spd    = scale(def.baseStats.spd);
        const newMaxAet = scale(def.baseStats.aet);
        creature.stats.maxAet = newMaxAet;

        playSound('levelup');
        notify(`${creature.name} reached Level ${creature.level}!`, 'success');

        const moveIdx = Math.min(creature.level - 1, def.learnset.length - 1);
        if (moveIdx >= 0) {
            const newMoveId = def.learnset[moveIdx];
            const alreadyKnows = creature.moves.some(m => m.id === newMoveId);
            if (!alreadyKnows && MOVES[newMoveId]) {
                if (creature.moves.length < 4) {
                    // Slot free — learn automatically
                    creature.moves.push(MOVES[newMoveId]);
                    notify(`${creature.name} learned ${MOVES[newMoveId].name}!`, 'info');
                } else {
                    // All 4 slots full — open the swap popup
                    setTimeout(() => openLearnMove(creature, newMoveId), 600);
                }
            }
        }
        updatePartyStrip();
    }

    // ── LEARN MOVE POPUP ─────────────────────────────────────
    let _learnMoveContext = null; // { creature, newMoveId }

    function openLearnMove(creature, newMoveId) {
        const newMove = MOVES[newMoveId];
        if (!newMove) return;
        _learnMoveContext = { creature, newMoveId };

        const overlay = document.getElementById('learnmove-overlay');
        if (!overlay) return;

        // Subtitle
        document.getElementById('learnmove-subtitle').textContent =
            `${creature.name} wants to learn ${newMove.name}, but already knows 4 moves.`;

        // New move preview card
        const newCard = document.getElementById('learnmove-new-card');
        const power = newMove.power ? `PWR ${newMove.power}` : 'Status';
        const acc   = newMove.accuracy ? `ACC ${newMove.accuracy}%` : '';
        const aet   = newMove.aetCost  ? `AET ${newMove.aetCost}` : '';
        newCard.innerHTML = `
            <div class="learnmove-new-name">${newMove.name}</div>
            <div class="learnmove-new-meta">${[newMove.type, power, acc, aet].filter(Boolean).join(' · ')}</div>
            ${newMove.desc ? `<div class="learnmove-new-desc">${newMove.desc}</div>` : ''}
        `;

        // Existing move slots
        const slots = document.getElementById('learnmove-slots');
        slots.innerHTML = '';
        creature.moves.forEach((move, i) => {
            const pw = move.power ? `PWR ${move.power}` : 'Status';
            const ac = move.accuracy ? `ACC ${move.accuracy}%` : '';
            const ae = move.aetCost  ? `AET ${move.aetCost}` : '';
            const btn = document.createElement('div');
            btn.className = 'learnmove-slot';
            btn.innerHTML = `
                <span class="learnmove-slot-name">${move.name}</span>
                <span class="learnmove-slot-meta">${[move.type, pw, ac, ae].filter(Boolean).join(' · ')}</span>
            `;
            btn.addEventListener('click', () => execLearnMove(i));
            slots.appendChild(btn);
        });

        overlay.classList.remove('hidden');
        playSound('select');
    }

    function execLearnMove(slotIndex) {
        if (!_learnMoveContext) return;
        const { creature, newMoveId } = _learnMoveContext;
        const newMove = MOVES[newMoveId];
        if (!newMove) return;
        const oldName = creature.moves[slotIndex]?.name ?? '???';
        creature.moves[slotIndex] = newMove;
        notify(`${creature.name} forgot ${oldName} and learned ${newMove.name}!`, 'success');
        playSound('select');
        _learnMoveContext = null;
        document.getElementById('learnmove-overlay')?.classList.add('hidden');
        updatePartyStrip();
    }

    function skipLearnMove() {
        if (!_learnMoveContext) return;
        const { creature, newMoveId } = _learnMoveContext;
        const newMove = MOVES[newMoveId];
        notify(`${creature.name} did not learn ${newMove?.name ?? 'the new move'}.`, 'neutral');
        playSound('back');
        _learnMoveContext = null;
        document.getElementById('learnmove-overlay')?.classList.add('hidden');
    }


    // ── BATTLE SWITCH POPUP ──────────────────────────────────
    // forceSwitch: if true, cancel button is hidden (faint-forced swap)
    function showBattleSwitchPanel(forceSwitch = false) {
        _battleSwitchForced = forceSwitch;
        const battleState = BattleEngine.getState();
        const active = battleState.playerCreature;

        const available = state.party.filter(c => c !== active && c.stats.vit > 0);
        if (available.length === 0) {
            setBattleStatus('No other usable companions!');
            return;
        }

        const overlay = document.getElementById('battle-switch-overlay');
        const list    = document.getElementById('bswitch-list');
        const subtitle = document.getElementById('bswitch-subtitle');
        const cancelBtn = document.getElementById('bswitch-cancel-btn');
        if (!overlay || !list) return;

        subtitle.textContent = forceSwitch
            ? `${active ? active.name : 'Your companion'} fainted! Choose who to send out:`
            : 'Choose who to send out:';

        // Hide cancel on forced switch (faint) — must pick someone
        cancelBtn.style.display = forceSwitch ? 'none' : '';

        list.innerHTML = '';
        state.party.forEach((creature) => {
            if (creature === active) return;
            const hp = Math.round((creature.stats.vit / creature.stats.maxVit) * 100);
            const fainted = creature.stats.vit <= 0;

            const row = document.createElement('div');
            row.className = 'bswitch-row' + (fainted ? ' bswitch-fainted' : '');

            const hpColor = hp < 25 ? '#e05555' : hp < 50 ? '#e8b84b' : '#55c3a8';
            row.innerHTML = `
                <div class="bswitch-sprite-wrap">
                    <canvas class="bswitch-canvas" width="48" height="48" data-defid="${creature.defId}"></canvas>
                </div>
                <div class="bswitch-info">
                    <div class="bswitch-name">${creature.name}</div>
                    <div class="bswitch-lv">Lv.${creature.level} · ${creature.types.join('/')}</div>
                    <div class="bswitch-bar-wrap">
                        <div class="bswitch-bar" style="width:${hp}%;background:${hpColor}"></div>
                    </div>
                    <div class="bswitch-hp">${fainted ? 'FAINTED' : `${creature.stats.vit}/${creature.stats.maxVit} VIT`}</div>
                </div>
                ${!fainted ? `<button class="bswitch-send-btn" onclick="Game.execBattleSwitch(${state.party.indexOf(creature)})">SEND OUT ▶</button>` : ''}
            `;
            list.appendChild(row);
        });

        // Draw sprites on the mini canvases
        requestAnimationFrame(() => {
            list.querySelectorAll('.bswitch-canvas').forEach(c => {
                const cx = c.getContext('2d');
                if (OverworldEngine.drawSprite) OverworldEngine.drawSprite(cx, c.dataset.defid, 0, 0, 48);
            });
        });

        overlay.classList.remove('hidden');
        playSound('select');
    }

    function closeBattleSwitch() {
        const overlay = document.getElementById('battle-switch-overlay');
        if (overlay) overlay.classList.add('hidden');
        // Restore action panel if not forced
        const actionPanel = document.getElementById('action-panel');
        if (actionPanel) actionPanel.style.display = 'flex';
        playSound('back');
    }

    function execBattleSwitch(partyIndex) {
        const overlay = document.getElementById('battle-switch-overlay');
        if (overlay) overlay.classList.add('hidden');

        const creature = state.party[partyIndex];
        if (!creature || creature.stats.vit <= 0) return;

        const battleState = BattleEngine.getState();
        battleState.playerCreature = creature;
        playSound('select');
        setBattleStatus(`Go, ${creature.name}!`);

        // Update battle UI
        document.getElementById('player-creature-name').textContent = creature.name + ' Lv.' + creature.level;
        document.getElementById('player-types').innerHTML = creature.types.map(t =>
            `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
        ).join('');
        const canvas = document.getElementById('player-sprite-el');
        if (canvas && OverworldEngine.drawSprite) {
            const cx = canvas.getContext('2d');
            cx.clearRect(0, 0, canvas.width, canvas.height);
            OverworldEngine.drawSprite(cx, creature.defId, 0, 0, canvas.width);
        }
        const pHp  = document.getElementById('player-hp-fill');
        const pAet = document.getElementById('player-aet-fill');
        if (pHp)  pHp.style.width  = Math.max(0, (creature.stats.vit / creature.stats.maxVit) * 100) + '%';
        if (pAet) pAet.style.width = Math.max(0, (creature.stats.aet / creature.stats.maxAet) * 100) + '%';

        if (_battleSwitchForced) {
            // Forced faint-switch: enemy gets a free attack before we can act
            _battleSwitchForced = false;
            setBattleStatus(`Go, ${creature.name}!`);
            setTimeout(() => BattleEngine.resumeAfterForcedSwitch(), 800);
        } else {
            // Voluntary switch: player used their turn, show action panel
            const actionPanel = document.getElementById('action-panel');
            if (actionPanel) actionPanel.style.display = 'flex';
            battleState.turnPhase = 'action';
        }
    }

    // ── BATTLE STATUS LOG ────────────────────────────────────
    let _statusQueue = [];
    let _statusBusy  = false;

    function setBattleStatus(text) {
        _statusQueue.push(text);
        if (!_statusBusy) _drainStatusQueue();
    }

    function _drainStatusQueue() {
        if (_statusQueue.length === 0) { _statusBusy = false; return; }
        _statusBusy = true;
        const text = _statusQueue.shift();
        const log = document.getElementById('battle-status-log');
        if (!log) { _drainStatusQueue(); return; }

        // Fade out the current message first
        const old = log.querySelector('.battle-status-msg');
        if (old) {
            old.classList.add('status-fade');
            setTimeout(() => {
                old.remove();
                _showStatusMsg(log, text);
            }, 160);
        } else {
            _showStatusMsg(log, text);
        }
    }

    function _showStatusMsg(log, text) {
        const msg = document.createElement('div');
        msg.className = 'battle-status-msg';
        msg.textContent = text;
        log.appendChild(msg);
        // Hold each message for 900ms before showing next
        setTimeout(() => _drainStatusQueue(), 900);
    }

    // ── NOTIFICATIONS ────────────────────────────────────────
    function notify(text, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `notification notify-${type}`;
        el.textContent = text;
        container.appendChild(el);
        requestAnimationFrame(() => el.classList.add('notify-show'));
        setTimeout(() => {
            el.classList.remove('notify-show');
            el.classList.add('notify-hide');
            setTimeout(() => el.remove(), 500);
        }, 3000);
    }

    // ── ENCOUNTER FLASH ALERT ────────────────────────────────
    function showEncounterAlert(creatureName, callback) {
        playSound('encounter');
        let alert = document.getElementById('encounter-alert');
        if (!alert) return callback();  // fallback: just start battle

        const nameEl = alert.querySelector('#encounter-alert-name');
        if (nameEl) nameEl.textContent = creatureName;

        alert.classList.remove('hidden');
        alert.classList.add('encounter-alert-show');

        // Flash 3 times then call back
        setTimeout(() => {
            alert.classList.remove('encounter-alert-show');
            alert.classList.add('hidden');
            callback();
        }, 900);
    }

    // ── START MENU (ALT key) ─────────────────────────────────
    let _startMenuOpen = false;

    function toggleStartMenu() {
        const menu = document.getElementById('start-menu');
        if (!menu) return;
        if (_startMenuOpen) {
            _closeStartMenu();
        } else {
            _openStartMenu();
        }
    }

    function _openStartMenu() {
        _startMenuOpen = true;
        playSound('select');
        _renderStartMenu();
        const menu = document.getElementById('start-menu');
        if (!menu) return;
        // Update player name
        const nameEl = document.getElementById('sm-player-name');
        if (nameEl) nameEl.textContent = state.playerName.toUpperCase();
        menu.classList.remove('hidden');
        requestAnimationFrame(() => menu.classList.add('start-menu-open'));
    }

    function _closeStartMenu() {
        _startMenuOpen = false;
        playSound('back');
        const menu = document.getElementById('start-menu');
        if (!menu) return;
        menu.classList.remove('start-menu-open');
        setTimeout(() => menu.classList.add('hidden'), 180);
    }

    function _renderStartMenu() {
        // Bag section
        const bagList = document.getElementById('sm-bag-list');
        if (bagList) {
            bagList.innerHTML = '';
            const bagSections = [
                { key: 'capture',  label: 'CAPTURE DEVICES', ids: ['tide_orb'] },
                { key: 'recovery', label: 'RECOVERY',        ids: ['reef_salve', 'storm_draft'] },
                { key: 'quest',    label: 'QUEST ITEMS',     ids: ['tide_shard'] },
            ];
            let anyShown = false;
            bagSections.forEach(section => {
                const secItems = section.ids.filter(id => (state.items[id] || 0) > 0);
                if (secItems.length === 0) return;
                anyShown = true;
                const hdr = document.createElement('div');
                hdr.className = 'sm-bag-section';
                hdr.textContent = section.label;
                bagList.appendChild(hdr);
                secItems.forEach(id => {
                    const def = ITEMS[id];
                    if (!def) return;
                    const row = document.createElement('div');
                    row.className = 'sm-bag-item';
                    // For quest items, show progress alongside count
                    let extra = '';
                    if (id === 'tide_shard') {
                        const q = state.quests && state.quests.tide_shard_recovery;
                        if (q) {
                            const status = q.complete ? ' ✓' : ` (${q.shardsFound}/${q.shardsRequired})`;
                            extra = `<span class="sm-item-quest">${status}</span>`;
                        }
                    }
                    row.innerHTML = `<span class="sm-item-name">${def.name}</span>${extra}<span class="sm-item-count">×${state.items[id]}</span>`;
                    bagList.appendChild(row);
                });
            });
            if (!anyShown) {
                bagList.innerHTML = '<div class="sm-empty">Bag is empty.</div>';
            }
        }

        // Team section
        const teamList = document.getElementById('sm-team-list');
        if (teamList) {
            teamList.innerHTML = '';
            if (state.party.length === 0) {
                teamList.innerHTML = '<div class="sm-empty">No companions.</div>';
            } else {
                state.party.forEach((c, i) => {
                    const pct = Math.round((c.stats.vit / c.stats.maxVit) * 100);
                    const color = pct < 25 ? '#e05555' : pct < 50 ? '#e8b84b' : '#55c3a8';
                    const row = document.createElement('div');
                    row.className = 'sm-team-row';
                    row.innerHTML = `
                        <span class="sm-team-lead">${i === 0 ? '★' : '·'}</span>
                        <span class="sm-team-name">${c.name}</span>
                        <span class="sm-team-lv">Lv.${c.level}</span>
                        <div class="sm-team-bar"><div style="width:${pct}%;background:${color}"></div></div>
                        <span class="sm-team-hp">${c.stats.vit}/${c.stats.maxVit}</span>
                    `;
                    row.addEventListener('click', () => { _closeStartMenu(); showCreatureDetail(c); });
                    teamList.appendChild(row);
                });
            }
        }

        // Godex count
        const godexCount = document.getElementById('sm-godex-count');
        if (godexCount) godexCount.textContent = state.codex.size + ' / ' + Object.keys(CREATURE_DEFS).length;

        // Location
        const locEl = document.getElementById('sm-location');
        if (locEl) locEl.textContent = REGIONS[state.currentRegion]?.name || state.currentRegion;

        // Time
        const timeEl = document.getElementById('sm-time');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }

    // ── INIT ON LOAD ─────────────────────────────────────────
    window.addEventListener('DOMContentLoaded', () => {
        // Nothing to restore — no save system
    });

    // ── BLACKOUT (full party KO) ─────────────────────────────
    function blackout() {
        state.stats.blackouts++;
        state.stats.battlesLost++;
        const overlay = document.getElementById('screen-transition');
        if (overlay) {
            overlay.style.background = '#000';
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'all';
        }
        playSound('back');
        // Heal all party members, then enter Tidecenter interior
        setTimeout(() => {
            _healPartyFull();
            notify('You blacked out... and woke up at the Tidecenter.', 'warning');
            showScreen('screen-overworld');
            // Load the Tidecenter interior map directly
            if (window.OverworldEngine) {
                OverworldEngine.enterTidecenter();
            }
            if (overlay) {
                overlay.style.transition = 'opacity 1.2s ease';
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.style.pointerEvents = 'none';
                        overlay.style.transition = '';
                    }, 1200);
                }, 400);
            }
        }, 1600);
    }

    function _healPartyFull() {
        state.party.forEach(c => {
            c.stats.vit = c.stats.maxVit;
            c.stats.aet = c.stats.maxAet;
        });
        updatePartyStrip();
    }

    // ── TIDECENTER ───────────────────────────────────────────
    function openTidecenter() {
        playSound('select');
        const overlay = document.getElementById('tidecenter-overlay');
        if (overlay) {
            _renderTidecenter();
            overlay.classList.remove('hidden');
        }
    }

    function closeTidecenter() {
        playSound('back');
        const overlay = document.getElementById('tidecenter-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    let _tcRestStep = 0; // 0=idle, 1=asking, 2=healing, 3=done

    function _renderTidecenter() {
        _tcRestStep = 0;
        const dlg = document.getElementById('tc-dialogue');
        if (dlg) dlg.textContent = 'Welcome to the Tidecenter! Your companions can rest here.';
        const restBtn = document.getElementById('tc-rest-btn');
        if (restBtn) restBtn.textContent = 'REST COMPANIONS';
        _renderTCParty();
    }

    function _renderTCParty() {
        const list = document.getElementById('tc-party-list');
        if (!list) return;
        list.innerHTML = '';
        if (state.party.length === 0) {
            list.innerHTML = '<div class="tc-empty">No companions in party.</div>';
            return;
        }
        state.party.forEach((c, i) => {
            const pct = Math.round((c.stats.vit / c.stats.maxVit) * 100);
            const color = pct < 25 ? '#e05555' : pct < 50 ? '#e8b84b' : '#55c3a8';
            const orb = document.createElement('div');
            orb.className = 'tc-orb-row';
            orb.id = `tc-orb-${i}`;
            orb.innerHTML = `
                <div class="tc-orb-ball" id="tc-ball-${i}">◉</div>
                <span class="tc-orb-name">${c.name}</span>
                <span class="tc-orb-lv">Lv.${c.level}</span>
                <div class="tc-orb-bar"><div class="tc-orb-fill" style="width:${pct}%;background:${color}"></div></div>
                <span class="tc-orb-hp">${c.stats.vit}/${c.stats.maxVit}</span>
            `;
            list.appendChild(orb);
        });
    }

    function tcRestCompanions() {
        if (_tcRestStep === 2) return; // already healing
        _tcRestStep = 2;
        const dlg = document.getElementById('tc-dialogue');
        if (dlg) dlg.textContent = 'Placing your companions in the Restoration Chamber...';
        const restBtn = document.getElementById('tc-rest-btn');
        if (restBtn) restBtn.disabled = true;

        // Flash orb animations then heal
        state.party.forEach((c, i) => {
            const ball = document.getElementById(`tc-ball-${i}`);
            if (ball) ball.classList.add('tc-orb-healing');
        });

        playSound('encounter');

        setTimeout(() => {
            _healPartyFull();
            _renderTCParty();
            state.party.forEach((c, i) => {
                const ball = document.getElementById(`tc-ball-${i}`);
                if (ball) ball.classList.remove('tc-orb-healing');
            });
            if (dlg) dlg.textContent = '✓ All companions fully restored! Have a safe journey!';
            if (restBtn) { restBtn.disabled = false; restBtn.textContent = 'REST AGAIN'; }
            playSound('levelup');
            _tcRestStep = 3;
        }, 2200);
    }

    // ── PC STORAGE ───────────────────────────────────────────
    function openPCStorage() {
        closeTidecenter();
        playSound('select');
        const overlay = document.getElementById('pc-overlay');
        if (overlay) {
            _renderPC();
            overlay.classList.remove('hidden');
        }
    }

    function closePCStorage() {
        playSound('back');
        const overlay = document.getElementById('pc-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function _renderPC() {
        _renderPCParty();
        _renderPCBox();
        _renderPCStats();
    }

    function _renderPCParty() {
        const list = document.getElementById('pc-party-list');
        if (!list) return;
        list.innerHTML = '';
        state.party.forEach((c, i) => {
            const row = document.createElement('div');
            row.className = 'pc-creature-row';
            const pct = Math.round((c.stats.vit / c.stats.maxVit) * 100);
            const color = pct < 25 ? '#e05555' : pct < 50 ? '#e8b84b' : '#55c3a8';
            row.innerHTML = `
                <span class="pc-cr-name">${c.name}</span>
                <span class="pc-cr-lv">Lv.${c.level}</span>
                <div class="pc-cr-bar"><div style="width:${pct}%;background:${color}"></div></div>
                <button class="pc-btn pc-store-btn" onclick="Game.pcStoreCreature(${i})">STORE →</button>
            `;
            list.appendChild(row);
        });
        if (state.party.length === 0) {
            list.innerHTML = '<div class="pc-empty">Party is empty.</div>';
        }
    }

    function _renderPCBox() {
        const box = document.getElementById('pc-box-list');
        if (!box) return;
        box.innerHTML = '';
        if (state.pc.length === 0) {
            box.innerHTML = '<div class="pc-empty">PC Box is empty.</div>';
            return;
        }
        state.pc.forEach((c, i) => {
            const row = document.createElement('div');
            row.className = 'pc-creature-row';
            row.innerHTML = `
                <span class="pc-cr-name">${c.name}</span>
                <span class="pc-cr-lv">Lv.${c.level}</span>
                <button class="pc-btn pc-withdraw-btn" onclick="Game.pcWithdrawCreature(${i})">← WITHDRAW</button>
            `;
            box.appendChild(row);
        });
    }

    function _renderPCStats() {
        const statsEl = document.getElementById('pc-stats-panel');
        if (!statsEl) return;
        const s = state.stats;
        statsEl.innerHTML = `
            <div class="pc-stat-row"><span>Steps Walked</span><span>${(s.stepsWalked || 0).toLocaleString()}</span></div>
            <div class="pc-stat-row"><span>Creatures Caught</span><span>${s.creaturesCaught || 0}</span></div>
            <div class="pc-stat-row"><span>Battles Won</span><span>${s.battlesWon || 0}</span></div>
            <div class="pc-stat-row"><span>Battles Lost</span><span>${s.battlesLost || 0}</span></div>
            <div class="pc-stat-row"><span>Blackouts</span><span>${s.blackouts || 0}</span></div>
            <div class="pc-stat-row"><span>Creatures in Godex</span><span>${state.codex.size} / ${Object.keys(CREATURE_DEFS).length}</span></div>
            <div class="pc-stat-row"><span>Party Size</span><span>${state.party.length} / 6</span></div>
            <div class="pc-stat-row"><span>PC Box</span><span>${state.pc.length} stored</span></div>
        `;
    }

    function pcStoreCreature(partyIndex) {
        if (state.party.length <= 1) {
            notify("You can't store your last companion!", 'warning');
            return;
        }
        const c = state.party.splice(partyIndex, 1)[0];
        state.pc.push(c);
        playSound('select');
        notify(`${c.name} was stored in the PC.`, 'success');
        _renderPC();
        updatePartyStrip();
    }

    function pcWithdrawCreature(boxIndex) {
        if (state.party.length >= 6) {
            notify('Your party is full! Store a companion first.', 'warning');
            return;
        }
        const c = state.pc.splice(boxIndex, 1)[0];
        state.party.push(c);
        playSound('select');
        notify(`${c.name} was added to your party!`, 'success');
        _renderPC();
        updatePartyStrip();
    }

    // ── BAG DETAIL POPUP ─────────────────────────────────────
    function openBagDetail() {
        playSound('select');
        _renderBagDetail();
        const overlay = document.getElementById('bag-detail-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    function closeBagDetail() {
        playSound('back');
        const overlay = document.getElementById('bag-detail-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function _renderBagDetail() {
        const container = document.getElementById('bag-detail-content');
        if (!container) return;
        container.innerHTML = '';

        const bagSections = [
            { label: 'CAPTURE DEVICES', ids: ['tide_orb'],               icon: '🔮' },
            { label: 'RECOVERY',        ids: ['reef_salve','storm_draft'],icon: '💊' },
            { label: 'QUEST ITEMS',     ids: ['tide_shard'],              icon: '✨' },
        ];

        bagSections.forEach(section => {
            const secItems = section.ids.filter(id => (state.items[id] || 0) > 0);
            if (secItems.length === 0) return;

            const secDiv = document.createElement('div');
            secDiv.className = 'bag-detail-section';
            secDiv.innerHTML = `<div class="bag-detail-header">${section.icon} ${section.label}</div>`;

            secItems.forEach(id => {
                const def = ITEMS[id];
                if (!def) return;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'bag-detail-item';
                let extraInfo = '';
                if (id === 'tide_shard') {
                    const q = state.quests && state.quests.tide_shard_recovery;
                    extraInfo = q ? `<span class="bag-item-quest-tag">${q.complete ? 'COMPLETE ✓' : `Quest: ${q.shardsFound}/${q.shardsRequired}`}</span>` : '';
                }
                itemDiv.innerHTML = `
                    <div class="bag-item-main">
                        <span class="bag-item-name">${def.name}</span>
                        <span class="bag-item-qty">×${state.items[id]}</span>
                    </div>
                    <div class="bag-item-desc">${def.desc}</div>
                    ${extraInfo}
                `;
                secDiv.appendChild(itemDiv);
            });

            container.appendChild(secDiv);
        });

        const total = Object.values(state.items).reduce((a, b) => a + b, 0);
        if (total === 0) {
            container.innerHTML = '<div class="bag-detail-empty">Your bag is empty.</div>';
        }
    }

    // ── PUBLIC API ───────────────────────────────────────────
    return {
        get state() { return state; },

        showScreen,
        closeOverlay,
        closeEscapeMenu,
        startNewGame,
        selectStarter,
        selectGender,
        openMenu,
        notify,
        setBattleStatus,
        setWeather,
        captureCreature,
        grantExp,
        updatePartyStrip,
        playSound,
        toggleOption,
        cycleOption,
        showCreatureDetail,
        closeCreatureDetail,
        showEncounterAlert,
        toggleStartMenu,
        closeStartMenu: _closeStartMenu,
        blackout,
        openTidecenter,
        closeTidecenter,
        tcRestCompanions,
        openPCStorage,
        closePCStorage,
        pcStoreCreature,
        pcWithdrawCreature,
        openBagDetail,
        closeBagDetail,
        closeBattleSwitch,
        execBattleSwitch,
        showBattleSwitchPanel,
        openLearnMove,
        execLearnMove,
        skipLearnMove,

        // Expose battle sub-object so HTML onclick="Game.battle.X()" works
        get battle() { return BattleEngine; },
    };
})();
