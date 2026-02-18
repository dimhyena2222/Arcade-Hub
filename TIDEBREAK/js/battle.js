// ============================================================
//  TIDEBREAK: Legacy of the Storms — BATTLE.JS
//  Turn-based battle engine, damage calc, weather, capture
// ============================================================

'use strict';

const BattleEngine = (() => {

    // ── STATE ──────────────────────────────────────────────────
    let state = {
        active: false,
        playerCreature: null,   // live creature instance
        enemyCreature: null,    // live creature instance
        weather: 'CLEAR',
        turnPhase: 'action',    // 'action' | 'move-select' | 'switch' | 'animating' | 'end'
        wildBattle: true,
        canRun: true,
        pendingPlayerMove: null,
        logQueue: [],
        onBattleEnd: null,      // callback(result) — result: 'win'|'lose'|'run'|'capture'
    };

    // ── STAT STAGE MULTIPLIERS ──────────────────────────────────
    const STAGE_MULT = {
        '-3': 0.50, '-2': 0.60, '-1': 0.75,
        '0': 1.00,
        '1': 1.33, '2': 1.67, '3': 2.00,
    };

    function getStageMult(stages) {
        const clamped = Math.max(-3, Math.min(3, stages));
        return STAGE_MULT[String(clamped)];
    }

    // ── DAMAGE FORMULA ──────────────────────────────────────────
    function calcDamage(attacker, defender, move, weather) {
        if (!move.power || move.power === 0) return 0;

        const atk = Math.floor(attacker.stats.atk * getStageMult(attacker.statStages.atk));
        const def = Math.max(1, Math.floor(defender.stats.def * getStageMult(defender.statStages.def)));

        // Base damage: (ATK / DEF) * Power * 0.4 + small random variance
        let dmg = Math.floor((atk / def) * move.power * 0.4);

        // Type effectiveness (multi-type defender: multiply all)
        let effectiveness = 1;
        for (const defType of defender.types) {
            const row = TYPE_CHART[move.type];
            if (row && row[defType] !== undefined) {
                effectiveness *= row[defType];
            }
        }
        dmg = Math.floor(dmg * effectiveness);

        // STAB (Same-Type Attack Bonus)
        if (attacker.types.includes(move.type)) {
            dmg = Math.floor(dmg * 1.5);
        }

        // Weather bonus/penalty
        const wDef = WEATHER[weather];
        if (wDef) {
            if (wDef.typeBonus === move.type)    dmg = Math.floor(dmg * 1.5);
            if (wDef.typePenalty === move.type)  dmg = Math.floor(dmg * 0.67);
        }

        // Random variance ±10%
        const variance = 0.9 + Math.random() * 0.2;
        dmg = Math.max(1, Math.floor(dmg * variance));

        return { damage: dmg, effectiveness };
    }

    // ── EFFECTIVENESS MESSAGE ────────────────────────────────────
    function effectivenessMsg(eff) {
        if (eff === 0)    return "It has no effect!";
        if (eff >= 2)     return "It's super effective!";
        if (eff <= 0.5)   return "It's not very effective...";
        return null;
    }

    // ── APPLY STAT STAGE EFFECT ──────────────────────────────────
    function applyEffect(creature, effect, creatureName) {
        if (!effect) return;

        if (effect.stat && effect.target) {
            const chance = effect.chance !== undefined ? effect.chance : 1;
            if (Math.random() <= chance) {
                creature.statStages[effect.stat] = Math.max(-3, Math.min(3,
                    (creature.statStages[effect.stat] || 0) + effect.stages));
                const dir = effect.stages > 0 ? 'rose' : 'fell';
                appendLog(`${creatureName}'s ${effect.stat.toUpperCase()} ${dir}!`);
            }
        }

        if (effect.heal) {
            const healAmt = Math.floor(creature.stats.maxVit * effect.heal);
            creature.stats.vit = Math.min(creature.stats.maxVit, creature.stats.vit + healAmt);
            appendLog(`${creatureName} restored ${healAmt} VIT!`);
        }
    }

    // ── LOG SYSTEM ───────────────────────────────────────────────
    function appendLog(text) {
        const log = document.getElementById('battle-log');
        if (!log) return;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = text;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    function clearLog() {
        const log = document.getElementById('battle-log');
        if (log) log.innerHTML = '';
    }

    // ── UI HELPERS ───────────────────────────────────────────────
    function updateHpBars() {
        const eHp = document.getElementById('enemy-hp-fill');
        const pHp = document.getElementById('player-hp-fill');
        const pAet = document.getElementById('player-aet-fill');

        if (eHp) {
            const pct = Math.max(0, (state.enemyCreature.stats.vit / state.enemyCreature.stats.maxVit) * 100);
            eHp.style.width = pct + '%';
            eHp.style.backgroundColor = pct < 25 ? '#e05555' : pct < 50 ? '#e0a855' : '#55c3a8';
        }
        if (pHp) {
            const pct = Math.max(0, (state.playerCreature.stats.vit / state.playerCreature.stats.maxVit) * 100);
            pHp.style.width = pct + '%';
            pHp.style.backgroundColor = pct < 25 ? '#e05555' : pct < 50 ? '#e0a855' : '#55c3a8';
        }
        if (pAet) {
            const pct = Math.max(0, (state.playerCreature.stats.aet / state.playerCreature.stats.maxAet) * 100);
            pAet.style.width = pct + '%';
        }
    }

    function renderCreatureInfo() {
        // Enemy
        document.getElementById('enemy-name').textContent = state.enemyCreature.name + ' Lv.' + state.enemyCreature.level;
        const eTypes = document.getElementById('enemy-types');
        eTypes.innerHTML = state.enemyCreature.types.map(t =>
            `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
        ).join('');

        // Player
        document.getElementById('player-creature-name').textContent = state.playerCreature.name + ' Lv.' + state.playerCreature.level;
        const pTypes = document.getElementById('player-types');
        pTypes.innerHTML = state.playerCreature.types.map(t =>
            `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
        ).join('');

        // Sprites
        const eSprite = document.getElementById('enemy-sprite-el');
        const pSprite = document.getElementById('player-sprite-el');
        if (eSprite) eSprite.className = 'battle-sprite enemy-sprite ' + (state.enemyCreature.spriteClass || '');
        if (pSprite) pSprite.className = 'battle-sprite player-sprite ' + (state.playerCreature.spriteClass || '');

        updateHpBars();
    }

    function showActionPanel() {
        document.getElementById('action-panel').style.display = 'flex';
        document.getElementById('move-panel').style.display = 'none';
        state.turnPhase = 'action';
    }

    function showWeatherBanner(text) {
        const banner = document.getElementById('weather-banner');
        if (!banner) return;
        banner.textContent = text;
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 2800);
    }

    function updateBattleWeather() {
        const wDef = WEATHER[state.weather];
        const bannerEl = document.getElementById('weather-banner');
        const weatherLayerEl = document.getElementById('battle-weather-layer');
        const hudWeatherEl = document.getElementById('hud-weather');
        if (wDef) {
            if (weatherLayerEl) {
                weatherLayerEl.className = 'weather-layer';
                if (wDef.class) weatherLayerEl.classList.add(wDef.class);
            }
            if (hudWeatherEl) hudWeatherEl.textContent = wDef.label;
        }
    }

    // ── PERFORM A MOVE ───────────────────────────────────────────
    function performMove(attacker, defender, move, attackerName, defenderName, callback) {
        state.turnPhase = 'animating';

        // AET check
        if (move.aetCost > 0 && attacker.stats.aet < move.aetCost) {
            appendLog(`${attackerName} doesn't have enough AET for ${move.name}!`);
            setTimeout(callback, 800);
            return;
        }

        // Accuracy check
        const accuracy = move.accuracy !== undefined ? move.accuracy : 95;
        if (Math.random() * 100 > accuracy) {
            appendLog(`${attackerName} used ${move.name}... but it missed!`);
            if (move.aetCost > 0) attacker.stats.aet = Math.max(0, attacker.stats.aet - Math.floor(move.aetCost * 0.5));
            setTimeout(callback, 900);
            return;
        }

        // Deduct AET
        attacker.stats.aet = Math.max(0, attacker.stats.aet - move.aetCost);

        appendLog(`${attackerName} used ${move.name}!`);

        // Flash the defender's sprite
        const isEnemy = defenderName === state.enemyCreature.name;
        const spriteId = isEnemy ? 'enemy-sprite-el' : 'player-sprite-el';
        const spriteEl = document.getElementById(spriteId);
        if (spriteEl) {
            spriteEl.classList.add('hit-flash');
            setTimeout(() => spriteEl.classList.remove('hit-flash'), 500);
        }

        let delay = 700;

        if (move.power && move.power > 0) {
            const { damage, effectiveness } = calcDamage(attacker, defender, move, state.weather);
            defender.stats.vit = Math.max(0, defender.stats.vit - damage);
            updateHpBars();
            appendLog(`Dealt ${damage} damage.`);

            const effMsg = effectivenessMsg(effectiveness);
            if (effMsg) appendLog(effMsg);

            delay = 900;
        }

        // Apply secondary effects
        if (move.effect) {
            const target = move.effect.target === 'self' ? attacker : defender;
            const tName  = move.effect.target === 'self' ? attackerName : defenderName;
            setTimeout(() => applyEffect(target, move.effect, tName), delay);
            delay += 700;
        }

        setTimeout(() => {
            updateHpBars();
            callback();
        }, delay);
    }

    // ── ENEMY AI PICK ────────────────────────────────────────────
    function enemyPickMove() {
        const enemy = state.enemyCreature;
        const affordable = enemy.moves.filter(m => m.aetCost <= enemy.stats.aet);
        if (affordable.length === 0) return enemy.moves[0];   // desperation

        // Simple AI: prefer moves with power, weight by type effectiveness + weather
        const scored = affordable.map(m => {
            let score = m.power || 10;
            // STAB
            if (enemy.types.includes(m.type)) score *= 1.3;
            // Weather bonus
            const wDef = WEATHER[state.weather];
            if (wDef && wDef.typeBonus === m.type) score *= 1.4;
            // Type effectiveness vs player
            let eff = 1;
            for (const pt of state.playerCreature.types) {
                const row = TYPE_CHART[m.type];
                if (row && row[pt] !== undefined) eff *= row[pt];
            }
            score *= eff;
            return { move: m, score };
        });

        scored.sort((a, b) => b.score - a.score);
        // Top pick with small random noise
        const top = scored.slice(0, Math.min(2, scored.length));
        return top[Math.floor(Math.random() * top.length)].move;
    }

    // ── TURN RESOLUTION ──────────────────────────────────────────
    function resolveTurn(playerMove) {
        state.turnPhase = 'animating';
        document.getElementById('action-panel').style.display = 'none';
        document.getElementById('move-panel').style.display = 'none';

        const enemyMove = enemyPickMove();
        const player = state.playerCreature;
        const enemy = state.enemyCreature;
        const playerSpd = Math.floor(player.stats.spd * getStageMult(player.statStages.spd));
        const enemySpd  = Math.floor(enemy.stats.spd  * getStageMult(enemy.statStages.spd));

        const playerFirst = playerSpd >= enemySpd;

        function checkFaint(callback) {
            if (enemy.stats.vit <= 0) {
                appendLog(`${enemy.name} has fainted!`);
                setTimeout(() => endBattle('win'), 900);
                return;
            }
            if (player.stats.vit <= 0) {
                appendLog(`${player.name} has fainted!`);
                setTimeout(() => endBattle('lose'), 900);
                return;
            }
            callback();
        }

        if (playerFirst) {
            performMove(player, enemy, playerMove, player.name, enemy.name, () => {
                checkFaint(() => {
                    performMove(enemy, player, enemyMove, enemy.name, player.name, () => {
                        checkFaint(() => showActionPanel());
                    });
                });
            });
        } else {
            performMove(enemy, player, enemyMove, enemy.name, player.name, () => {
                checkFaint(() => {
                    performMove(player, enemy, playerMove, player.name, enemy.name, () => {
                        checkFaint(() => showActionPanel());
                    });
                });
            });
        }
    }

    // ── CAPTURE ATTEMPT ──────────────────────────────────────────
    function attemptCapture() {
        const enemy = state.enemyCreature;

        if (!state.wildBattle) {
            appendLog('You can\'t capture a trainer\'s creature!');
            showActionPanel();
            return;
        }
        if (enemy.catchRate <= 0) {
            appendLog(`${enemy.name} cannot be captured...`);
            showActionPanel();
            return;
        }

        // Check Tide Orb count
        const orbCount = Game.state.items['tide_orb'] || 0;
        if (orbCount <= 0) {
            appendLog('You have no Tide Orbs!');
            showActionPanel();
            return;
        }
        Game.state.items['tide_orb']--;

        const hpFactor = 1 - (0.65 * enemy.stats.vit / enemy.stats.maxVit); // lower HP = easier
        const captureChance = enemy.catchRate * hpFactor;
        const roll = Math.random();

        appendLog(`The Tide Orb pulses...`);

        // Animate the capture attempt (3 shakes visual)
        const spriteEl = document.getElementById('enemy-sprite-el');
        if (spriteEl) spriteEl.classList.add('capture-pulse');

        setTimeout(() => {
            if (spriteEl) spriteEl.classList.remove('capture-pulse');

            if (roll < captureChance) {
                appendLog(`${enemy.name} was bonded!`);
                Game.captureCreature(enemy);
                setTimeout(() => endBattle('capture'), 1200);
            } else {
                appendLog(`${enemy.name} broke free!`);
                // Enemy gets a free attack
                performMove(enemy, state.playerCreature, enemyPickMove(),
                    enemy.name, state.playerCreature.name, () => {
                        if (state.playerCreature.stats.vit <= 0) {
                            appendLog(`${state.playerCreature.name} has fainted!`);
                            setTimeout(() => endBattle('lose'), 900);
                        } else {
                            showActionPanel();
                        }
                    });
            }
        }, 1800);
    }

    // ── END BATTLE ───────────────────────────────────────────────
    function endBattle(result) {
        state.active = false;
        state.turnPhase = 'end';

        if (result === 'win') {
            const xpGained = Math.floor(state.enemyCreature.level * 12 + 8);
            appendLog(`Victory! Gained ${xpGained} experience.`);
            Game.grantExp(state.playerCreature, xpGained);
        }

        const cb = state.onBattleEnd;
        setTimeout(() => {
            Game.showScreen('screen-overworld');
            if (cb) cb(result);
        }, 1500);
    }

    // ── PUBLIC API ───────────────────────────────────────────────
    return {

        // Called by Game when a battle should start
        startBattle(playerCreature, enemyCreature, options = {}) {
            state.active = true;
            state.playerCreature = playerCreature;
            state.enemyCreature = enemyCreature;
            state.weather = options.weather || Game.state.weather || 'CLEAR';
            state.wildBattle = options.wildBattle !== false;
            state.canRun = options.canRun !== false;
            state.onBattleEnd = options.onBattleEnd || null;

            Game.showScreen('screen-battle');
            clearLog();
            renderCreatureInfo();
            updateBattleWeather();

            const bg = REGIONS[Game.state.currentRegion]?.bgClass || 'bg-coastal';
            const bgEl = document.getElementById('battle-bg');
            if (bgEl) bgEl.className = 'battle-bg ' + bg;

            appendLog(`A wild ${enemyCreature.name} appeared!`);
            showActionPanel();
        },

        // Move selection button — show the move grid
        showMoves() {
            if (state.turnPhase !== 'action') return;
            const panel = document.getElementById('move-panel');
            const grid  = document.getElementById('move-grid');
            if (!panel || !grid) return;

            grid.innerHTML = '';
            state.playerCreature.moves.forEach(move => {
                const btn = document.createElement('button');
                btn.className = 'move-btn type-' + move.type.toLowerCase();
                btn.innerHTML = `<span class="move-name">${move.name}</span>
                    <span class="move-meta">${move.type} | PWR ${move.power || '—'} | AET ${move.aetCost}</span>`;

                // Dim if not enough AET
                if (move.aetCost > state.playerCreature.stats.aet) btn.classList.add('move-disabled');

                btn.addEventListener('mouseenter', () => {
                    document.getElementById('move-desc').textContent = move.description || '';
                    const wBonus = document.getElementById('weather-bonus');
                    const wDef = WEATHER[state.weather];
                    if (wDef && move.weatherBonus === state.weather) {
                        wBonus.textContent = `⚡ BOOSTED by ${wDef.label}`;
                        wBonus.classList.remove('hidden');
                    } else if (wDef && wDef.typePenalty === move.type) {
                        wBonus.textContent = `⬇ WEAKENED by ${wDef.label}`;
                        wBonus.classList.remove('hidden');
                    } else {
                        wBonus.classList.add('hidden');
                    }
                });

                btn.addEventListener('click', () => {
                    if (move.aetCost > state.playerCreature.stats.aet) {
                        appendLog('Not enough AET!');
                        return;
                    }
                    document.getElementById('action-panel').style.display = 'none';
                    panel.style.display = 'none';
                    resolveTurn(move);
                });

                grid.appendChild(btn);
            });

            document.getElementById('action-panel').style.display = 'none';
            panel.style.display = 'flex';
            state.turnPhase = 'move-select';
        },

        // Open switch party UI
        openSwitch() {
            if (state.turnPhase !== 'action') return;
            const party = Game.state.party;
            if (party.length <= 1) {
                appendLog('No other creatures to switch to!');
                return;
            }
            Game.openMenu('switch-battle');
        },

        // Try to capture the wild creature
        tryCatch() {
            if (state.turnPhase !== 'action') return;
            attemptCapture();
        },

        // Attempt to run
        runAway() {
            if (state.turnPhase !== 'action') return;
            if (!state.canRun) {
                appendLog('Can\'t escape!');
                return;
            }
            appendLog('Got away safely!');
            setTimeout(() => endBattle('run'), 800);
        },

        getState() { return state; },

        isActive() { return state.active; },
    };
})();
