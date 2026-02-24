/* ═══════════════════════════════════════════════
   SAINT SKATE — NPC System
   Idle skaters + Security patrol AI
═══════════════════════════════════════════════ */

const NPCSys = (() => {

  let scene = null;
  let npcs  = [];

  const MAT = {
    skater1: new THREE.MeshLambertMaterial({ color: 0x00FFB2, flatShading: true }),
    skater2: new THREE.MeshLambertMaterial({ color: 0xFFEC3A, flatShading: true }),
    skater3: new THREE.MeshLambertMaterial({ color: 0xFF3366, flatShading: true }),
    body:    new THREE.MeshLambertMaterial({ color: 0x3a4a5c, flatShading: true }),
    skin:    new THREE.MeshLambertMaterial({ color: 0xF5C99A, flatShading: true }),
    sec:     new THREE.MeshLambertMaterial({ color: 0x334455, flatShading: true }),
    board:   new THREE.MeshLambertMaterial({ color: 0xFFEC3A, flatShading: true }),
  };

  // ─── Build a low-poly NPC ──────────────────────
  function buildNPC(color) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color, flatShading: true });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.28), bodyMat);
    body.position.y = 0.55;

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), MAT.skin);
    head.position.y = 1.04;

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.18), MAT.body);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.18), MAT.body);
    legL.position.set(-0.13, 0.1, 0);
    legR.position.set(0.13, 0.1, 0);
    legL.name = 'legL'; legR.name = 'legR';

    // Board
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.07, 0.22), MAT.board);
    board.position.y = -0.25;
    board.name = 'board';

    g.add(body, head, legL, legR, board);
    g.castShadow = true;
    return g;
  }

  // ─── Spawn skater NPCs (appear after missions) ─
  function spawnIdleSkaters(zone) {
    const spawns = {
      skatepark: [
        { x: -20, z: -18, color: 0x00FFB2 },
        { x: -35, z: -30, color: 0xFF3366 },
      ],
      plaza: [
        { x: 15,  z: -18, color: 0xFFEC3A },
        { x: 38,  z: -30, color: 0x00FFB2 },
      ],
      alley: [
        { x: -20, z: 22, color: 0xFF3366 },
        { x: -30, z: 40, color: 0xFFAA00 },
      ],
      rooftop: [
        { x: 12,  z: 12, color: 0x00FFB2 },
        { x: 38,  z: 38, color: 0xFF7B3A },
      ]
    };

    const list = spawns[zone] || [];
    list.forEach(s => {
      const npc = buildNPC(s.color);
      const startY = World.getGroundY(new THREE.Vector3(s.x, 5, s.z));
      npc.position.set(s.x, Math.max(0, startY) + 0.3, s.z);
      scene.add(npc);
      npcs.push({
        mesh: npc,
        type: 'skater',
        idleTime:  0,
        moveTimer: Math.random() * 2 + 1,
        moveDir:   new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        moveZone:  { cx: s.x, cz: s.z, r: 8 },
        phase: 'idle',
        phaseTimer: 0,
        legPhase: Math.random() * Math.PI * 2,
      });
    });
  }

  // ─── Security NPC ──────────────────────────────
  function spawnSecurity() {
    const secG = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x334455, flatShading: true });
    const capMat  = new THREE.MeshLambertMaterial({ color: 0x222233, flatShading: true });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), bodyMat);
    body.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), MAT.skin);
    head.position.y = 1.08;
    const cap  = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.38), capMat);
    cap.position.y = 1.3;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), bodyMat);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), bodyMat);
    legL.position.set(-0.14, 0.08, 0); legL.name = 'legL';
    legR.position.set(0.14,  0.08, 0); legR.name = 'legR';

    secG.add(body, head, cap, legL, legR);
    secG.position.set(35, 0.3, -35);
    secG.castShadow = true;
    scene.add(secG);

    // Patrol waypoints in plaza
    const waypoints = [
      new THREE.Vector3(30, 0.3, -30),
      new THREE.Vector3(45, 0.3, -30),
      new THREE.Vector3(45, 0.3, -45),
      new THREE.Vector3(30, 0.3, -45),
    ];

    npcs.push({
      mesh: secG,
      type: 'security',
      waypoints,
      wpIdx: 0,
      speed: 2.5,
      legPhase: 0,
      alert: false,
      alertTimer: 0,
    });

    return secG;
  }

  // ─── Update all NPCs ───────────────────────────
  function update(dt, playerPos) {
    npcs.forEach(npc => {
      if (npc.type === 'skater') updateSkater(npc, dt);
      if (npc.type === 'security') updateSecurity(npc, dt, playerPos);
    });
  }

  function updateSkater(npc, dt) {
    npc.phaseTimer += dt;
    npc.legPhase   += dt * 3;

    // Simple idle bob / move
    switch (npc.phase) {
      case 'idle': {
        // Subtle body sway
        npc.mesh.rotation.y += Math.sin(npc.phaseTimer * 0.8) * 0.002;
        if (npc.phaseTimer > npc.moveTimer) {
          npc.phase = 'skate';
          npc.phaseTimer = 0;
          npc.moveTimer = Math.random() * 1.5 + 0.8;
          npc.moveDir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        }
        break;
      }
      case 'skate': {
        const spd = 3.5;
        npc.mesh.position.x += npc.moveDir.x * spd * dt;
        npc.mesh.position.z += npc.moveDir.z * spd * dt;
        npc.mesh.rotation.y = Math.atan2(npc.moveDir.x, npc.moveDir.z);

        // Leg animation
        npc.mesh.traverse(o => {
          if (o.name === 'legL') o.rotation.x = Math.sin(npc.legPhase) * 0.4;
          if (o.name === 'legR') o.rotation.x = -Math.sin(npc.legPhase) * 0.4;
        });

        // Zone bounds
        const dx = npc.mesh.position.x - npc.moveZone.cx;
        const dz = npc.mesh.position.z - npc.moveZone.cz;
        if (Math.sqrt(dx*dx + dz*dz) > npc.moveZone.r) {
          npc.moveDir.x = -npc.moveDir.x;
          npc.moveDir.z = -npc.moveDir.z;
        }

        if (npc.phaseTimer > npc.moveTimer) {
          npc.phase = 'idle';
          npc.phaseTimer = 0;
          npc.moveTimer = Math.random() * 3 + 1.5;
        }
        break;
      }
    }

    // Ground snap
    const gy = World.getGroundY(npc.mesh.position);
    if (gy > -900) npc.mesh.position.y = gy + 0.3;
  }

  function updateSecurity(npc, dt, playerPos) {
    npc.legPhase += dt * 2;

    const target = npc.waypoints[npc.wpIdx];
    const dir = new THREE.Vector3().subVectors(target, npc.mesh.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.5) {
      // Advance to next waypoint
      npc.wpIdx = (npc.wpIdx + 1) % npc.waypoints.length;
    } else {
      dir.normalize();
      npc.mesh.position.x += dir.x * npc.speed * dt;
      npc.mesh.position.z += dir.z * npc.speed * dt;
      npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }

    // Leg walk animation
    npc.mesh.traverse(o => {
      if (o.name === 'legL') o.rotation.x =  Math.sin(npc.legPhase) * 0.5;
      if (o.name === 'legR') o.rotation.x = -Math.sin(npc.legPhase) * 0.5;
    });

    // Alert if player too close
    const playerDist = npc.mesh.position.distanceTo(playerPos);
    if (playerDist < 4) {
      if (!npc.alert) {
        npc.alert = true;
        HUD.showHint('SECURITY NEARBY — Move away!');
      }
    } else {
      npc.alert = false;
    }
  }

  // ─── Dialogue popup ────────────────────────────
  function triggerDialogue(npcIdx, lines) {
    if (!npcs[npcIdx]) return;
    Cutscenes.showDialogue(lines);
  }

  function init(sc) { scene = sc; }
  function clear()  { npcs.forEach(n => scene && scene.remove(n.mesh)); npcs = []; }

  return {
    init, clear, update,
    spawnIdleSkaters, spawnSecurity, triggerDialogue
  };
})();
