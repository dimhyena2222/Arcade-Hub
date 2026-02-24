/* ═══════════════════════════════════════════════
   SAINT SKATE — Camera Controller
   Third-person orbit camera with mouse look
═══════════════════════════════════════════════ */

const CameraController = (() => {
  const IDEAL_DISTANCE = 10;
  const IDEAL_HEIGHT   = 5;
  const PITCH_MIN      = -0.1;
  const PITCH_MAX      = 0.8;
  const SMOOTH         = 0.08;

  let camera = null;
  let yaw    = 0;
  let pitch  = 0.35;
  let sensitivity = 0.003;
  let locked = false;      // pointer lock active
  let target = new THREE.Vector3();
  let currentPos = new THREE.Vector3();
  let shakeTimer = 0;
  let shakeAmt   = 0;
  let cutsceneMode = false;
  let cutsceneTarget = new THREE.Vector3();
  let cutscenePos    = new THREE.Vector3();

  function init(cam) {
    camera = cam;
    setupPointerLock();
  }

  function setupPointerLock() {
    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('click', () => {
      if (!cutsceneMode && GameState.phase === 'playing') {
        canvas.requestPointerLock();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!locked || cutsceneMode) return;
      yaw   -= e.movementX * sensitivity;
      pitch += e.movementY * sensitivity;
      pitch  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch));
    });
  }

  function update(playerPos, dt) {
    if (!camera) return;

    if (cutsceneMode) {
      currentPos.lerp(cutscenePos, 0.03);
      camera.position.copy(currentPos);
      camera.lookAt(cutsceneTarget);
      return;
    }

    target.copy(playerPos).add(new THREE.Vector3(0, 1.2, 0));

    const sx = Math.sin(yaw) * Math.cos(pitch);
    const sy = Math.sin(pitch);
    const sz = Math.cos(yaw) * Math.cos(pitch);

    const desired = new THREE.Vector3(
      target.x - sx * IDEAL_DISTANCE,
      target.y + sy * IDEAL_DISTANCE + IDEAL_HEIGHT,
      target.z - sz * IDEAL_DISTANCE
    );

    currentPos.lerp(desired, SMOOTH);

    // Camera shake
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      const s = shakeAmt * (shakeTimer / 0.3);
      currentPos.x += (Math.random() - 0.5) * s;
      currentPos.y += (Math.random() - 0.5) * s;
      currentPos.z += (Math.random() - 0.5) * s;
    }

    camera.position.copy(currentPos);
    camera.lookAt(target);
  }

  function shake(amount, duration) {
    shakeAmt  = amount;
    shakeTimer = duration || 0.3;
  }

  function setSensitivity(val) {
    // val = 1..10 from options
    sensitivity = 0.001 + val * 0.0005;
  }

  function getYaw() { return yaw; }

  function startCutscene(posArr, lookAtArr) {
    cutsceneMode = true;
    cutscenePos.set(posArr[0], posArr[1], posArr[2]);
    cutsceneTarget.set(lookAtArr[0], lookAtArr[1], lookAtArr[2]);
  }

  function endCutscene() {
    cutsceneMode = false;
  }

  function setYaw(y) { yaw = y; }

  return { init, update, shake, setSensitivity, getYaw, setYaw, startCutscene, endCutscene };
})();
