/* ═══════════════════════════════════════════════
   SAINT SKATE — Tricks & Combo System
═══════════════════════════════════════════════ */

const TrickSystem = (() => {

  // ─── Trick Definitions ─────────────────────────
  const TRICKS = {
    OLLIE:         { name: 'Ollie',           pts: 50  },
    KICKFLIP:      { name: 'Kickflip',        pts: 150 },
    HEELFLIP:      { name: 'Heelflip',        pts: 150 },
    HARDFLIP:      { name: 'Hardflip',        pts: 200 },
    IMPOSSIBLE:    { name: 'Impossible',      pts: 200 },
    GRAB_INDY:     { name: 'Indy Grab',       pts: 100 },
    GRAB_MUTE:     { name: 'Mute Grab',       pts: 100 },
    GRAB_MELON:    { name: 'Melon Grab',       pts: 120 },
    GRAB_STALEFISH:{ name: 'Stalefish',        pts: 140 },
    SPIN_180:      { name: '180',              pts: 80  },
    SPIN_360:      { name: '360',              pts: 200 },
    SPIN_540:      { name: '540',              pts: 400 },
    GRIND_50_50:   { name: '50-50',            pts: 100, grind: true },
    GRIND_5_0:     { name: '5-0 Grind',        pts: 130, grind: true },
    GRIND_NOSEGRIND:{ name: 'Nosegrind',       pts: 130, grind: true },
    GRIND_BOARDSLIDE:{ name: 'Boardslide',     pts: 120, grind: true },
    GRIND_NOSESLIDE:{ name: 'Noseslide',       pts: 140, grind: true },
    GRIND_SMITH:   { name: 'Smith Grind',      pts: 150, grind: true },
  };

  // ─── Combo State ───────────────────────────────
  let comboScore    = 0;
  let comboCount    = 0;
  let totalScore    = 0;
  let comboTimer    = 0;   // grind combo stays alive while grinding
  let lastTrickName = '';
  let isComboActive = false;
  let grindPtsPerSec = 80;
  let respectPts    = 0;
  let onTrickCb     = null;
  let onBailCb      = null;
  let onRespectCb   = null;
  let spinAccum     = 0;
  let spinResolved  = false;

  // Tutorial tracking
  const tutorialProgress = {
    ollies: 0, flipTricks: 0, grinds: 0, spins: 0
  };

  // ─── Helpers ───────────────────────────────────
  function pickFlipTrick() {
    const options = ['KICKFLIP','HEELFLIP','HARDFLIP','IMPOSSIBLE'];
    return options[Math.floor(Math.random() * options.length)];
  }

  function pickGrabTrick() {
    const options = ['GRAB_INDY','GRAB_MUTE','GRAB_MELON','GRAB_STALEFISH'];
    return options[Math.floor(Math.random() * options.length)];
  }

  function pickGrindTrick() {
    const options = ['GRIND_50_50','GRIND_5_0','GRIND_NOSEGRIND','GRIND_BOARDSLIDE','GRIND_NOSESLIDE','GRIND_SMITH'];
    return options[Math.floor(Math.random() * options.length)];
  }

  // ─── Register Trick ────────────────────────────
  function doTrick(key) {
    const def = TRICKS[key];
    if (!def) return;

    comboCount++;
    comboScore += def.pts * Math.max(1, Math.floor(comboCount * 0.5));
    lastTrickName = def.name;
    isComboActive = true;
    comboTimer = 1.5;  // must land within this time

    // Respect
    respectPts = Math.min(1000, respectPts + Math.floor(def.pts * 0.2));

    // Tutorial tracking
    if (key === 'OLLIE') tutorialProgress.ollies++;
    if (def.name.includes('flip') || def.name.includes('Flip')) tutorialProgress.flipTricks++;
    if (def.grind) tutorialProgress.grinds++;

    if (onTrickCb) onTrickCb(def.name, def.pts * Math.max(1, Math.floor(comboCount * 0.5)), comboCount);
    return def.pts;
  }

  function doOllie() {
    AudioSys.sfxOllie();
    doTrick('OLLIE');
    tutorialProgress.ollies++;
  }

  function doFlip() {
    AudioSys.sfxFlipTrick();
    doTrick(pickFlipTrick());
    tutorialProgress.flipTricks++;
  }

  function doGrab() {
    AudioSys.sfxGrabTrick();
    doTrick(pickGrabTrick());
  }

  function startGrind() {
    if (!isComboActive) { isComboActive = true; comboCount = 1; }
    AudioSys.sfxGrindStart();
    const key = pickGrindTrick();
    doTrick(key);
    tutorialProgress.grinds++;
    return key;
  }

  function updateGrind(dt) {
    if (!isComboActive) return;
    const pts = Math.floor(grindPtsPerSec * dt * comboCount);
    comboScore += pts;
    totalScore += pts;
    respectPts = Math.min(1000, respectPts + Math.floor(pts * 0.1));
  }

  function stopGrind() {
    AudioSys.stopGrind();
  }

  // Spin tracking (accumulates yaw delta while airborne)
  function trackSpin(yawDelta) {
    spinAccum += Math.abs(yawDelta);
  }

  function resolveSpin() {
    if (spinResolved) return;
    const deg = THREE.MathUtils.radToDeg(spinAccum);
    if (deg >= 450 && deg < 630) {
      doTrick('SPIN_540'); AudioSys.sfxSpin();
      tutorialProgress.spins++;
    } else if (deg >= 270 && deg < 450) {
      doTrick('SPIN_360'); AudioSys.sfxSpin();
      tutorialProgress.spins++;
    } else if (deg >= 130 && deg < 270) {
      doTrick('SPIN_180'); AudioSys.sfxSpin();
      tutorialProgress.spins++;
    }
    spinAccum = 0;
    spinResolved = true;
  }

  function resetSpin() {
    spinAccum = 0;
    spinResolved = false;
  }

  // ─── Land ──────────────────────────────────────
  function land(hardLand) {
    AudioSys.sfxLand();
    if (!isComboActive) return;

    if (hardLand) {
      bail();
      return;
    }

    // Multiply by air-time quality (simplified: fixed multiplier)
    const finalPts = Math.floor(comboScore * 1.5);
    totalScore += finalPts;
    respectPts = Math.min(1000, respectPts + Math.floor(finalPts * 0.15));

    if (onRespectCb) onRespectCb(respectPts);
    if (onTrickCb)   onTrickCb('LAND', finalPts, comboCount);

    isComboActive = false;
    comboScore = 0;
    comboCount = 0;
  }

  // ─── Bail ──────────────────────────────────────
  function bail() {
    AudioSys.sfxBail();
    CameraController.shake(0.6, 0.4);
    isComboActive = false;
    comboScore = 0;
    comboCount = 0;
    spinAccum = 0;
    if (onBailCb) onBailCb();
  }

  // ─── Update tick ───────────────────────────────
  function update(dt) {
    if (isComboActive && comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0 && comboCount > 0) {
        // Combo expired without landing → bail
        bail();
      }
    }
  }

  // ─── Setters ───────────────────────────────────
  function onTrick(cb)   { onTrickCb = cb; }
  function onBail(cb)    { onBailCb = cb; }
  function onRespect(cb) { onRespectCb = cb; }

  function resetRespect() { respectPts = 0; }
  function addRespect(v)  { respectPts = Math.min(1000, respectPts + v); if (onRespectCb) onRespectCb(respectPts); }

  // ─── Getters ───────────────────────────────────
  function getTotalScore()     { return totalScore; }
  function getComboScore()     { return comboScore; }
  function getComboCount()     { return comboCount; }
  function getRespectPts()     { return respectPts; }
  function isInCombo()         { return isComboActive; }
  function getTutorialProgress() { return tutorialProgress; }

  function resetSession() {
    comboScore = 0; comboCount = 0; totalScore = 0;
    isComboActive = false; comboTimer = 0;
    spinAccum = 0; spinResolved = false;
  }

  return {
    doOllie, doFlip, doGrab,
    startGrind, updateGrind, stopGrind,
    trackSpin, resolveSpin, resetSpin,
    land, bail, update,
    onTrick, onBail, onRespect,
    addRespect, resetRespect, resetSession,
    getTotalScore, getComboScore, getComboCount,
    getRespectPts, isInCombo, getTutorialProgress
  };
})();
