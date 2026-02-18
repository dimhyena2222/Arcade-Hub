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

        // Party (array of live creature instances, max 6)
        party: [],

        // Codex (set of seen creature def IDs)
        codex: new Set(),

        // Inventory
        items: {
            tide_orb: 5,
            reef_salve: 3,
            storm_draft: 2,
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

    // ── INTRO DIALOGUE RUNNER ────────────────────────────────
    function runIntroDialogue() {
        const line = INTRO_DIALOGUE[state.introIndex];
        if (!line) {
            showScreen('screen-starter');
            return;
        }

        const speakerEl = document.getElementById('dlg-speaker');
        const textEl    = document.getElementById('dlg-text');
        const bgEl      = document.getElementById('scene-bg');
        const charEl    = document.getElementById('scene-char');

        if (speakerEl) speakerEl.textContent = line.speaker;
        if (textEl)    textEl.textContent    = line.text;
        if (bgEl)      bgEl.className        = 'scene-bg bg-' + (line.bg || 'lab');
        if (charEl)    charEl.className      = 'scene-character char-' + (line.char || 'maris');

        const scene = document.getElementById('intro-scene');
        if (scene) {
            scene.onclick = null;
            scene.onclick = advanceIntro;
        }
    }

    function advanceIntro() {
        playSound('select');
        state.introIndex++;
        const line = INTRO_DIALOGUE[state.introIndex];
        if (!line || line.transition === 'starter') {
            state.flags.introComplete = true;
            showScreen('screen-starter');
            return;
        }
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
                showBattleSwitchPanel();
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
                    creature.moves.push(MOVES[newMoveId]);
                    notify(`${creature.name} learned ${MOVES[newMoveId].name}!`, 'info');
                } else {
                    notify(`${creature.name} could learn ${MOVES[newMoveId].name} but knows 4 moves already.`, 'neutral');
                }
            }
        }
        updatePartyStrip();
    }

    // ── BATTLE SWITCH PANEL ──────────────────────────────────
    function showBattleSwitchPanel() {
        const battleState = BattleEngine.getState();
        const active = battleState.playerCreature;

        const log = document.getElementById('battle-status-log');
        if (!log) return;

        document.getElementById('switch-list-temp')?.remove();

        const switchDiv = document.createElement('div');
        switchDiv.id = 'switch-list-temp';
        switchDiv.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;padding:8px 0;';

        state.party.forEach((creature) => {
            if (creature === active) return;
            const btn = document.createElement('button');
            btn.className = 'battle-btn';
            btn.style.cssText = 'font-size:0.75rem;padding:6px 10px;';
            const hp = Math.round((creature.stats.vit / creature.stats.maxVit) * 100);
            btn.textContent = `${creature.name} Lv.${creature.level} (${hp}%)`;
            if (creature.stats.vit <= 0) { btn.disabled = true; btn.style.opacity = '0.4'; }
            btn.addEventListener('click', () => {
                switchDiv.remove();
                playSound('select');
                battleState.playerCreature = creature;
                setBattleStatus(`Go, ${creature.name}!`);
                document.getElementById('player-creature-name').textContent = creature.name + ' Lv.' + creature.level;
                document.getElementById('player-types').innerHTML = creature.types.map(t =>
                    `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
                ).join('');
                const canvas = document.getElementById('player-sprite-el');
                if (canvas && OverworldEngine.drawSprite) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    OverworldEngine.drawSprite(ctx, creature.defId, 0, 0, canvas.width);
                }
                const pHp  = document.getElementById('player-hp-fill');
                const pAet = document.getElementById('player-aet-fill');
                if (pHp)  pHp.style.width  = Math.max(0, (creature.stats.vit / creature.stats.maxVit) * 100) + '%';
                if (pAet) pAet.style.width = Math.max(0, (creature.stats.aet / creature.stats.maxAet) * 100) + '%';
                document.getElementById('action-panel').style.display = 'flex';
            });
            switchDiv.appendChild(btn);
        });

        if (!switchDiv.children.length) {
            setBattleStatus('No other usable companions!');
            return;
        }
        log.appendChild(switchDiv);
    }

    // ── BATTLE STATUS LOG ────────────────────────────────────
    function setBattleStatus(text) {
        const log = document.getElementById('battle-status-log');
        if (!log) return;
        // Fade out old message
        const old = log.querySelector('.battle-status-msg');
        if (old) {
            old.classList.add('status-fade');
            setTimeout(() => old.remove(), 250);
        }
        const msg = document.createElement('div');
        msg.className = 'battle-status-msg';
        msg.textContent = text;
        log.appendChild(msg);
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

    // ── INIT ON LOAD ─────────────────────────────────────────
    window.addEventListener('DOMContentLoaded', () => {
        // Nothing to restore — no save system
    });

    // ── PUBLIC API ───────────────────────────────────────────
    return {
        get state() { return state; },

        showScreen,
        closeOverlay,
        closeEscapeMenu,
        startNewGame,
        selectStarter,
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

        // Expose battle sub-object so HTML onclick="Game.battle.X()" works
        get battle() { return BattleEngine; },
    };
})();
