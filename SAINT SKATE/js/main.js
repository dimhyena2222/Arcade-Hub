/* ═══════════════════════════════════════════════
   SAINT SKATE — Main Entry Point
   Game state, renderer setup, main loop
═══════════════════════════════════════════════ */

// ─── Global Game State ─────────────────────────
const GameState = (() => {
  let phase = 'menu'; // menu | cutscene | playing | paused | credits
  const cb = {};

  function setPhase(p) {
    const old = phase;
    phase = p;
    if (cb[p]) cb[p](old);
  }
  function onPhase(p, fn) { cb[p] = fn; }
  return { get phase() { return phase; }, setPhase, onPhase };
})();

// ─── Main ──────────────────────────────────────
(function init() {

  /* ── Renderer ─────────────────────────────── */
  const canvas   = document.getElementById('gameCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.outputEncoding    = THREE.sRGBEncoding;

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  /* ── Scene + Camera ───────────────────────── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 10, 20);

  /* ── Subsystem init ───────────────────────── */
  AudioSys.init();
  CameraController.init(camera);
  World.build(scene, renderer);
  Player.buildMesh(scene);
  Player.setupInput();
  NPCSys.init(scene);
  HUD.init();
  Cutscenes.init();
  MissionSys.init();

  /* ── Pause menu wiring ────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (GameState.phase === 'playing') pause();
      else if (GameState.phase === 'paused') resume();
    }
  });

  document.getElementById('btn-resume').addEventListener('click', resume);
  document.getElementById('btn-restart').addEventListener('click', restartMission);
  document.getElementById('btn-options').addEventListener('click', openOptions);
  document.getElementById('btn-quit').addEventListener('click', quitToMenu);
  document.getElementById('btn-options-back').addEventListener('click', closeOptions);

  document.getElementById('opt-music').addEventListener('input', e => {
    AudioSys.setMusicVol(e.target.value / 100);
  });
  document.getElementById('opt-sfx').addEventListener('input', e => {
    AudioSys.setSfxVol(e.target.value / 100);
  });
  document.getElementById('opt-sens').addEventListener('input', e => {
    CameraController.setSensitivity(parseInt(e.target.value));
  });

  /* ── Title screen ────────────────────────── */
  document.getElementById('btn-start').addEventListener('click', () => {
    AudioSys.resume();
    startGame();
  });
  document.getElementById('btn-freeskate').addEventListener('click', () => {
    if (MissionSys.isFreeskateUnlocked()) {
      AudioSys.resume();
      startFreeSkate();
    }
  });

  // Show freeskate if previously unlocked
  if (MissionSys.isFreeskateUnlocked()) {
    const fsBtn = document.getElementById('btn-freeskate');
    fsBtn.classList.remove('locked');
    fsBtn.innerHTML = 'FREE SKATE';
  }

  /* ── Game start ──────────────────────────── */
  function startGame() {
    document.getElementById('title-screen').classList.add('hidden');
    AudioSys.startAmbient();
    HUD.show();
    Player.freeze(true);
    Player.warpTo(-22, 1, -22);
    GameState.setPhase('cutscene');

    // Opening cutscene → tutorial
    Cutscenes.playOpening(() => {
      Player.freeze(false);
      MissionSys.startTutorial();
      GameState.setPhase('playing');
    });
  }

  /* ── Free Skate mode ─────────────────────── */
  function startFreeSkate() {
    document.getElementById('title-screen').classList.add('hidden');
    AudioSys.startAmbient();
    HUD.show();
    Player.freeze(false);
    Player.warpTo(-22, 1, -22);
    GameState.setPhase('playing');
    HUD.setObjective('FREE SKATE — All zones open. No limits.');
    HUD.showHint('Free Skate Mode — Explore & set a high score!', 5000);
    TrickSystem.resetSession();
  }

  /* ── Pause / Resume ──────────────────────── */
  function pause() {
    GameState.setPhase('paused');
    document.getElementById('pause-menu').classList.remove('hidden');
    document.exitPointerLock && document.exitPointerLock();
  }

  function resume() {
    GameState.setPhase('playing');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('options-panel').classList.add('hidden');
  }

  function restartMission() {
    resume();
    const m = MissionSys.getCurrent();
    TrickSystem.resetSession();
    if (m === 'mission1') MissionSys.startMission1();
    else if (m === 'mission2') MissionSys.startMission2();
    else if (m === 'mission3') MissionSys.startMission3();
    else if (m === 'final')   MissionSys.startFinalMission();
    else MissionSys.startTutorial();
  }

  function openOptions() {
    document.getElementById('options-panel').classList.remove('hidden');
  }
  function closeOptions() {
    document.getElementById('options-panel').classList.add('hidden');
  }

  function quitToMenu() {
    resume();
    MissionSys.returnToMenu();
    TrickSystem.resetSession();
    HUD.hide();
    AudioSys.stopAmbient();
  }

  /* ── Graphics quality ────────────────────── */
  document.getElementById('opt-gfx').addEventListener('change', e => {
    switch (e.target.value) {
      case 'low':    renderer.setPixelRatio(1);   renderer.shadowMap.enabled = false; break;
      case 'medium': renderer.setPixelRatio(1.5); renderer.shadowMap.enabled = true;  break;
      case 'high':   renderer.setPixelRatio(window.devicePixelRatio); break;
    }
  });

  /* ── Main loop ───────────────────────────── */
  let lastTime = 0;

  function loop(ts) {
    requestAnimationFrame(loop);

    const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = ts;

    if (GameState.phase === 'playing') {
      Player.update(dt);
      const playerPos = Player.getPos();
      CameraController.update(playerPos, dt);
      TrickSystem.update(dt);
      NPCSys.update(dt, playerPos);
      MissionSys.update(dt, playerPos);
      HUD.update(dt, playerPos);
      World.update(dt);
      Cutscenes.update(dt);
    }

    if (GameState.phase === 'cutscene') {
      // Still allow camera to animate during cutscenes
      const pp = Player.getPos();
      CameraController.update(pp, dt);
      Cutscenes.update(dt);
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(loop);

})();
