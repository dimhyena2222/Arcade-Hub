// ============================================================
//  UI  –  HUD, Menus, Title Screen, Game Over, Win Screen
// ============================================================
const UI = (() => {
  // ── Pixel font alias (canvas built-in) ───────────────────
  const FONT_SM  = "bold 11px 'Courier New', monospace";
  const FONT_MED = "bold 14px 'Courier New', monospace";
  const FONT_LG  = "bold 20px 'Courier New', monospace";
  const FONT_XL  = "bold 32px 'Courier New', monospace";
  const FONT_TTL = "bold 52px 'Courier New', monospace";

  let menuIndex = 0;
  let settingsIndex = 0;
  let inSettings = false;
  let menuAnim = 0;

  // ── Helpers ───────────────────────────────────────────────
  function text(ctx, str, x, y, color, font = FONT_MED, align = 'left') {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function glowText(ctx, str, x, y, color, glow, font = FONT_MED, align = 'center') {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = glow;
    ctx.fillStyle   = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function bar(ctx, x, y, w, h, fill, bg = '#1a1a1a', border = '#444') {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * fill !== fill ? fill : w - 2), h - 2);
    ctx.strokeStyle = border;
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, w, h);
  }

  function hpBar(ctx, x, y, w, h, ratio) {
    // Background
    ctx.fillStyle = '#1a0800';
    ctx.fillRect(x, y, w, h);
    // Fill gradient based on health
    const col = ratio > 0.5 ? '#ff8c00' : ratio > 0.25 ? '#ffaa00' : '#ff2200';
    ctx.save();
    ctx.shadowBlur  = ratio > 0.25 ? 6 : 12;
    ctx.shadowColor = col;
    ctx.fillStyle   = col;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * ratio), h - 2);
    ctx.restore();
    // Border
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, w, h);
    // Tick marks
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(x + (w * i / 4), y, 1, h);
    }
  }

  function energyBar(ctx, x, y, w, h, ratio) {
    ctx.fillStyle = '#000a14';
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.shadowBlur  = 6;
    ctx.shadowColor = '#ff8c00';
    ctx.fillStyle   = `rgba(255,140,0,${0.7 + ratio * 0.3})`;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * ratio), h - 2);
    ctx.restore();
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, w, h);
  }

  // ── MAIN HUD ─────────────────────────────────────────────
  function drawHUD(ctx, player, score, timer, currentSection) {
    const hp  = player.hp / player.maxHp;
    const en  = player.energy / player.maxEnergy;

    // ── TOP LEFT panel ───────────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(8, 8, 180, 56);
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth   = 1;
    ctx.strokeRect(8, 8, 180, 56);
    ctx.restore();

    // ICARUS label
    glowText(ctx, 'ICARUS', 18, 22, '#ff8c00', '#ff8c00', FONT_SM, 'left');

    // HP bar
    text(ctx, 'HP', 18, 36, '#cc9966', FONT_SM);
    hpBar(ctx, 36, 27, 140, 10, hp);

    // Energy label + bar
    text(ctx, 'EN', 18, 52, '#cc9966', FONT_SM);
    energyBar(ctx, 36, 43, 140, 10, en);

    // Sword charge progress (if charging)
    if (player.isCharging && player.swordCharge > 0) {
      const cr = Math.min(1, player.swordCharge / player.SWORD_CHARGE_MAX);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle   = '#000';
      ctx.fillRect(8, 68, 180, 14);
      ctx.shadowBlur  = cr > 0.8 ? 12 : 4;
      ctx.shadowColor = '#ff8c00';
      ctx.fillStyle   = cr >= 1 ? '#ffffff' : '#ff8c00';
      ctx.fillRect(9, 69, Math.round(178 * cr), 12);
      glowText(ctx, cr >= 1 ? 'CHARGED!' : 'CHARGING...', 98, 79, cr >= 1 ? '#fff' : '#ff8c00', '#ff4400', FONT_SM, 'center');
      ctx.restore();
    }

    // ── TOP RIGHT: Timer + Score ──────────────────────────
    const minutes = Math.floor(timer / 60000);
    const seconds = Math.floor((timer % 60000) / 1000);
    const ms      = Math.floor((timer % 1000) / 10);
    const timeStr = `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(614, 8, 178, 56);
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth   = 1;
    ctx.strokeRect(614, 8, 178, 56);
    ctx.restore();

    glowText(ctx, timeStr, 703, 28, '#88ccff', '#88ccff', FONT_MED, 'center');
    text(ctx, `SCORE`, 622, 44, '#556677', FONT_SM);
    glowText(ctx, score.toString().padStart(7, '0'), 703, 56, '#aaccee', '#4488aa', FONT_MED, 'center');

    // Section indicator
    const sectionNames = ['OUTER RAMPARTS', 'ENERGY LAYER', 'CORE SHAFT', 'SUNFORGE CORE'];
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle   = '#000';
    ctx.fillRect(298, 8, 204, 20);
    ctx.restore();
    glowText(ctx, sectionNames[Math.min(3, currentSection)], 400, 22, '#aabb88', '#668844', FONT_SM, 'center');
  }

  // ── BOSS HP BAR (full-width bottom) ───────────────────────
  function drawBossBar(ctx, boss) {
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    const bw    = 600, bx = 100, by = 570;

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle   = '#000';
    ctx.fillRect(bx - 6, by - 20, bw + 12, 36);
    ctx.strokeStyle = '#ff4400';
    ctx.lineWidth   = 1;
    ctx.strokeRect(bx - 6, by - 20, bw + 12, 36);
    ctx.restore();

    // Bar background
    ctx.fillStyle = '#200';
    ctx.fillRect(bx, by, bw, 14);
    // Fill
    const col = boss.phase >= 3 ? '#ff2200' : boss.phase >= 2 ? '#ff6600' : '#ffaa00';
    ctx.save();
    ctx.shadowBlur  = 10;
    ctx.shadowColor = col;
    ctx.fillStyle   = col;
    ctx.fillRect(bx, by, Math.max(0, bw * ratio), 14);
    ctx.restore();
    // Phase dividers
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let p = 1; p < 4; p++) {
      ctx.fillRect(bx + bw * (p / 4) - 1, by, 2, 14);
    }
    // Border
    ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, 14);

    // Boss name
    glowText(ctx, boss.bossName, 400, by - 4, '#ffaa44', '#ff4400', FONT_SM, 'center');
    // Phase indicator
    if (boss.phase > 1) {
      glowText(ctx, `PHASE ${boss.phase}`, 400, by + 28, '#ff4400', '#ff2200', FONT_SM, 'center');
    }
  }

  // ── MAIN MENU ─────────────────────────────────────────────
  const MAIN_ITEMS  = ['START GAME', 'SETTINGS', 'CONTROLS', 'ARCADE HUB'];
  const PAUSE_ITEMS = ['RESUME', 'SETTINGS', 'CONTROLS', 'RESTART', 'QUIT', 'ARCADE HUB'];

  function drawMenu(ctx, dt, isPause = false) {
    menuAnim += dt * 0.001;
    const items = isPause ? PAUSE_ITEMS : MAIN_ITEMS;

    // Title
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();

    // Animated background lines
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth   = 1;
    for (let i = 0; i < 20; i++) {
      const yy = ((i * 32 + menuAnim * 30) % 640) - 40;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(800, yy);
      ctx.stroke();
    }
    ctx.restore();

    if (!isPause) {
      // Big title
      ctx.save();
      ctx.shadowBlur  = 30;
      ctx.shadowColor = '#ff8c00';
      ctx.font = FONT_TTL;
      ctx.textAlign   = 'center';
      ctx.fillStyle   = '#ff8c00';
      ctx.fillText('ICARUS', 400, 140);
      ctx.shadowBlur  = 15;
      ctx.shadowColor = '#88ccff';
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillStyle   = '#88ccff';
      ctx.letterSpacing = '0.2em';
      ctx.fillText('SUNFORGE SAVIOR', 400, 170);
      ctx.restore();

      // Decorative lines
      ctx.save();
      ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(140, 182); ctx.lineTo(660, 182); ctx.stroke();
      ctx.restore();
    } else {
      glowText(ctx, 'PAUSED', 400, 140, '#88ccff', '#88ccff', FONT_XL, 'center');
    }

    // Menu items
    const startY = isPause ? 200 : 250;
    for (let i = 0; i < items.length; i++) {
      const iy     = startY + i * 48;
      const active = i === menuIndex;

      if (active) {
        // Selection highlight
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle   = '#ff8c00';
        ctx.fillRect(200, iy - 22, 400, 30);
        ctx.restore();
        // Arrow
        ctx.save();
        ctx.shadowBlur  = 8; ctx.shadowColor = '#ff8c00';
        ctx.fillStyle   = '#ff8c00';
        ctx.font = FONT_LG; ctx.textAlign = 'center';
        ctx.fillText('▶', 250, iy);
        ctx.restore();
      }

      glowText(
        ctx, items[i], 400, iy,
        active ? '#ffffff' : '#7a8a9a',
        active ? '#ff8c00' : 'transparent',
        FONT_LG, 'center'
      );
    }

    // Controls hint
    if (!isPause) {
      text(ctx, '↑↓  SELECT     ENTER  CONFIRM', 400, 550, '#334455', FONT_SM, 'center');
    }

    return items;
  }

  // ── SETTINGS MENU ────────────────────────────────────────
  function drawSettings(ctx, dt) {
    menuAnim += dt * 0.001;
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle   = '#000';
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();

    glowText(ctx, 'SETTINGS', 400, 80, '#88ccff', '#88ccff', FONT_XL, 'center');

    const items = [
      { label: 'MASTER VOLUME', value: Audio.getMasterVol(), key: 'master' },
      { label: 'MUSIC VOLUME',  value: Audio.getMusicVol(),  key: 'music'  },
      { label: 'SFX VOLUME',    value: Audio.getSfxVol(),    key: 'sfx'    },
      { label: 'BACK',          value: null, key: 'back' },
    ];

    for (let i = 0; i < items.length; i++) {
      const iy     = 160 + i * 70;
      const active = i === settingsIndex;
      const item   = items[i];

      if (active) {
        ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#88ccff';
        ctx.fillRect(120, iy - 22, 560, 30); ctx.restore();
        ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#88ccff';
        ctx.fillStyle = '#88ccff'; ctx.font = FONT_LG; ctx.textAlign = 'center';
        ctx.fillText('▶', 170, iy); ctx.restore();
      }

      glowText(ctx, item.label, 280, iy, active ? '#ffffff' : '#6a7a8a', '#88ccff', FONT_MED, 'left');

      if (item.value !== null) {
        // Slider bar
        const bx = 480, by = iy - 12, bw = 160, bh = 14;
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(bx, by, bw, bh);
        ctx.save();
        ctx.shadowBlur = active ? 8 : 0; ctx.shadowColor = '#88ccff';
        ctx.fillStyle  = active ? '#88ccff' : '#446688';
        ctx.fillRect(bx + 1, by + 1, Math.round((bw - 2) * item.value), bh - 2);
        ctx.restore();
        ctx.strokeStyle = '#446688'; ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
        text(ctx, Math.round(item.value * 100) + '%', bx + bw + 8, iy, '#88aacc', FONT_SM);
      }
    }

    text(ctx, '↑↓  SELECT     ←→  ADJUST     ESC  BACK', 400, 570, '#334455', FONT_SM, 'center');
    return items;
  }

  // ── CONTROLS SCREEN ───────────────────────────────────────
  function drawControls(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle   = '#000';
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();

    glowText(ctx, 'CONTROLS', 400, 65, '#88ccff', '#88ccff', FONT_XL, 'center');
    ctx.save(); ctx.strokeStyle = '#334466'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(150, 80); ctx.lineTo(650, 80); ctx.stroke();
    ctx.restore();

    const cols = [
      ['W',                'JUMP'],
      ['A / D',            'MOVE LEFT / RIGHT'],
      ['S',                'CROUCH / DROP THROUGH'],
      ['SHIFT',            'DASH'],
      ['J  /  Left Click', 'HAND CANNON'],
      ['K  /  Right Click','LASER SWORD'],
      ['Hold K',           'CHARGE SWORD'],
      ['ESC',              'PAUSE'],
    ];

    for (let i = 0; i < cols.length; i++) {
      const iy = 110 + i * 52;
      // Key box
      ctx.save();
      ctx.fillStyle = '#1a2a3a';
      ctx.fillRect(110, iy - 16, 200, 26);
      ctx.strokeStyle = '#334466'; ctx.lineWidth = 1;
      ctx.strokeRect(110, iy - 16, 200, 26);
      glowText(ctx, cols[i][0], 210, iy + 2, '#88ccff', '#446688', FONT_SM, 'center');
      text(ctx, cols[i][1], 330, iy + 2, '#aabbcc', FONT_SM);
      ctx.restore();
    }

    text(ctx, 'PRESS  ESC  OR  ENTER  TO  RETURN', 400, 568, '#334455', FONT_SM, 'center');
  }

  // ── GAME OVER SCREEN ──────────────────────────────────────
  function drawGameOver(ctx, score, timer, dt) {
    menuAnim += dt * 0.001;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle   = '#000';
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();

    // Flicker effect
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();

    glowText(ctx, 'SYSTEM FAILURE', 400, 200, '#ff2200', '#ff0000', FONT_XL, 'center');
    glowText(ctx, 'ICARUS HAS FALLEN', 400, 240, '#884444', '#ff2200', FONT_MED, 'center');

    const minutes = Math.floor(timer / 60000);
    const seconds = Math.floor((timer % 60000) / 1000);
    text(ctx, `TIME ELAPSED:   ${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`, 400, 320, '#556677', FONT_MED, 'center');
    text(ctx, `FINAL SCORE:    ${score.toString().padStart(7,'0')}`,                                 400, 350, '#556677', FONT_MED, 'center');

    const blink = Math.floor(menuAnim * 2) % 2 === 0;
    if (blink) {
      glowText(ctx, 'PRESS  ENTER  TO  RETRY', 400, 440, '#ff8c00', '#ff8c00', FONT_MED, 'center');
    }
    text(ctx, 'ESC  –  RETURN TO MENU', 400, 480, '#334455', FONT_SM, 'center');
  }

  // ── WIN SCREEN ────────────────────────────────────────────
  function drawWin(ctx, score, timer, dt) {
    menuAnim += dt * 0.001;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle   = '#000';
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();

    // Golden glow
    ctx.save();
    const gp = Math.sin(menuAnim * 2) * 0.15 + 0.15;
    ctx.globalAlpha = gp;
    const grad = ctx.createRadialGradient(400, 300, 30, 400, 300, 300);
    grad.addColorStop(0, '#ff8c00'); grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 600);
    ctx.restore();

    glowText(ctx, 'SUNFORGE STABILIZED', 400, 140, '#ff8c00', '#ff8c00', FONT_XL, 'center');
    glowText(ctx, 'ICARUS STANDS AT THE RESTORED HORIZON', 400, 178, '#ffdd88', '#ff8c00', FONT_SM, 'center');

    ctx.save();
    ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(100, 195); ctx.lineTo(700, 195); ctx.stroke();
    ctx.restore();

    // Stats
    const minutes = Math.floor(timer / 60000);
    const seconds = Math.floor((timer % 60000) / 1000);
    const ms      = Math.floor((timer % 1000) / 10);
    const rank    = _calcRank(timer, score);
    text(ctx, `CLEAR TIME:   ${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(ms).padStart(2,'0')}`, 400, 265, '#aabbcc', FONT_MED, 'center');
    text(ctx, `FINAL SCORE:  ${score.toString().padStart(7,'0')}`,    400, 295, '#aabbcc', FONT_MED, 'center');

    // Rank
    const rankColors = { S: '#ffffff', A: '#ffdd44', B: '#aaccff', C: '#88aa66', D: '#887766' };
    glowText(ctx, `RANK  ${rank}`, 400, 370, rankColors[rank] || '#aaa', rankColors[rank] || '#aaa', FONT_XL, 'center');

    // Sub-unlocks
    text(ctx, 'HARD MODE – UNLOCKED', 400, 430, '#556677', FONT_SM, 'center');
    text(ctx, 'TIME ATTACK – UNLOCKED', 400, 455, '#556677', FONT_SM, 'center');

    const blink = Math.floor(menuAnim * 1.5) % 2 === 0;
    if (blink) {
      glowText(ctx, 'PRESS  ENTER  TO  CONTINUE', 400, 520, '#ff8c00', '#ff8c00', FONT_SM, 'center');
    }
  }

  function _calcRank(timer, score) {
    if (timer < 900000  && score >= 15000) return 'S';  // < 15 min, high score
    if (timer < 1200000 && score >= 10000) return 'A';  // < 20 min
    if (timer < 1500000 && score >= 5000)  return 'B';
    if (timer < 1800000)                   return 'C';
    return 'D';
  }

  // ── Transition overlay ────────────────────────────────────
  function drawSectionTransition(ctx, name, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();
    if (alpha > 0.3) {
      ctx.save();
      ctx.globalAlpha = (alpha - 0.3) / 0.7;
      glowText(ctx, name, 400, 300, '#ff8c00', '#ff8c00', FONT_XL, 'center');
      ctx.restore();
    }
  }

  // ── Damage flash ─────────────────────────────────────────
  function drawDamageFlash(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 800, 600);
    ctx.restore();
  }

  // ── Menu navigation ──────────────────────────────────────
  function navigateMenu(dir, items) {
    menuIndex = (menuIndex + dir + items.length) % items.length;
    Audio.sfx.menuBeep();
  }

  function navigateSettings(dir) {
    settingsIndex = (settingsIndex + dir + 4) % 4;
    Audio.sfx.menuBeep();
  }

  function adjustSetting(dir) {
    const step = 0.05;
    if (settingsIndex === 0) Audio.setMasterVol(Math.max(0, Math.min(1, Audio.getMasterVol() + dir * step)));
    if (settingsIndex === 1) Audio.setMusicVol(Math.max(0, Math.min(1, Audio.getMusicVol()  + dir * step)));
    if (settingsIndex === 2) Audio.setSfxVol(Math.max(0, Math.min(1, Audio.getSfxVol()      + dir * step)));
    Audio.sfx.menuBeep();
  }

  function resetMenuIndex() { menuIndex = 0; settingsIndex = 0; inSettings = false; }
  function getMenuIndex()   { return menuIndex; }
  function getInSettings()  { return inSettings; }
  function setInSettings(v) { inSettings = v; }
  function getSettingsIndex(){ return settingsIndex; }

  return {
    drawHUD, drawBossBar,
    drawMenu, drawSettings, drawControls,
    drawGameOver, drawWin,
    drawSectionTransition, drawDamageFlash,
    navigateMenu, navigateSettings, adjustSetting,
    resetMenuIndex, getMenuIndex,
    getInSettings, setInSettings, getSettingsIndex,
    MAIN_ITEMS, PAUSE_ITEMS
  };
})();
