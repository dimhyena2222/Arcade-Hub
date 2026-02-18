// ============================================================
//  TIDEBREAK: Legacy of the Storms — GAME.JS
//  Master controller: screens, state, save, faction, notify
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

        // Faction reputation (0–100 each, starts neutral 20)
        factionRep: {
            abyssal: 20,
            solterra: 20,
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
    let _overlayStack = [];     // track overlay screens for closeOverlay()

    // ── SCREEN MANAGEMENT ────────────────────────────────────
    function showScreen(id) {
        const all = document.querySelectorAll('.screen');
        all.forEach(s => s.classList.remove('active'));

        const target = document.getElementById(id);
        if (target) {
            target.classList.add('active');
            state.previousScreen = state.currentScreen;
            state.currentScreen = id;
        }

        // Overworld-specific
        if (id === 'screen-overworld') {
            OverworldEngine.resumeLoop();
            updatePartyStrip();
            updateFactionMeters();
        } else {
            OverworldEngine.pauseLoop();
        }
    }

    function closeOverlay() {
        // Pop back to overworld (or previous screen)
        if (state.previousScreen && state.previousScreen !== state.currentScreen) {
            showScreen(state.previousScreen);
        } else {
            showScreen('screen-overworld');
        }
    }

    // ── NEW GAME ─────────────────────────────────────────────
    function startNewGame() {
        state = DEFAULT_STATE();
        state.introIndex = 0;
        showScreen('screen-intro');
        runIntroDialogue();
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

        // Click or key to advance
        const scene = document.getElementById('intro-scene');
        if (scene) {
            scene.onclick = null;
            scene.onclick = advanceIntro;
        }
    }

    function advanceIntro() {
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

        const creature = createCreatureInstance(id, 5);
        state.party.push(creature);
        state.flags.starterChosen = true;

        // Highlight chosen card
        document.querySelectorAll('.starter-card').forEach(c => c.classList.remove('chosen'));
        const card = document.getElementById('sc-' + id);
        if (card) card.classList.add('chosen');

        notify(`${creature.name} has chosen to join you.`, 'success');

        // Give starter Tide Orbs + salves from Maris
        state.items.tide_orb    = (state.items.tide_orb    || 0) + 5;
        state.items.reef_salve  = (state.items.reef_salve  || 0) + 2;
        state.items.storm_draft = (state.items.storm_draft || 0) + 1;

        // Register in codex
        state.codex.add(id);

        setTimeout(() => {
            showScreen('screen-overworld');
            OverworldEngine.init();
            updatePartyStrip();
        }, 1200);
    }

    // ── OPEN MENU OVERLAYS ────────────────────────────────────
    function openMenu(type) {
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
            case 'factions':
                showFactionInfo();
                break;
            case 'options':
                notify('Options coming soon.', 'info');
                break;
            case 'switch-battle':
                showBattleSwitchPanel();
                break;
            default:
                break;
        }
    }

    // ── TEAM SCREEN ──────────────────────────────────────────
    function renderTeamScreen() {
        const list = document.getElementById('team-list');
        if (!list) return;
        list.innerHTML = '';

        state.party.forEach((creature, idx) => {
            const vPct = Math.round((creature.stats.vit / creature.stats.maxVit) * 100);
            const aPct = Math.round((creature.stats.aet / creature.stats.maxAet) * 100);

            const el = document.createElement('div');
            el.className = 'team-card';
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
        // Update island lock states
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

    // ── FACTION INFO ─────────────────────────────────────────
    function showFactionInfo() {
        const ab = state.factionRep.abyssal;
        const so = state.factionRep.solterra;
        notify(
            `Abyssal: ${ab}/100 | Solterra: ${so}/100`,
            ab > so ? 'warning' : so > ab ? 'info' : 'neutral'
        );
    }

    function updateFactionMeters() {
        const abEl = document.getElementById('rep-abyss');
        const soEl = document.getElementById('rep-solt');
        if (abEl) abEl.style.width = state.factionRep.abyssal + '%';
        if (soEl) soEl.style.width = state.factionRep.solterra + '%';
    }

    function modFactionRep(faction, amount) {
        state.factionRep[faction] = Math.max(0, Math.min(100, (state.factionRep[faction] || 0) + amount));
        updateFactionMeters();

        const factDef = FACTIONS[faction];
        const dir = amount > 0 ? '▲' : '▼';
        notify(`${dir} ${factDef.shortName} reputation ${amount > 0 ? '+' : ''}${amount}`, 'info');
    }

    // ── PARTY STRIP (HUD bottom) ─────────────────────────────
    function updatePartyStrip() {
        const strip = document.getElementById('party-strip');
        if (!strip) return;
        strip.innerHTML = '';

        state.party.forEach((creature, i) => {
            const pct = Math.max(0, (creature.stats.vit / creature.stats.maxVit) * 100);
            const icon = document.createElement('div');
            icon.className = 'party-icon';
            icon.innerHTML = `
                <div class="party-mini-sprite ${creature.spriteClass}"></div>
                <div class="party-vit-bar">
                    <div class="party-vit-fill" style="width:${pct}%;background:${pct < 25 ? '#e05555' : '#55c3a8'}"></div>
                </div>
            `;
            if (i === 0) icon.classList.add('party-lead');
            strip.appendChild(icon);
        });
    }

    // ── WEATHER SYSTEM ───────────────────────────────────────
    function setWeather(weatherKey) {
        if (!WEATHER[weatherKey]) return;
        state.weather = weatherKey;

        OverworldEngine.setWeatherVisual(weatherKey);

        const wDef = WEATHER[weatherKey];
        if (weatherKey !== 'CLEAR') {
            showClimateEvent(wDef.label);
        }
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

        // Increase stats
        const newMaxVit = scale(def.baseStats.vit);
        const vitGain   = newMaxVit - creature.stats.maxVit;
        creature.stats.maxVit = newMaxVit;
        creature.stats.vit    = Math.min(newMaxVit, creature.stats.vit + vitGain);
        creature.stats.atk    = scale(def.baseStats.atk);
        creature.stats.def    = scale(def.baseStats.def);
        creature.stats.spd    = scale(def.baseStats.spd);
        const newMaxAet = scale(def.baseStats.aet);
        creature.stats.maxAet = newMaxAet;

        notify(`${creature.name} reached Level ${creature.level}!`, 'success');

        // Learn new move if available at this level threshold
        const moveIdx = Math.min(creature.level - 1, def.learnset.length - 1);
        if (moveIdx >= 0) {
            const newMoveId = def.learnset[moveIdx];
            const alreadyKnows = creature.moves.some(m => m.id === newMoveId);
            if (!alreadyKnows && MOVES[newMoveId]) {
                if (creature.moves.length < 4) {
                    creature.moves.push(MOVES[newMoveId]);
                    notify(`${creature.name} learned ${MOVES[newMoveId].name}!`, 'info');
                } else {
                    // Could implement move replacement — for now, skip
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

        const log = document.getElementById('battle-log');
        if (!log) return;

        // Remove old switch list if any
        document.getElementById('switch-list-temp')?.remove();

        const switchDiv = document.createElement('div');
        switchDiv.id = 'switch-list-temp';
        switchDiv.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;padding:8px 0;';

        state.party.forEach((creature, idx) => {
            if (creature === active) return;
            const btn = document.createElement('button');
            btn.className = 'battle-btn';
            btn.style.cssText = 'font-size:0.75rem;padding:6px 10px;';
            const hp = Math.round((creature.stats.vit / creature.stats.maxVit) * 100);
            btn.textContent = `${creature.name} Lv.${creature.level} (${hp}%)`;
            if (creature.stats.vit <= 0) {
                btn.disabled = true;
                btn.style.opacity = '0.4';
            }
            btn.addEventListener('click', () => {
                switchDiv.remove();
                battleState.playerCreature = creature;
                // Show switch log + re-render battle info
                const logEl = document.getElementById('battle-log');
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.textContent = `Go, ${creature.name}!`;
                logEl.appendChild(entry);
                logEl.scrollTop = logEl.scrollHeight;
                // Refresh battle UI
                document.getElementById('player-creature-name').textContent = creature.name + ' Lv.' + creature.level;
                document.getElementById('player-types').innerHTML = creature.types.map(t =>
                    `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
                ).join('');
                document.getElementById('player-sprite-el').className = 'battle-sprite player-sprite ' + creature.spriteClass;
                // Update HP/AET bars
                const pHp = document.getElementById('player-hp-fill');
                const pAet = document.getElementById('player-aet-fill');
                if (pHp) pHp.style.width = Math.max(0, (creature.stats.vit / creature.stats.maxVit) * 100) + '%';
                if (pAet) pAet.style.width = Math.max(0, (creature.stats.aet / creature.stats.maxAet) * 100) + '%';
                // Show action panel
                document.getElementById('action-panel').style.display = 'flex';
            });
            switchDiv.appendChild(btn);
        });

        if (!switchDiv.children.length) {
            const msg = document.createElement('div');
            msg.className = 'log-entry';
            msg.textContent = 'No other usable companions!';
            log.appendChild(msg);
            return;
        }

        log.appendChild(switchDiv);
        log.scrollTop = log.scrollHeight;
    }

    // ── NOTIFICATIONS ────────────────────────────────────────
    function notify(text, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const el = document.createElement('div');
        el.className = `notification notify-${type}`;
        el.textContent = text;
        container.appendChild(el);

        // Trigger animation
        requestAnimationFrame(() => el.classList.add('notify-show'));

        setTimeout(() => {
            el.classList.remove('notify-show');
            el.classList.add('notify-hide');
            setTimeout(() => el.remove(), 500);
        }, 3000);
    }

    // ── SAVE / LOAD ──────────────────────────────────────────
    function saveGame() {
        try {
            const save = {
                party: state.party,
                codex: [...state.codex],
                items: state.items,
                currentRegion: state.currentRegion,
                weather: state.weather,
                unlockedRegions: [...state.unlockedRegions],
                factionRep: state.factionRep,
                flags: state.flags,
                playerName: state.playerName,
            };
            localStorage.setItem('tidebreak_save', JSON.stringify(save));
            notify('Journey saved.', 'success');
        } catch(e) {
            notify('Save failed.', 'warning');
        }
    }

    function loadGame() {
        try {
            const raw = localStorage.getItem('tidebreak_save');
            if (!raw) return false;
            const save = JSON.parse(raw);
            state = DEFAULT_STATE();
            state.party          = save.party || [];
            state.codex          = new Set(save.codex || []);
            state.items          = save.items || state.items;
            state.currentRegion  = save.currentRegion || 'brinefall';
            state.weather        = save.weather || 'CLEAR';
            state.unlockedRegions= new Set(save.unlockedRegions || ['brinefall']);
            state.factionRep     = save.factionRep || state.factionRep;
            state.flags          = save.flags || state.flags;
            state.playerName     = save.playerName || 'Warden';
            state.started        = true;
            return true;
        } catch(e) {
            return false;
        }
    }

    // ── KEYBOARD SHORTCUTS (global) ─────────────────────────
    document.addEventListener('keydown', e => {
        if (!state.started) return;
        if (e.key === 'F5' || (e.ctrlKey && e.key === 's')) {
            e.preventDefault();
            saveGame();
        }
    });

    // ── INIT ON LOAD ─────────────────────────────────────────
    window.addEventListener('DOMContentLoaded', () => {
        // Attempt to continue from save
        const hasSave = loadGame();

        // Title screen is shown by default (first .screen.active in HTML)
        // Update title button if save exists
        if (hasSave) {
            const menu = document.querySelector('.title-menu');
            if (menu) {
                const contBtn = document.createElement('button');
                contBtn.className = 'btn-primary';
                contBtn.textContent = 'CONTINUE';
                contBtn.onclick = () => {
                    showScreen('screen-overworld');
                    OverworldEngine.init();
                };
                menu.insertBefore(contBtn, menu.firstChild);
            }
        }
    });

    // ── PUBLIC API ───────────────────────────────────────────
    return {
        get state() { return state; },

        showScreen,
        closeOverlay,
        startNewGame,
        selectStarter,
        openMenu,
        notify,
        setWeather,
        captureCreature,
        grantExp,
        modFactionRep,
        updatePartyStrip,

        // Expose battle sub-object so HTML onclick="Game.battle.X()" works
        get battle() { return BattleEngine; },

        save: saveGame,
        load: loadGame,
    };
})();
