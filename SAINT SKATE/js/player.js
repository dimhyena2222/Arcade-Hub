/* ═══════════════════════════════════════════════
   SAINT SKATE — Player Controller
   Skateboard physics: momentum, jumping, grinding
═══════════════════════════════════════════════ */

const Player = (() => {

  // ─── Config ────────────────────────────────────
  const CFG = {
    walkSpeed:      8,
    pushAccel:      18,
    maxSpeed:       22,
    friction:       4,
    airFriction:    0.4,
    gravity:        28,
    jumpForce:      12,
    crouchBoost:    1.4,
    airControl:     0.35,
    spinSpeed:      4.5,      // rad/s Q/E spin
    groundCheckDist:0.4,
    height:         1.0,
    grindSnap:      1.8,      // max distance to snap to rail
    grindSpeed:     10,
  };

  // ─── State ─────────────────────────────────────
  let mesh = null;       // THREE.Group — the skater
  let scene = null;
  let pos    = new THREE.Vector3(0, 1, 0);
  let vel    = new THREE.Vector3();
  let facingYaw = 0;     // which way player faces
  let isGrounded  = false;
  let isJumping   = false;
  let isGrinding  = false;
  let isCrouching = false;
  let isAirborne  = false;
  let airTime     = 0;
  let lastGroundY = 0;
  let checkpointPos = new THREE.Vector3(-22, 1, -22);
  let frozenInput = false;

  // Grind state
  let currentRail  = null;
  let grindT       = 0;     // 0..1 along rail
  let grindDir     = 1;

  // Keys
  const keys = {};
  const mouse = { left: false, right: false };

  // ─── Build skater mesh ─────────────────────────
  function buildMesh(sc) {
    scene = sc;
    mesh = new THREE.Group();

    const mBody = new THREE.MeshLambertMaterial({ color: 0xFF7B3A, flatShading: true });
    const mHead = new THREE.MeshLambertMaterial({ color: 0xF5C99A, flatShading: true });
    const mPants= new THREE.MeshLambertMaterial({ color: 0x2A3C52, flatShading: true });
    const mShoe = new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true });
    const mBoard= new THREE.MeshLambertMaterial({ color: 0xFFEC3A, flatShading: true });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), mBody);
    body.position.y = 0.55;

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mHead);
    head.position.y = 1.08;

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.36), new THREE.MeshLambertMaterial({ color: 0x1a0f00, flatShading: true }));
    hair.position.y = 1.32;

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), mPants);
    legL.position.set(-0.14, 0.1, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), mPants);
    legR.position.set(0.14, 0.1, 0);

    // Shoes
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.3), mShoe);
    shoeL.position.set(-0.14, -0.18, 0.04);
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.3), mShoe);
    shoeR.position.set(0.14, -0.18, 0.04);

    // Board
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.24), mBoard);
    board.position.y = -0.27;
    board.name = 'board';

    // Wheels
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    [[-0.32,-0.3,0.1],[0.32,-0.3,0.1],[-0.32,-0.3,-0.1],[0.32,-0.3,-0.1]].forEach(([x,y,z]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 6), wheelMat);
      w.position.set(x, y, z);
      w.rotation.z = Math.PI / 2;
      mesh.add(w);
    });

    mesh.add(body, head, hair, legL, legR, shoeL, shoeR, board);
    mesh.castShadow = true;
    scene.add(mesh);
    pos.set(-22, 1, -22);
    return mesh;
  }

  // ─── Input ─────────────────────────────────────
  function setupInput() {
    document.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) onSpace();
      if (e.code === 'KeyF') onInteract();
    });
    document.addEventListener('keyup', e => {
      keys[e.code] = false;
    });
    document.addEventListener('mousedown', e => {
      if (frozenInput) return;
      if (e.button === 0) { mouse.left  = true; onLeftClick(); }
      if (e.button === 2) { mouse.right = true; onRightClick(); }
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) mouse.left  = false;
      if (e.button === 2) mouse.right = false;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  function onSpace() {
    if (frozenInput || GameState.phase !== 'playing') return;
    if (isGrounded && !isGrinding) {
      jump();
    } else if (isGrinding) {
      exitGrind(true);
      jump();
    }
    // Advance cutscene
    if (GameState.phase === 'cutscene') Cutscenes.advance();
  }

  function onLeftClick() {
    if (frozenInput || GameState.phase !== 'playing') return;
    if (isAirborne) TrickSystem.doFlip();
  }

  function onRightClick() {
    if (frozenInput || GameState.phase !== 'playing') return;
    if (isAirborne) TrickSystem.doGrab();
  }

  function onInteract() {
    if (frozenInput || GameState.phase !== 'playing') return;
    MissionSys.checkInteract(pos);
  }

  // ─── Jump ──────────────────────────────────────
  function jump() {
    const boost = keys['ControlLeft'] || keys['ControlRight'] ? CFG.crouchBoost : 1.0;
    vel.y = CFG.jumpForce * boost;
    isGrounded  = false;
    isAirborne  = true;
    isJumping   = true;
    airTime     = 0;
    TrickSystem.doOllie();
    TrickSystem.resetSpin();
    AudioSys.sfxOllie();
  }

  // ─── Grind ─────────────────────────────────────
  function tryGrind() {
    const rail = World.getNearestRail(pos, CFG.grindSnap);
    if (!rail) return false;
    if (!isAirborne && !isGrounded) return false;
    // Must be coming from above
    if (vel.y > 2) return false;

    currentRail = rail;
    isGrinding  = true;
    isGrounded  = false;
    isAirborne  = false;

    // Find T along rail
    const closest = World.closestPointOnSegment(pos, rail.start, rail.end);
    const total = rail.start.distanceTo(rail.end);
    grindT   = rail.start.distanceTo(closest) / total;
    grindDir = (vel.x * (rail.end.x - rail.start.x) + vel.z * (rail.end.z - rail.start.z)) >= 0 ? 1 : -1;

    TrickSystem.startGrind();
    vel.y = 0;
    return true;
  }

  function updateGrind(dt) {
    if (!isGrinding || !currentRail) return;

    const rail = currentRail;
    const total = rail.start.distanceTo(rail.end);
    grindT += grindDir * (CFG.grindSpeed / total) * dt;

    if (grindT <= 0 || grindT >= 1) {
      exitGrind(false);
      return;
    }

    const gPos = new THREE.Vector3().lerpVectors(rail.start, rail.end, grindT);
    pos.copy(gPos);
    pos.y += CFG.height * 0.5;

    // Face along rail
    const dir = new THREE.Vector3().subVectors(rail.end, rail.start).normalize();
    facingYaw = Math.atan2(dir.x * grindDir, dir.z * grindDir);

    TrickSystem.updateGrind(dt);
  }

  function exitGrind(withJump) {
    isGrinding  = false;
    TrickSystem.stopGrind();
    if (!withJump) {
      vel.y = 2;
      isAirborne = true;
    }
    currentRail = null;
  }

  // ─── Movement ──────────────────────────────────
  function updateMovement(dt) {
    if (frozenInput || isGrinding) return;

    const camYaw = CameraController.getYaw();
    const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right   = new THREE.Vector3( Math.cos(camYaw), 0, -Math.sin(camYaw));
    const pushing = keys['ShiftLeft'] || keys['ShiftRight'];
    isCrouching   = keys['ControlLeft'] || keys['ControlRight'];

    let moveDir = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp'])    moveDir.add(forward);
    if (keys['KeyS'] || keys['ArrowDown'])  moveDir.sub(forward);
    if (keys['KeyA'] || keys['ArrowLeft'])  moveDir.sub(right);
    if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      facingYaw = Math.atan2(moveDir.x, moveDir.z);
    }

    const accel = pushing ? CFG.pushAccel : CFG.walkSpeed;
    const maxSpd = pushing ? CFG.maxSpeed : CFG.walkSpeed;

    if (isGrounded) {
      // Ground movement
      if (moveDir.lengthSq() > 0) {
        vel.x += moveDir.x * accel * dt;
        vel.z += moveDir.z * accel * dt;
      }
      // Friction
      const horizSpd = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      if (horizSpd > 0) {
        const friction = CFG.friction * dt;
        const newSpd = Math.max(0, horizSpd - friction);
        const ratio = newSpd / horizSpd;
        vel.x *= ratio; vel.z *= ratio;
      }
      // Clamp
      const spd = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      if (spd > maxSpd) { vel.x *= maxSpd / spd; vel.z *= maxSpd / spd; }

    } else {
      // Air control
      if (moveDir.lengthSq() > 0) {
        vel.x += moveDir.x * accel * CFG.airControl * dt;
        vel.z += moveDir.z * accel * CFG.airControl * dt;
      }
      // Air friction
      vel.x *= (1 - CFG.airFriction * dt);
      vel.z *= (1 - CFG.airFriction * dt);
    }

    // Q/E Spin while airborne
    if (isAirborne) {
      let spinDelta = 0;
      if (keys['KeyQ']) spinDelta += CFG.spinSpeed * dt;
      if (keys['KeyE']) spinDelta -= CFG.spinSpeed * dt;
      if (spinDelta !== 0) {
        facingYaw += spinDelta;
        TrickSystem.trackSpin(Math.abs(spinDelta));
      }
    }
  }

  // ─── Physics tick ──────────────────────────────
  function update(dt) {
    if (!mesh) return;

    if (frozenInput && !isGrinding) {
      mesh.position.copy(pos);
      return;
    }

    // Grind loop
    if (isGrinding) {
      updateGrind(dt);
      mesh.position.copy(pos);
      mesh.rotation.y = facingYaw;
      // Roll board wheels
      mesh.traverse(obj => { if (obj.name === 'board') obj.rotation.x += dt * CFG.grindSpeed * 0.5; });
      return;
    }

    updateMovement(dt);

    // Gravity
    if (!isGrounded) {
      vel.y -= CFG.gravity * dt;
      airTime += dt;
    }

    // Integrate position
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    pos.z += vel.z * dt;

    // Ground detection
    const groundY = World.getGroundY(pos);
    const groundCheck = groundY + CFG.height;

    if (pos.y <= groundCheck && vel.y <= 0) {
      const wasAirborne = isAirborne;
      pos.y = groundCheck;
      vel.y = 0;

      if (wasAirborne && airTime > 0.15) {
        // Try grind first
        if (!tryGrind()) {
          TrickSystem.resolveSpin();
          const hardLand = airTime > 1.8;
          TrickSystem.land(hardLand);
          if (hardLand) {
            CameraController.shake(0.5, 0.3);
          }
          AudioSys.sfxLand();
        }
      }

      isGrounded = true;
      isAirborne = false;
      isJumping  = false;
      airTime    = 0;
      lastGroundY = pos.y;
      TrickSystem.resetSpin();

    } else if (pos.y > groundCheck + 0.1 && isGrounded) {
      isGrounded = false;
      isAirborne = true;
    }

    // Fell off world
    if (pos.y < -10) respawn();

    // Clamp to world bounds
    pos.x = Math.max(-55, Math.min(55, pos.x));
    pos.z = Math.max(-55, Math.min(55, pos.z));

    // Update mesh
    mesh.position.copy(pos);
    mesh.position.y -= CFG.height * 0.3;
    mesh.rotation.y = facingYaw;

    // Board lean on slopes (cosmetic)
    mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, vel.x * -0.02, 0.2);
    mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, vel.z * 0.01, 0.2);

    // Spin while in air
    if (isAirborne) {
      mesh.rotation.y = facingYaw;
    }

    // Wheel spin (roll effect on board geo)
    const spd = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    mesh.traverse(obj => {
      if (obj.parent === mesh || !obj.name) return;
    });

    // Update audio roll
    if (isGrounded && spd > 0.5) {
      AudioSys.startRoll(spd / CFG.maxSpeed);
      AudioSys.updateRoll(spd / CFG.maxSpeed);
    } else if (!isGrounded || spd < 0.5) {
      AudioSys.stopRoll();
    }

    // Reset key
    if (keys['KeyR']) respawn();
  }

  function respawn() {
    pos.copy(checkpointPos);
    vel.set(0, 0, 0);
    isGrounded = true;
    isAirborne = false;
    isGrinding = false;
    TrickSystem.bail();
  }

  function setCheckpoint(p) {
    checkpointPos.copy(p);
  }

  function freeze(v) { frozenInput = v; }
  function getPos()  { return pos.clone(); }
  function getVel()  { return vel.clone(); }
  function isOnGround() { return isGrounded; }
  function isInAir() { return isAirborne; }
  function isOnGrind() { return isGrinding; }

  function warpTo(x, y, z) {
    pos.set(x, y, z);
    vel.set(0, 0, 0);
    isGrounded = true; isAirborne = false; isGrinding = false;
  }

  return {
    buildMesh, setupInput, update,
    freeze, respawn, warpTo, setCheckpoint,
    getPos, getVel, isOnGround, isInAir, isOnGrind
  };
})();
