// ============================================================
//  TIDEBREAK: Legacy of the Storms â€” BATTLE.JS
//  Turn-based battle engine, damage calc, weather, capture
// ============================================================

'use strict';

const BattleEngine = (() => {

    // â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let state = {
        active: false,
        playerCreature: null,
        enemyCreature: null,
        weather: 'CLEAR',
        turnPhase: 'action',    // 'action' | 'move-select' | 'animating' | 'end'
        wildBattle: true,
        canRun: true,
        pendingPlayerMove: null,
        onBattleEnd: null,
    };

    // â”€â”€ STAT STAGE MULTIPLIERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const STAGE_MULT = {
        '-3': 0.50, '-2': 0.60, '-1': 0.75,
        '0': 1.00,
        '1': 1.33, '2': 1.67, '3': 2.00,
    };

    function getStageMult(stages) {
        return STAGE_MULT[String(Math.max(-3, Math.min(3, stages)))];
    }

    // â”€â”€ DAMAGE FORMULA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function calcDamage(attacker, defender, move, weather) {
        if (!move.power || move.power === 0) return { damage: 0, effectiveness: 1 };

        const atk = Math.floor(attacker.stats.atk * getStageMult(attacker.statStages?.atk || 0));
        const def = Math.max(1, Math.floor(defender.stats.def * getStageMult(defender.statStages?.def || 0)));

        let dmg = Math.floor((atk / def) * move.power * 0.4);

        let effectiveness = 1;
        for (const defType of defender.types) {
            const row = TYPE_CHART[move.type];
            if (row && row[defType] !== undefined) effectiveness *= row[defType];
        }
        dmg = Math.floor(dmg * effectiveness);

        if (attacker.types.includes(move.type)) dmg = Math.floor(dmg * 1.5);

        const wDef = WEATHER[weather];
        if (wDef) {
            if (wDef.typeBonus === move.type)   dmg = Math.floor(dmg * 1.5);
            if (wDef.typePenalty === move.type) dmg = Math.floor(dmg * 0.67);
        }

        const variance = 0.9 + Math.random() * 0.2;
        dmg = Math.max(1, Math.floor(dmg * variance));

        return { damage: dmg, effectiveness };
    }

    function effectivenessMsg(eff) {
        if (eff === 0)  return "It has no effect!";
        if (eff >= 2)   return "Super effective!";
        if (eff <= 0.5) return "Not very effective...";
        return null;
    }

    // â”€â”€ APPLY STAT EFFECT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function applyEffect(creature, effect, creatureName) {
        if (!effect) return;
        if (effect.stat && effect.target) {
            const chance = effect.chance !== undefined ? effect.chance : 1;
            if (Math.random() <= chance) {
                creature.statStages = creature.statStages || {};
                creature.statStages[effect.stat] = Math.max(-3, Math.min(3,
                    (creature.statStages[effect.stat] || 0) + effect.stages));
                const dir = effect.stages > 0 ? 'rose' : 'fell';
                statusMsg(`${creatureName}'s ${effect.stat.toUpperCase()} ${dir}!`);
            }
        }
        if (effect.heal) {
            const healAmt = Math.floor(creature.stats.maxVit * effect.heal);
            creature.stats.vit = Math.min(creature.stats.maxVit, creature.stats.vit + healAmt);
            statusMsg(`${creatureName} restored ${healAmt} VIT!`);
        }
    }

    // â”€â”€ STATUS MESSAGE (large, replaces previous) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function statusMsg(text) {
        if (typeof Game !== 'undefined' && Game.setBattleStatus) {
            Game.setBattleStatus(text);
        }
    }

    // â”€â”€ HP BAR UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function updateHpBars() {
        const eHp = document.getElementById('enemy-hp-fill');
        const pHp = document.getElementById('player-hp-fill');
        const pAet = document.getElementById('player-aet-fill');

        if (eHp && state.enemyCreature) {
            const pct = Math.max(0, (state.enemyCreature.stats.vit / state.enemyCreature.stats.maxVit) * 100);
            eHp.style.width = pct + '%';
            eHp.style.backgroundColor = pct < 25 ? '#e05555' : pct < 50 ? '#e0a855' : '#55c3a8';
        }
        if (pHp && state.playerCreature) {
            const pct = Math.max(0, (state.playerCreature.stats.vit / state.playerCreature.stats.maxVit) * 100);
            pHp.style.width = pct + '%';
            pHp.style.backgroundColor = pct < 25 ? '#e05555' : pct < 50 ? '#e0a855' : '#55c3a8';
        }
        if (pAet && state.playerCreature) {
            const pct = Math.max(0, (state.playerCreature.stats.aet / state.playerCreature.stats.maxAet) * 100);
            pAet.style.width = pct + '%';
        }
    }

    // â”€â”€ DRAW CREATURE ON BATTLE CANVAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function drawCreatureSprite(canvasId, defId, flip) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (flip) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        if (typeof OverworldEngine !== 'undefined' && OverworldEngine.drawSprite) {
            OverworldEngine.drawSprite(ctx, defId, 0, 0, canvas.width);
        }

        if (flip) ctx.restore();
    }

    // â”€â”€ RENDER CREATURE INFO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function renderCreatureInfo() {
        if (!state.enemyCreature || !state.playerCreature) return;

        document.getElementById('enemy-name').textContent =
            state.enemyCreature.name + ' Lv.' + state.enemyCreature.level;
        document.getElementById('enemy-types').innerHTML = state.enemyCreature.types.map(t =>
            `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
        ).join('');

        document.getElementById('player-creature-name').textContent =
            state.playerCreature.name + ' Lv.' + state.playerCreature.level;
        document.getElementById('player-types').innerHTML = state.playerCreature.types.map(t =>
            `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
        ).join('');

        // Draw canvas sprites â€” enemy faces left (flipped), player faces right
        drawCreatureSprite('enemy-sprite-el', state.enemyCreature.defId, true);
        drawCreatureSprite('player-sprite-el', state.playerCreature.defId, false);

        updateHpBars();
    }

    function showActionPanel() {
        document.getElementById('action-panel').style.display = 'flex';
        document.getElementById('move-panel').style.display = 'none';
        state.turnPhase = 'action';
    }

    function updateBattleWeather() {
        const wDef = WEATHER[state.weather];
        const layerEl = document.getElementById('battle-weather-layer');
        if (layerEl && wDef) {
            layerEl.className = 'weather-layer';
            if (wDef.class) layerEl.classList.add(wDef.class);
        }
    }

    // â”€â”€ PERFORM A MOVE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function performMove(attacker, defender, move, attackerName, defenderName, callback) {
        state.turnPhase = 'animating';

        if (move.aetCost > 0 && attacker.stats.aet < move.aetCost) {
            statusMsg(`${attackerName} is too drained for ${move.name}!`);
            setTimeout(callback, 800);
            return;
        }

        const accuracy = move.accuracy !== undefined ? move.accuracy : 95;
        if (Math.random() * 100 > accuracy) {
            statusMsg(`${attackerName} used ${move.name}... missed!`);
            if (move.aetCost > 0) attacker.stats.aet = Math.max(0, attacker.stats.aet - Math.floor(move.aetCost * 0.5));
            setTimeout(callback, 900);
            return;
        }

        attacker.stats.aet = Math.max(0, attacker.stats.aet - move.aetCost);
        statusMsg(`${attackerName} used ${move.name}!`);
        if (typeof Game !== 'undefined') Game.playSound('select');

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

            const effMsg = effectivenessMsg(effectiveness);
            if (effMsg) {
                setTimeout(() => statusMsg(effMsg), 400);
            } else {
                setTimeout(() => statusMsg(`Dealt ${damage} damage!`), 400);
            }
            delay = 900;
        }

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

    // â”€â”€ ENEMY AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function enemyPickMove() {
        const enemy = state.enemyCreature;
        const affordable = enemy.moves.filter(m => m.aetCost <= enemy.stats.aet);
        if (affordable.length === 0) return enemy.moves[0];

        const scored = affordable.map(m => {
            let score = m.power || 10;
            if (enemy.types.includes(m.type)) score *= 1.3;
            const wDef = WEATHER[state.weather];
            if (wDef && wDef.typeBonus === m.type) score *= 1.4;
            let eff = 1;
            for (const pt of state.playerCreature.types) {
                const row = TYPE_CHART[m.type];
                if (row && row[pt] !== undefined) eff *= row[pt];
            }
            score *= eff;
            return { move: m, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, Math.min(2, scored.length));
        return top[Math.floor(Math.random() * top.length)].move;
    }

    // â”€â”€ TURN RESOLUTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function resolveTurn(playerMove) {
        state.turnPhase = 'animating';
        document.getElementById('action-panel').style.display = 'none';
        document.getElementById('move-panel').style.display = 'none';

        const enemyMove = enemyPickMove();
        const player = state.playerCreature;
        const enemy  = state.enemyCreature;
        const playerSpd = Math.floor(player.stats.spd * getStageMult(player.statStages?.spd || 0));
        const enemySpd  = Math.floor(enemy.stats.spd  * getStageMult(enemy.statStages?.spd || 0));
        const playerFirst = playerSpd >= enemySpd;

        function checkFaint(callback) {
            if (enemy.stats.vit <= 0) {
                statusMsg(`${enemy.name} has fainted!`);
                setTimeout(() => endBattle('win'), 1000);
                return;
            }
            if (player.stats.vit <= 0) {
                statusMsg(`${player.name} has fainted!`);
                // Check if any other party member can fight
                const nextAlive = Game.state.party.find(c => c !== player && c.stats.vit > 0);
                if (nextAlive) {
                    setTimeout(() => Game.showBattleSwitchPanel(true), 900);
                } else {
                    setTimeout(() => endBattle('lose'), 1000);
                }
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

    // â”€â”€ CAPTURE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function attemptCapture() {
        const enemy = state.enemyCreature;
        if (!state.wildBattle) { statusMsg("Can't capture a trainer's creature!"); showActionPanel(); return; }
        if (enemy.catchRate <= 0) { statusMsg(`${enemy.name} cannot be captured...`); showActionPanel(); return; }

        const orbCount = Game.state.items['tide_orb'] || 0;
        if (orbCount <= 0) { statusMsg('You have no Tide Orbs!'); showActionPanel(); return; }
        Game.state.items['tide_orb']--;

        const hpFactor = 1 - (0.65 * enemy.stats.vit / enemy.stats.maxVit);
        const captureChance = enemy.catchRate * hpFactor;
        const roll = Math.random();

        statusMsg('The Tide Orb pulses...');

        const spriteEl = document.getElementById('enemy-sprite-el');
        if (spriteEl) spriteEl.classList.add('capture-pulse');

        setTimeout(() => {
            if (spriteEl) spriteEl.classList.remove('capture-pulse');

            if (roll < captureChance) {
                statusMsg(`${enemy.name} was bonded!`);
                Game.captureCreature(enemy);
                setTimeout(() => endBattle('capture'), 1200);
            } else {
                statusMsg(`${enemy.name} broke free!`);
                performMove(enemy, state.playerCreature, enemyPickMove(),
                    enemy.name, state.playerCreature.name, () => {
                        if (state.playerCreature.stats.vit <= 0) {
                            statusMsg(`${state.playerCreature.name} has fainted!`);
                            const nextAlive = Game.state.party.find(c => c !== state.playerCreature && c.stats.vit > 0);
                            if (nextAlive) {
                                setTimeout(() => Game.showBattleSwitchPanel(true), 900);
                            } else {
                                setTimeout(() => endBattle('lose'), 900);
                            }
                        } else {
                            showActionPanel();
                        }
                    });
            }
        }, 1800);
    }

    // â”€â”€ END BATTLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function endBattle(result) {
        state.active = false;
        state.turnPhase = 'end';

        if (result === 'win') {
            const xp = Math.floor(state.enemyCreature.level * 12 + 8);
            statusMsg(`Victory! Gained ${xp} EXP.`);
            Game.grantExp(state.playerCreature, xp);
            Game.playSound('levelup');
        }

        const cb = state.onBattleEnd;
        setTimeout(() => {
            Game.showScreen('screen-overworld');
            if (cb) cb(result);
        }, 1600);
    }

    // â”€â”€ PUBLIC API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return {

        startBattle(playerCreature, enemyCreature, options = {}) {
            state.active = true;
            state.playerCreature = playerCreature;
            state.enemyCreature = enemyCreature;
            state.weather = options.weather || Game.state.weather || 'CLEAR';
            state.wildBattle = options.wildBattle !== false;
            state.canRun = options.canRun !== false;
            state.onBattleEnd = options.onBattleEnd || null;

            Game.showScreen('screen-battle');
            Game.playSound('encounter');

            // Slight delay so screen transition completes before drawing
            setTimeout(() => {
                renderCreatureInfo();
                updateBattleWeather();

                const bg = REGIONS[Game.state.currentRegion]?.bgClass || 'bg-coastal';
                const bgEl = document.getElementById('battle-bg');
                if (bgEl) bgEl.className = 'battle-bg ' + bg;

                statusMsg(`A wild ${enemyCreature.name} appeared!`);
                showActionPanel();
            }, 300);
        },

        showMoves() {
            if (state.turnPhase !== 'action') return;
            Game.playSound('select');
            const panel = document.getElementById('move-panel');
            const grid  = document.getElementById('move-grid');
            if (!panel || !grid) return;

            grid.innerHTML = '';
            state.playerCreature.moves.forEach(move => {
                const btn = document.createElement('button');
                btn.className = 'move-btn';
                btn.innerHTML = `<span class="move-name">${move.name}</span>
                    <span class="move-meta type-${move.type.toLowerCase()}">${move.type} | PWR ${move.power || 'â€”'} | AET ${move.aetCost}</span>`;

                if (move.aetCost > state.playerCreature.stats.aet) btn.classList.add('move-disabled');

                btn.addEventListener('mouseenter', () => {
                    document.getElementById('move-desc').textContent = move.description || '';
                    const wBonus = document.getElementById('weather-bonus');
                    const wDef = WEATHER[state.weather];
                    if (wDef && wDef.typeBonus === move.type) {
                        wBonus.textContent = `âš¡ BOOSTED by ${wDef.label}`;
                        wBonus.classList.remove('hidden');
                    } else if (wDef && wDef.typePenalty === move.type) {
                        wBonus.textContent = `â¬‡ WEAKENED by ${wDef.label}`;
                        wBonus.classList.remove('hidden');
                    } else {
                        wBonus.classList.add('hidden');
                    }
                });

                btn.addEventListener('click', () => {
                    if (move.aetCost > state.playerCreature.stats.aet) {
                        statusMsg('Not enough AET!');
                        return;
                    }
                    Game.playSound('select');
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

        openSwitch() {
            if (state.turnPhase !== 'action') return;
            Game.playSound('select');
            const others = Game.state.party.filter(c => c !== state.playerCreature && c.stats.vit > 0);
            if (others.length === 0) { statusMsg('No other usable companions!'); return; }
            Game.showBattleSwitchPanel(false);
        },

        // Called by game.js execBattleSwitch after a forced (faint) switch
        resumeAfterForcedSwitch() {
            const player = state.playerCreature;
            const enemy  = state.enemyCreature;
            const move   = enemyPickMove();
            statusMsg(`${enemy.name} attacks!`);
            performMove(enemy, player, move, enemy.name, player.name, () => {
                if (player.stats.vit <= 0) {
                    statusMsg(`${player.name} has fainted!`);
                    const nextAlive = Game.state.party.find(c => c !== player && c.stats.vit > 0);
                    if (nextAlive) {
                        setTimeout(() => Game.showBattleSwitchPanel(true), 900);
                    } else {
                        setTimeout(() => endBattle('lose'), 1000);
                    }
                } else {
                    showActionPanel();
                }
            });
        },

        tryCatch() {
            if (state.turnPhase !== 'action') return;
            attemptCapture();
        },

        runAway() {
            if (state.turnPhase !== 'action') return;
            if (!state.canRun) { statusMsg("Can't escape!"); return; }
            Game.playSound('back');
            statusMsg('Got away safely!');
            setTimeout(() => endBattle('run'), 800);
        },

        getState() { return state; },
        isActive()  { return state.active; },
    };
})();
