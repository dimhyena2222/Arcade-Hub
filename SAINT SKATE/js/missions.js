/* ═══════════════════════════════════════════════
   SAINT SKATE — Mission System
   All 4 + tutorial story beats
═══════════════════════════════════════════════ */

const MissionSys = (() => {

  let currentMission = 'tutorial';
  let missionData    = {};
  let timerActive    = false;
  let timerRemaining = 0;
  let onComplete     = null;
  let tutStep        = 0;
  let tutPromptTimer = 0;
  let tutComplete    = false;

  // ─── State per mission ─────────────────────────
  const state = {
    tutorial: {
      olliesDone: 0,   olliesNeeded: 3,
      flipsDone:  0,   flipsNeeded:  1,
      grindsDone: 0,   grindsNeeded: 1,
      spinsDone:  0,   spinsNeeded:  1,
    },
    mission1: {
      comboTarget: 500,
      achieved: false,
    },
    mission2: {
      railsHit:    0,
      railsNeeded: 3,
      bails:       0,
    },
    mission3: {
      comboTarget: 1000,
      achieved: false,
      timerStarted: false,
    },
    final: {
      reachedPlaza:    false,
      reachedRooftop:  false,
      comboUnbroken:   true,
    }
  };

  let freeSkateUnlocked = false;

  // ─── Init ──────────────────────────────────────
  function init() {
    // Hook trick events
    TrickSystem.onTrick((name, pts, combo) => {
      handleTrickEvent(name, pts, combo);
    });
    TrickSystem.onBail(() => {
      if (currentMission === 'final') state.final.comboUnbroken = false;
      if (currentMission === 'mission2') {
        state.mission2.bails++;
        // Respawn nearby
        Player.respawn();
        HUD.showHint('Bailed! Try again.');
      }
    });
  }

  // ─── Tutorial ──────────────────────────────────
  function startTutorial() {
    currentMission = 'tutorial';
    HUD.setObjectives([
      'Land 3 ollies',
      'Do 1 flip trick',
      'Grind 1 rail',
      'Land a 180 spin',
    ]);
    HUD.setObjective('Tutorial — WASD to move, SPACE to ollie');
    HUD.showTutorialArrow('↓ SKATE HERE');
    HUD.showHint('→ WASD to move. Hold SHIFT for speed.', 5000);

    tutStep = 0;
    scheduleNextTutHint();
  }

  const TUT_HINTS = [
    { delay: 5000,  text: '→ Press SPACE to ollie.' },
    { delay: 12000, text: '→ LMB while airborne — Flip Trick!' },
    { delay: 20000, text: '→ Skate near a rail and press E — Grind!' },
    { delay: 30000, text: '→ Q / E while in air to spin. Land a 180!' },
  ];
  let tutHintIdx = 0;
  function scheduleNextTutHint() {
    if (tutHintIdx >= TUT_HINTS.length) return;
    const h = TUT_HINTS[tutHintIdx++];
    setTimeout(() => {
      if (currentMission === 'tutorial') HUD.showHint(h.text, 5000);
      scheduleNextTutHint();
    }, h.delay);
  }

  function checkTutorialProgress() {
    if (tutComplete) return;
    const tp = TrickSystem.getTutorialProgress();
    const s  = state.tutorial;
    s.olliesDone = tp.ollies;
    s.flipsDone  = tp.flipTricks;
    s.grindsDone = tp.grinds;
    s.spinsDone  = tp.spins;

    // Update objective checkmarks
    if (s.olliesDone >= s.olliesNeeded) HUD.completeObjective(0);
    if (s.flipsDone  >= s.flipsNeeded)  HUD.completeObjective(1);
    if (s.grindsDone >= s.grindsNeeded) HUD.completeObjective(2);
    if (s.spinsDone  >= s.spinsNeeded)  HUD.completeObjective(3);

    const done = s.olliesDone >= s.olliesNeeded &&
                 s.flipsDone  >= s.flipsNeeded  &&
                 s.grindsDone >= s.grindsNeeded &&
                 s.spinsDone  >= s.spinsNeeded;

    if (done) {
      tutComplete = true;
      HUD.hideTutorialArrow();
      HUD.showHint('Tutorial Complete! Head to the skatepark.', 4000);
      AudioSys.sfxMissionComplete();
      setTimeout(() => startMission1(), 4000);
    }
  }

  // ─── Mission 1 — Wake the Park ─────────────────
  function startMission1() {
    currentMission = 'mission1';
    Player.warpTo(-22, 1, -22);
    Player.setCheckpoint(new THREE.Vector3(-22, 1, -22));
    HUD.showMission('MISSION 1', '"Wake the Park"');
    HUD.setObjective('Land a combo worth 500+ points');
    HUD.setObjectives(['Land a 500-point combo']);
    TrickSystem.resetSession();
  }

  // ─── Mission 2 — Claim the Streets ─────────────
  function startMission2() {
    currentMission = 'mission2';
    state.mission2.railsHit = 0;
    Player.warpTo(25, 1, -25);
    Player.setCheckpoint(new THREE.Vector3(25, 1, -25));
    HUD.showMission('MISSION 2', '"Claim the Streets"');
    HUD.setObjective('Hit 3 marked rails without bailing (0/3)');
    HUD.setObjectives([
      'Grind Rail 1',
      'Grind Rail 2',
      'Grind Rail 3',
    ]);
    // Spawn security
    NPCSys.spawnSecurity();
    // Spawn a few plaza skaters
    NPCSys.spawnIdleSkaters('plaza');

    // Dialogue with first NPC
    setTimeout(() => {
      Cutscenes.showDialogue([
        { text: '"Didn\'t think anyone still skated here."' },
        { text: '"Watch out for the guard though."' },
      ]);
    }, 2000);
  }

  // ─── Mission 3 — Tag the Line ──────────────────
  function startMission3() {
    currentMission = 'mission3';
    Player.warpTo(-25, 1, 25);
    Player.setCheckpoint(new THREE.Vector3(-25, 1, 25));
    HUD.showMission('MISSION 3', '"Tag the Line"');
    HUD.setObjective('F near graffiti wall, then hit 1000+ combo in 60 sec');
    HUD.setObjectives([
      'Find the graffiti wall (F to interact)',
      'Land a 1000-point combo in 60 seconds',
    ]);
    NPCSys.spawnIdleSkaters('alley');
    AudioSys.startIntenseAmbient();
  }

  // ─── Final Mission — Concrete Revival ──────────
  function startFinalMission() {
    currentMission = 'final';
    state.final.reachedPlaza   = false;
    state.final.reachedRooftop = false;
    state.final.comboUnbroken  = true;
    Player.warpTo(-22, 1, -22);
    Player.setCheckpoint(new THREE.Vector3(-22, 1, -22));
    HUD.showMission('FINAL MISSION', '"Concrete Revival"');
    HUD.setObjective('Skate the full district line — Skatepark → Plaza → Rooftop');
    HUD.setObjectives([
      'Clear the skatepark',
      'Reach Downtown Plaza',
      'Reach the Rooftop',
    ]);
    HUD.showTutorialArrow('↓ Follow the arrows →');
    TrickSystem.resetSession();
  }

  // ─── Interact check ────────────────────────────
  function checkInteract(playerPos) {
    if (currentMission !== 'mission3') return;
    const wall = World.getGraffitiWall();
    if (!wall) return;
    const dist = playerPos.distanceTo(wall.position);
    if (dist < 5) {
      HUD.completeObjective(0);
      HUD.setObjective('Now hit a 1000-point combo! (60 sec)');
      startMission3Timer();
    }
  }

  function startMission3Timer() {
    if (state.mission3.timerStarted) return;
    state.mission3.timerStarted = true;
    timerActive = true;
    timerRemaining = 60;
    HUD.showTimer(timerRemaining);
    TrickSystem.resetSession();
  }

  // ─── Trick event handler ───────────────────────
  function handleTrickEvent(name, pts, combo) {
    if (currentMission === 'tutorial')  checkTutorialProgress();

    if (currentMission === 'mission1') {
      if (name === 'LAND') {
        const total = TrickSystem.getTotalScore();
        HUD.setObjective(`Land a combo worth 500+ points (${total} / 500)`);
        if (total >= 500 && !state.mission1.achieved) {
          state.mission1.achieved = true;
          completeMission1();
        }
      }
    }

    if (currentMission === 'mission2') {
      if (name === 'LAND' && TrickSystem.getTutorialProgress().grinds > 0) {
        // A grind was part of the landed combo
        const prevGrinds = state.mission2.railsHit;
        const newGrinds = Math.min(3, TrickSystem.getTutorialProgress().grinds);
        if (newGrinds > prevGrinds) {
          state.mission2.railsHit = newGrinds;
          HUD.completeObjective(newGrinds - 1);
          HUD.setObjective(`Hit 3 marked rails (${state.mission2.railsHit}/3)`);
          if (state.mission2.railsHit >= 3) completeMission2();
        }
      }
    }

    if (currentMission === 'mission3' && state.mission3.timerStarted) {
      if (name === 'LAND') {
        const total = TrickSystem.getTotalScore();
        HUD.setObjective(`Combo target: 1000 pts (${total} / 1000)`);
        if (total >= 1000 && !state.mission3.achieved) {
          state.mission3.achieved = true;
          completeMission3();
        }
      }
    }

    if (currentMission === 'final') {
      checkFinalProgress();
    }
  }

  // ─── Zone-based final mission progression ──────
  function checkFinalProgress(playerPos) {
    if (!playerPos) return;

    if (!state.final.reachedPlaza && World.inZoneCheck('plaza', playerPos)) {
      state.final.reachedPlaza = true;
      HUD.completeObjective(1);
      HUD.setObjective('Keep going — reach the Rooftop!');
      HUD.showHint('Plaza reached! Go to the Rooftop →', 3000);
    }

    if (!state.final.reachedRooftop && World.inZoneCheck('rooftop', playerPos) && state.final.reachedPlaza) {
      state.final.reachedRooftop = true;
      HUD.completeObjective(2);
      completeFinalMission();
    }
  }

  // ─── Completions ───────────────────────────────
  function completeMission1() {
    AudioSys.sfxMissionComplete();
    HUD.completeObjective(0);
    NPCSys.spawnIdleSkaters('skatepark');

    Cutscenes.showDialogue([
      { text: '"Didn\'t think anyone still skated here."' },
      { text: '"The plaza\'s further downtown. Go check it out."' },
    ]);

    TrickSystem.addRespect(200);
    setTimeout(() => startMission2(), 4500);
  }

  function completeMission2() {
    AudioSys.sfxMissionComplete();
    HUD.completeObjective(2);
    TrickSystem.addRespect(250);
    HUD.showHint('Streets claimed! Head to the alley.', 4000);
    setTimeout(() => startMission3(), 4500);
  }

  function completeMission3() {
    timerActive = false;
    HUD.hideTimer();
    AudioSys.sfxMissionComplete();
    TrickSystem.addRespect(300);
    N = NPCSys.spawnIdleSkaters('alley');
    Cutscenes.playMission3Success(() => {
      setTimeout(() => startFinalMission(), 2000);
    });
  }
  let N; // temp ref

  function completeFinalMission() {
    timerActive = false;
    Player.freeze(true);
    AudioSys.sfxMissionComplete();
    NPCSys.spawnIdleSkaters('rooftop');
    TrickSystem.addRespect(400);

    const ending = state.final.comboUnbroken ? 'PERFECT ENDING' : 'GOOD ENDING';
    HUD.setObjective(ending + ' — District Revived!');

    setTimeout(() => {
      Cutscenes.playFinalCutscene(() => {
        showCredits();
      });
    }, 1500);
  }

  function showCredits() {
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('credits-screen').classList.remove('hidden');
    freeSkateUnlocked = true;
    localStorage.setItem('ss_freeskate', '1');

    document.getElementById('btn-credits-done').addEventListener('click', () => {
      document.getElementById('credits-screen').classList.add('hidden');
      returnToMenu();
    });
  }

  function returnToMenu() {
    document.getElementById('title-screen').classList.remove('hidden');
    const fsBtn = document.getElementById('btn-freeskate');
    fsBtn.classList.remove('locked');
    fsBtn.innerHTML = 'FREE SKATE';
    Player.freeze(true);
    GameState.setPhase('menu');
  }

  // ─── Timer update ──────────────────────────────
  function update(dt, playerPos) {
    if (timerActive) {
      timerRemaining -= dt;
      HUD.updateTimer(Math.max(0, timerRemaining));
      if (timerRemaining <= 0) {
        timerActive = false;
        HUD.hideTimer();
        if (currentMission === 'mission3' && !state.mission3.achieved) {
          // Restart mission 3 timer
          HUD.showHint('Time\'s up! Try again.', 3000);
          state.mission3.timerStarted = false;
          TrickSystem.resetSession();
        }
      }
    }

    // Final mission zone check
    if (currentMission === 'final' && playerPos) {
      checkFinalProgress(playerPos);
    }
  }

  function isFreeskateUnlocked() {
    return freeSkateUnlocked || localStorage.getItem('ss_freeskate') === '1';
  }

  function getCurrent() { return currentMission; }

  return {
    init, startTutorial, startMission1, startMission2,
    startMission3, startFinalMission, checkInteract,
    handleTrickEvent, update, isFreeskateUnlocked,
    getCurrent, returnToMenu
  };
})();
