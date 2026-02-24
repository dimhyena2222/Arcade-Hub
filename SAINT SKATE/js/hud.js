/* ═══════════════════════════════════════════════
   SAINT SKATE — HUD System
   Score, Respect, Minimap, Objectives, Hints
═══════════════════════════════════════════════ */

const HUD = (() => {

  let minimapCtx = null;
  let minimapVisible = true;
  let trickPopupTimer = 0;
  let hintTimer = 0;

  // Minimap config
  const MM = {
    size:    120,
    worldW:  110,   // world spans ~-55..55
    worldH:  110,
    zones: [
      { name: 'skatepark', cx: -25, cz: -25, color: '#FF7B3A', label: 'SP' },
      { name: 'plaza',     cx:  25, cz: -25, color: '#00FFB2', label: 'PL' },
      { name: 'alley',     cx: -25, cz:  25, color: '#FF3366', label: 'AL' },
      { name: 'rooftop',   cx:  25, cz:  25, color: '#FFEC3A', label: 'RT' },
    ]
  };

  function worldToMinimap(wx, wz) {
    const px = (wx + 55) / MM.worldW * MM.size;
    const py = (wz + 55) / MM.worldH * MM.size;
    return { x: px, y: py };
  }

  // ─── Init ──────────────────────────────────────
  function init() {
    const canvas = document.getElementById('minimap-canvas');
    minimapCtx = canvas.getContext('2d');

    document.addEventListener('keydown', e => {
      if (e.code === 'KeyM') toggleMinimap();
      if (e.code === 'Tab') { e.preventDefault(); toggleObjectives(); }
    });

    // Trick callback
    TrickSystem.onTrick((name, pts, combo) => {
      if (name === 'LAND') {
        showLandScore(pts, combo);
      } else {
        showTrickPopup(name, pts, combo);
      }
      updateScore(TrickSystem.getTotalScore());
      updateCombo(combo);
    });

    TrickSystem.onBail(() => {
      showBail();
      updateCombo(0);
    });

    TrickSystem.onRespect(v => {
      updateRespect(v);
    });
  }

  // ─── Show/hide ─────────────────────────────────
  function show() {
    document.getElementById('hud').classList.remove('hidden');
  }
  function hide() {
    document.getElementById('hud').classList.add('hidden');
  }

  // ─── Score ─────────────────────────────────────
  function updateScore(score) {
    document.getElementById('score-value').textContent = score.toLocaleString();
  }

  // ─── Combo ─────────────────────────────────────
  function updateCombo(count) {
    const el = document.getElementById('combo-counter');
    const cnt = document.getElementById('combo-count');
    if (count > 1) {
      cnt.textContent = count;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  // ─── Trick popup ───────────────────────────────
  function showTrickPopup(name, pts, combo) {
    const pop  = document.getElementById('trick-popup');
    const pName = document.getElementById('trick-popup-name');
    const pPts  = document.getElementById('trick-popup-pts');
    pName.textContent = name.toUpperCase();
    pPts.textContent  = `+${pts.toLocaleString()} PTS`;
    const trick = document.getElementById('trick-name');
    trick.textContent = name;
    trick.classList.remove('hidden');
    pop.classList.remove('hidden');
    trickPopupTimer = 1.4;
  }

  function showLandScore(pts, combo) {
    const pop  = document.getElementById('trick-popup');
    const pName = document.getElementById('trick-popup-name');
    const pPts  = document.getElementById('trick-popup-pts');
    if (combo > 1) {
      pName.textContent = `${combo}x COMBO!`;
      pPts.textContent  = `+${pts.toLocaleString()} PTS`;
      pop.classList.remove('hidden');
      trickPopupTimer = 1.8;
    } else {
      pop.classList.add('hidden');
    }
  }

  // ─── Bail ──────────────────────────────────────
  function showBail() {
    const el = document.getElementById('bail-flash');
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth; // reflow
    el.style.animation = '';
    setTimeout(() => el.classList.add('hidden'), 900);
  }

  // ─── Respect ───────────────────────────────────
  function updateRespect(v) {
    const fill = document.getElementById('respect-bar-fill');
    const val  = document.getElementById('respect-value');
    const pct  = Math.min(100, (v / 1000) * 100);
    fill.style.width  = pct + '%';
    val.textContent   = `${v} / 1000`;
    if (v >= 1000) AudioSys.sfxRespect();
  }

  // ─── Objective ─────────────────────────────────
  function setObjective(text) {
    document.getElementById('objective-text').textContent = text;
  }

  // ─── Minimap ───────────────────────────────────
  function toggleMinimap() {
    minimapVisible = !minimapVisible;
    document.getElementById('minimap-panel').style.opacity = minimapVisible ? 1 : 0;
  }

  function drawMinimap(playerPos) {
    if (!minimapCtx || !minimapVisible) return;
    const ctx = minimapCtx;
    const s   = MM.size;

    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(10,10,10,0.9)';
    ctx.fillRect(0, 0, s, s);

    // Zone boxes
    MM.zones.forEach(z => {
      const p = worldToMinimap(z.cx, z.cz);
      ctx.fillStyle = z.color + '44';
      ctx.strokeStyle = z.color + '88';
      ctx.lineWidth = 1;
      ctx.fillRect(p.x - 22, p.y - 22, 44, 44);
      ctx.strokeRect(p.x - 22, p.y - 22, 44, 44);
      ctx.fillStyle = z.color;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(z.label, p.x, p.y + 3);
    });

    // Connector lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    const lineConnectors = [
      [{ cx: -25, cz: -25 }, { cx: 25, cz: -25 }],
      [{ cx: -25, cz: -25 }, { cx: -25, cz: 25 }],
      [{ cx: 25,  cz: -25 }, { cx: 25,  cz: 25 }],
      [{ cx: -25, cz: 25 },  { cx: 25,  cz: 25 }],
    ];
    lineConnectors.forEach(([a, b]) => {
      const pa = worldToMinimap(a.cx, a.cz);
      const pb = worldToMinimap(b.cx, b.cz);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    });

    // Player dot
    const pp = worldToMinimap(playerPos.x, playerPos.z);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 3, 0, Math.PI * 2);
    ctx.fill();
    // Direction indicator
    const angle = CameraController.getYaw() + Math.PI;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pp.x, pp.y);
    ctx.lineTo(pp.x + Math.sin(angle) * 6, pp.y + Math.cos(angle) * 6);
    ctx.stroke();

    // Crosshair center
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(s/2, 0); ctx.lineTo(s/2, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, s/2); ctx.lineTo(s, s/2); ctx.stroke();
  }

  // ─── Objectives panel ──────────────────────────
  let objectivesList = [];

  function setObjectives(items) {
    objectivesList = items.map(i => ({ text: i, done: false }));
    renderObjectives();
  }

  function completeObjective(idx) {
    if (objectivesList[idx]) {
      objectivesList[idx].done = true;
      renderObjectives();
    }
  }

  function renderObjectives() {
    const list = document.getElementById('objectives-list');
    list.innerHTML = '';
    objectivesList.forEach(obj => {
      const li = document.createElement('li');
      li.textContent = obj.text;
      if (obj.done) li.classList.add('done');
      list.appendChild(li);
    });
  }

  function toggleObjectives() {
    const panel = document.getElementById('objectives-panel');
    panel.classList.toggle('hidden');
  }

  // ─── Timer ─────────────────────────────────────
  function showTimer(seconds) {
    const panel = document.getElementById('timer-panel');
    panel.classList.remove('hidden');
    updateTimer(seconds);
  }

  function hideTimer() {
    document.getElementById('timer-panel').classList.add('hidden');
  }

  function updateTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    document.getElementById('timer-value').textContent =
      `${m}:${s.toString().padStart(2,'0')}`;
    const panel = document.getElementById('timer-panel');
    if (seconds <= 15) panel.classList.add('urgent');
    else               panel.classList.remove('urgent');
  }

  // ─── Mission popup ─────────────────────────────
  function showMission(title, desc) {
    const popup = document.getElementById('mission-popup');
    document.getElementById('mission-popup-title').textContent = title;
    document.getElementById('mission-popup-desc').textContent  = desc;
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 3500);
  }

  // ─── Tutorial arrow ────────────────────────────
  function showTutorialArrow(label) {
    const el = document.getElementById('tutorial-arrow');
    el.textContent = label || '↓ SKATE HERE';
    el.classList.remove('hidden');
  }
  function hideTutorialArrow() {
    document.getElementById('tutorial-arrow').classList.add('hidden');
  }

  // ─── Hint ──────────────────────────────────────
  function showHint(text, duration) {
    const el = document.getElementById('tutorial-arrow');
    el.textContent = text;
    el.classList.remove('hidden');
    hintTimer = duration || 3000;
    clearTimeout(el._hintTo);
    el._hintTo = setTimeout(() => el.classList.add('hidden'), hintTimer);
  }

  // ─── Tutorial prompts ──────────────────────────
  let tutPrompts = [
    { code: 'WASD to move.',           done: false },
    { code: 'Hold SHIFT to push for speed.', done: false },
    { code: 'Press SPACE to ollie.',   done: false },
    { code: 'LMB in air — Flip Trick.', done: false },
    { code: 'E near a rail — Grind!',   done: false },
    { code: 'Q / E while airborne — Spin 180!', done: false },
  ];
  let tutPromptIdx = 0;
  let tutPromptTimer = 0;

  function showNextTutPrompt() {
    if (tutPromptIdx >= tutPrompts.length) return;
    showHint('→ ' + tutPrompts[tutPromptIdx].code, 4000);
    tutPromptIdx++;
  }

  // ─── Unlock banner ─────────────────────────────
  function showUnlockBanner(text) {
    const el = document.getElementById('unlock-banner');
    el.querySelector('span').textContent = text;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
  }

  // ─── Frame update ──────────────────────────────
  function update(dt, playerPos) {
    drawMinimap(playerPos);

    if (trickPopupTimer > 0) {
      trickPopupTimer -= dt;
      if (trickPopupTimer <= 0) {
        document.getElementById('trick-popup').classList.add('hidden');
        document.getElementById('trick-name').classList.add('hidden');
      }
    }
  }

  return {
    init, show, hide, update,
    updateScore, updateCombo, updateRespect,
    setObjective, setObjectives, completeObjective,
    showMission, showTutorialArrow, hideTutorialArrow,
    showHint, showNextTutPrompt,
    showTimer, hideTimer, updateTimer,
    showUnlockBanner, showBail
  };
})();
