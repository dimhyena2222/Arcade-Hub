// ============================================================
//  UI  –  HUD, Menus, Screens  (Smash Bros style)
// ============================================================
const UI = (() => {
  const FONT_SM  = "bold 11px 'Courier New', monospace";
  const FONT_MED = "bold 14px 'Courier New', monospace";
  const FONT_LG  = "bold 20px 'Courier New', monospace";
  const FONT_XL  = "bold 32px 'Courier New', monospace";
  const FONT_TTL = "bold 52px 'Courier New', monospace";

  let menuIndex    = 0;
  let settingsIndex = 0;
  let menuAnim     = 0;

  function text(ctx, str, x, y, color, font = FONT_MED, align = 'left') {
    ctx.save(); ctx.font = font; ctx.textAlign = align;
    ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore();
  }

  function glowText(ctx, str, x, y, color, glow, font = FONT_MED, align = 'center') {
    ctx.save(); ctx.font = font; ctx.textAlign = align;
    ctx.shadowBlur = 14; ctx.shadowColor = glow;
    ctx.fillStyle  = color; ctx.fillText(str, x, y); ctx.restore();
  }

  // ── SMASH-STYLE PERCENT HUD ─────────────────────────────
  function drawHUD(ctx, player, wave, totalWaves, score, timer) {
    // ── BOTTOM CENTER: Percent display ──────────────────
    const pct   = Math.floor(player.percent);
    const pctStr = pct + '%';

    // Background panel
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle   = '#000';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(270, 546, 260, 50, 8) : ctx.fillRect(270, 546, 260, 50);
    ctx.fill();
    ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(270, 546, 260, 50, 8) : ctx.strokeRect(270, 546, 260, 50);
    ctx.stroke();
    ctx.restore();

    // Percent color: white → yellow → red as it rises
    const pctColor = pct < 50  ? '#ffffff' :
                     pct < 100 ? '#ffdd44' :
                     pct < 150 ? '#ffaa00' : '#ff3300';
    ctx.save();
    ctx.shadowBlur  = pct > 100 ? 20 : 8;
    ctx.shadowColor = pctColor;
    ctx.font        = `bold ${pct > 199 ? 34 : 40}px 'Courier New', monospace`;
    ctx.textAlign   = 'center';
    ctx.fillStyle   = pctColor;
    ctx.fillText(pctStr, 400, 588);
    ctx.restore();

    // ICARUS label above
    glowText(ctx, 'ICARUS', 400, 562, '#ff8c00', '#ff4400', FONT_SM, 'center');

    // ── STOCKS (top left) ───────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.80;
    ctx.fillStyle   = '#000';
    ctx.fillRect(8, 8, 110, 44);
    ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 110, 44);
    ctx.restore();
    glowText(ctx, 'STOCKS', 63, 22, '#ff8c00', '#ff4400', FONT_SM, 'center');
    // Draw stock icons
    for (let i = 0; i < 3; i++) {
      const ic = i < player.stocks ? '#ff8c00' : '#333';
      ctx.save();
      ctx.shadowBlur  = i < player.stocks ? 8 : 0;
      ctx.shadowColor = '#ff8c00';
      ctx.fillStyle   = ic;
      ctx.beginPath();
      ctx.arc(26 + i * 30, 40, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── WAVE COUNTER (top center) ───────────────────────
    ctx.save();
    ctx.globalAlpha = 0.80;
    ctx.fillStyle   = '#000';
    ctx.fillRect(310, 8, 180, 44);
    ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 1;
    ctx.strokeRect(310, 8, 180, 44);
    ctx.restore();
    glowText(ctx, 'WAVE', 400, 22, '#88ccff', '#446688', FONT_SM, 'center');
    glowText(ctx, `${wave}  /  ${totalWaves}`, 400, 44, '#ffffff', '#88ccff', FONT_LG, 'center');

    // ── SCORE (top right) ───────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.80;
    ctx.fillStyle   = '#000';
    ctx.fillRect(682, 8, 110, 44);
    ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 1;
    ctx.strokeRect(682, 8, 110, 44);
    ctx.restore();
    glowText(ctx, 'SCORE', 737, 22, '#556677', FONT_SM, 'center');
    glowText(ctx, score.toString().padStart(6, '0'), 737, 44, '#aaccee', '#4488aa', FONT_MED, 'center');

    // ── ENERGY BAR (bottom left) ────────────────────────
    const enRatio = player.energy / player.maxEnergy;
    ctx.save();
    ctx.globalAlpha = 0.80;
    ctx.fillStyle   = '#000a14'; ctx.fillRect(8, 554, 120, 12);
    ctx.save();
    ctx.shadowBlur  = 5; ctx.shadowColor = '#ff8c00';
    ctx.fillStyle   = `rgba(255,140,0,${0.6 + enRatio * 0.4})`;
    ctx.fillRect(9, 555, Math.max(0, 118 * enRatio), 10);
    ctx.restore();
    ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 1; ctx.strokeRect(8, 554, 120, 12);
    glowText(ctx, 'EN', 68, 551, '#cc9966', '#aa6622', FONT_SM, 'center');
    ctx.restore();
  }

  // ── ENEMY HEALTH BARS (above enemies) ──────────────────
  function drawEnemyBar(ctx, enemy) {
    if (enemy.hp >= enemy.maxHp) return;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    const bw = Math.min(enemy.w + 20, 80);
    const bx = enemy.cx - bw * 0.5;
    const by = enemy.y - 14;
    ctx.fillStyle = '#200'; ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = ratio > 0.5 ? '#ffaa00' : ratio > 0.25 ? '#ff6600' : '#ff2200';
    ctx.fillRect(bx, by, bw * ratio, 6);
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 6);
  }

  // ── BOSS BAR (full width bottom) ───────────────────────
  function drawBossBar(ctx, boss) {
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    const bw = 580, bx = 110, by = 518;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle   = '#000'; ctx.fillRect(bx - 6, by - 22, bw + 12, 38);
    ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 1;
    ctx.strokeRect(bx - 6, by - 22, bw + 12, 38);
    ctx.restore();
    ctx.fillStyle = '#200'; ctx.fillRect(bx, by, bw, 14);
    const col = boss.phase >= 3 ? '#ff2200' : boss.phase >= 2 ? '#ff6600' : '#ffaa00';
    ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = col;
    ctx.fillStyle = col; ctx.fillRect(bx, by, Math.max(0, bw * ratio), 14);
    ctx.restore();
    for (let p = 1; p < 4; p++) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(bx + bw * (p / 4) - 1, by, 2, 14);
    }
    ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 14);
    glowText(ctx, boss.bossName || 'BOSS', 400, by - 5, '#ffaa44', '#ff4400', FONT_SM, 'center');
    if (boss.phase > 1) glowText(ctx, `PHASE ${boss.phase}`, 400, by + 26, '#ff4400', '#ff2200', FONT_SM, 'center');
  }

  // ── WAVE INTRO BANNER ────────────────────────────────────
  function drawWaveBanner(ctx, wave, totalWaves, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle   = '#000';
    ctx.fillRect(0, 230, 800, 100);
    ctx.restore();
    if (alpha > 0.2) {
      ctx.save();
      ctx.globalAlpha = (alpha - 0.2) / 0.8;
      const isFinal = wave === totalWaves;
      const label   = isFinal ? '⚡  FINAL BOSS  ⚡' : `WAVE  ${wave}  /  ${totalWaves}`;
      const col     = isFinal ? '#ff3300' : '#ff8c00';
      glowText(ctx, label, 400, 290, col, col, FONT_XL, 'center');
      if (isFinal) glowText(ctx, 'HELION PRIME DESCENDS', 400, 322, '#ffaa44', '#ff4400', FONT_MED, 'center');
      ctx.restore();
    }
  }

  // ── DAMAGE FLASH ────────────────────────────────────────
  function drawDamageFlash(ctx, alpha) {
    ctx.save(); ctx.globalAlpha = alpha * 0.32;
    ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 800, 600);
    ctx.restore();
  }

  // ── MAIN MENU ────────────────────────────────────────────
  const MAIN_ITEMS  = ['START GAME', 'SETTINGS', 'CONTROLS', 'ARCADE HUB'];
  const PAUSE_ITEMS = ['RESUME', 'SETTINGS', 'CONTROLS', 'RESTART', 'QUIT TO MENU', 'ARCADE HUB'];

  function drawMenu(ctx, dt, isPause = false) {
    menuAnim += dt * 0.001;
    const items = isPause ? PAUSE_ITEMS : MAIN_ITEMS;

    ctx.save(); ctx.globalAlpha = 0.94; ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 800, 600); ctx.restore();

    ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const yy = ((i * 32 + menuAnim * 30) % 640) - 40;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(800, yy); ctx.stroke();
    }
    ctx.restore();

    if (!isPause) {
      ctx.save();
      ctx.shadowBlur = 30; ctx.shadowColor = '#ff8c00';
      ctx.font = FONT_TTL; ctx.textAlign = 'center'; ctx.fillStyle = '#ff8c00';
      ctx.fillText('ICARUS', 400, 140);
      ctx.shadowBlur = 15; ctx.shadowColor = '#88ccff';
      ctx.font = "bold 18px 'Courier New', monospace"; ctx.fillStyle = '#88ccff';
      ctx.fillText('SUNFORGE SAVIOR', 400, 170);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(140, 182); ctx.lineTo(660, 182); ctx.stroke();
      ctx.restore();
      // Sub-title
      glowText(ctx, 'WAVE SURVIVAL  –  SMASH STYLE', 400, 210, '#556677', '#334455', FONT_SM, 'center');
    } else {
      glowText(ctx, 'PAUSED', 400, 140, '#88ccff', '#88ccff', FONT_XL, 'center');
    }

    const startY = isPause ? 200 : 255;
    for (let i = 0; i < items.length; i++) {
      const iy = startY + i * 48;
      const active = i === menuIndex;
      if (active) {
        ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#ff8c00';
        ctx.fillRect(200, iy - 22, 400, 30); ctx.restore();
        ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#ff8c00';
        ctx.fillStyle = '#ff8c00'; ctx.font = FONT_LG; ctx.textAlign = 'center';
        ctx.fillText('▶', 250, iy); ctx.restore();
      }
      glowText(ctx, items[i], 400, iy,
        active ? '#ffffff' : '#7a8a9a',
        active ? '#ff8c00' : 'transparent', FONT_LG, 'center');
    }
    if (!isPause) text(ctx, '↑↓  SELECT     ENTER  CONFIRM', 400, 555, '#334455', FONT_SM, 'center');
  }

  // ── SETTINGS ────────────────────────────────────────────
  function drawSettings(ctx, dt) {
    menuAnim += dt * 0.001;
    ctx.save(); ctx.globalAlpha = 0.95; ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600); ctx.restore();
    glowText(ctx, 'SETTINGS', 400, 80, '#88ccff', '#88ccff', FONT_XL, 'center');
    const items = [
      { label: 'MASTER VOLUME', value: Audio.getMasterVol(), key: 'master' },
      { label: 'MUSIC VOLUME',  value: Audio.getMusicVol(),  key: 'music'  },
      { label: 'SFX VOLUME',    value: Audio.getSfxVol(),    key: 'sfx'    },
      { label: 'BACK',          value: null },
    ];
    for (let i = 0; i < items.length; i++) {
      const iy = 160 + i * 70; const active = i === settingsIndex; const item = items[i];
      if (active) {
        ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#88ccff';
        ctx.fillRect(120, iy - 22, 560, 30); ctx.restore();
        ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#88ccff';
        ctx.fillStyle = '#88ccff'; ctx.font = FONT_LG; ctx.textAlign = 'center';
        ctx.fillText('▶', 170, iy); ctx.restore();
      }
      glowText(ctx, item.label, 280, iy, active ? '#ffffff' : '#6a7a8a', '#88ccff', FONT_MED, 'left');
      if (item.value !== null) {
        const bx = 480, by = iy - 12, bw = 160, bh = 14;
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(bx, by, bw, bh);
        ctx.save(); ctx.shadowBlur = active ? 8 : 0; ctx.shadowColor = '#88ccff';
        ctx.fillStyle = active ? '#88ccff' : '#446688';
        ctx.fillRect(bx + 1, by + 1, Math.round((bw - 2) * item.value), bh - 2); ctx.restore();
        ctx.strokeStyle = '#446688'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
        text(ctx, Math.round(item.value * 100) + '%', bx + bw + 8, iy, '#88aacc', FONT_SM);
      }
    }
    text(ctx, '↑↓  SELECT     ←→  ADJUST     ESC  BACK', 400, 570, '#334455', FONT_SM, 'center');
  }

  // ── CONTROLS ────────────────────────────────────────────
  function drawControls(ctx) {
    ctx.save(); ctx.globalAlpha = 0.95; ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600); ctx.restore();
    glowText(ctx, 'CONTROLS', 400, 65, '#88ccff', '#88ccff', FONT_XL, 'center');
    ctx.save(); ctx.strokeStyle = '#334466'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(150, 80); ctx.lineTo(650, 80); ctx.stroke(); ctx.restore();
    const cols = [
      ['W / UP',            'JUMP  (hold = jet boots)'],
      ['A / D',             'MOVE LEFT / RIGHT'],
      ['S',                 'CROUCH / DROP THROUGH'],
      ['SHIFT',             'DASH'],
      ['F  (+ direction)',  'DODGE  (parry window!)'],
      ['F  (stationary)',   'BLOCK  (parry window!)'],
      ['J  /  Left Click',  'HAND CANNON'],
      ['K  /  Right Click', 'LASER SWORD  (hold = charge)'],
      ['ESC',               'PAUSE'],
    ];
    for (let i = 0; i < cols.length; i++) {
      const iy = 105 + i * 48;
      ctx.save(); ctx.fillStyle = '#1a2a3a'; ctx.fillRect(110, iy - 16, 200, 26);
      ctx.strokeStyle = '#334466'; ctx.lineWidth = 1; ctx.strokeRect(110, iy - 16, 200, 26);
      glowText(ctx, cols[i][0], 210, iy + 2, '#88ccff', '#446688', FONT_SM, 'center');
      text(ctx, cols[i][1], 330, iy + 2, '#aabbcc', FONT_SM); ctx.restore();
    }
    text(ctx, 'PRESS  ESC  OR  ENTER  TO  RETURN', 400, 562, '#334455', FONT_SM, 'center');
  }

  // ── GAME OVER ────────────────────────────────────────────
  function drawGameOver(ctx, score, wave, dt) {
    menuAnim += dt * 0.001;
    ctx.save(); ctx.globalAlpha = 0.92; ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600); ctx.restore();
    glowText(ctx, 'SYSTEM FAILURE', 400, 190, '#ff2200', '#ff0000', FONT_XL, 'center');
    glowText(ctx, 'ICARUS HAS FALLEN', 400, 228, '#884444', '#ff2200', FONT_MED, 'center');
    text(ctx, `REACHED WAVE:   ${wave}  /  ${TOTAL_WAVES}`, 400, 310, '#556677', FONT_MED, 'center');
    text(ctx, `FINAL SCORE:    ${score.toString().padStart(6, '0')}`, 400, 342, '#556677', FONT_MED, 'center');
    if (Math.floor(menuAnim * 2) % 2 === 0)
      glowText(ctx, 'PRESS  ENTER  TO  RETRY', 400, 430, '#ff8c00', '#ff8c00', FONT_MED, 'center');
    text(ctx, 'ESC  –  RETURN TO MENU', 400, 472, '#334455', FONT_SM, 'center');
  }

  // ── WIN SCREEN ───────────────────────────────────────────
  function drawWin(ctx, score, dt) {
    menuAnim += dt * 0.001;
    ctx.save(); ctx.globalAlpha = 0.88; ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 600); ctx.restore();
    ctx.save();
    const gp = Math.sin(menuAnim * 2) * 0.15 + 0.15; ctx.globalAlpha = gp;
    const grad = ctx.createRadialGradient(400, 300, 30, 400, 300, 300);
    grad.addColorStop(0, '#ff8c00'); grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 600); ctx.restore();
    glowText(ctx, 'HELION PRIME DEFEATED!', 400, 150, '#ff8c00', '#ff8c00', FONT_XL, 'center');
    glowText(ctx, 'THE SUNFORGE IS STABILIZED', 400, 190, '#ffdd88', '#ff8c00', FONT_MED, 'center');
    text(ctx, `FINAL SCORE:  ${score.toString().padStart(6, '0')}`, 400, 280, '#aabbcc', FONT_MED, 'center');
    if (Math.floor(menuAnim * 1.5) % 2 === 0)
      glowText(ctx, 'PRESS  ENTER  TO  CONTINUE', 400, 400, '#ff8c00', '#ff8c00', FONT_SM, 'center');
  }

  // ── MENU NAVIGATION ─────────────────────────────────────
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
    if (settingsIndex === 1) Audio.setMusicVol(Math.max(0, Math.min(1, Audio.getMusicVol()   + dir * step)));
    if (settingsIndex === 2) Audio.setSfxVol(Math.max(0, Math.min(1, Audio.getSfxVol()       + dir * step)));
    Audio.sfx.menuBeep();
  }
  function resetMenuIndex()   { menuIndex = 0; settingsIndex = 0; }
  function getMenuIndex()     { return menuIndex; }
  function getSettingsIndex() { return settingsIndex; }

  return {
    drawHUD, drawBossBar, drawEnemyBar,
    drawMenu, drawSettings, drawControls,
    drawGameOver, drawWin,
    drawWaveBanner, drawDamageFlash,
    navigateMenu, navigateSettings, adjustSetting,
    resetMenuIndex, getMenuIndex, getSettingsIndex,
    MAIN_ITEMS, PAUSE_ITEMS
  };
})();
