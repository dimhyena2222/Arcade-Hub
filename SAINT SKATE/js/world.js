/* ═══════════════════════════════════════════════
   SAINT SKATE — World / Map
   Low-poly PSP-era district with 4 zones
═══════════════════════════════════════════════ */

const World = (() => {

  let scene = null;
  let collidables = [];   // { mesh, type: 'ground'|'wall'|'ramp'|'ledge' }
  let rails       = [];   // { mesh, start:V3, end:V3 }  — grindable
  let zones       = {};   // named bounding boxes

  // ─── Palette ─────────────────────────────────
  const COLORS = {
    ground:    0x2a2f3b,
    groundAlt: 0x242830,
    concrete:  0x4a4f5c,
    cement:    0x3a3f4a,
    orange:    0xFF7B3A,
    neon:      0x00FFB2,
    neonYellow:0xFFEC3A,
    graffiti1: 0xFF3366,
    graffiti2: 0x33FFCC,
    graffiti3: 0xFFAA00,
    metal:     0x6a7080,
    ramp:      0x353c4a,
    wood:      0x7a5c40,
    sky1:      0x1a2035,
    sky2:      0x2a1535,
    horizon:   0xFF7B3A,
    npc1:      0xFF7B3A,
    npc2:      0x00FFB2,
    security:  0x334455,
  };

  function mat(color, flat) {
    return new THREE.MeshLambertMaterial({
      color,
      flatShading: flat !== false
    });
  }

  function box(w, h, d, color, rx, ry, rz) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat(color));
    if (rx) mesh.rotation.x = rx;
    if (ry) mesh.rotation.y = ry;
    if (rz) mesh.rotation.z = rz;
    return mesh;
  }

  function addBox(sc, x, y, z, w, h, d, color, type, rx, ry, rz) {
    const m = box(w, h, d, color, rx, ry, rz);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    sc.add(m);
    if (type) collidables.push({ mesh: m, type });
    return m;
  }

  function addRail(sc, x1, y1, z1, x2, y2, z2) {
    const dir = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1);
    const len = dir.length();
    const mid = new THREE.Vector3((x1+x2)/2, (y1+y2)/2, (z1+z2)/2);
    const geo = new THREE.CylinderGeometry(0.06, 0.06, len, 6);
    const mesh = new THREE.Mesh(geo, mat(COLORS.metal));
    mesh.position.copy(mid);
    const up = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    sc.add(mesh);
    const start = new THREE.Vector3(x1, y1, z1);
    const end   = new THREE.Vector3(x2, y2, z2);
    rails.push({ mesh, start, end });
    return mesh;
  }

  // ─── Zone Helpers ──────────────────────────────
  function setZone(name, cx, cz, halfW, halfD) {
    zones[name] = { cx, cz, halfW, halfD };
  }

  function inZone(name, pos) {
    const z = zones[name];
    if (!z) return false;
    return Math.abs(pos.x - z.cx) < z.halfW && Math.abs(pos.z - z.cz) < z.halfD;
  }

  // ─── Sky / Lighting ────────────────────────────
  function buildSky(sc, renderer) {
    renderer.setClearColor(0x1a2035);

    // Ambient
    const amb = new THREE.AmbientLight(0xffd0a0, 0.5);
    sc.add(amb);

    // Sun — warm sunset
    const sun = new THREE.DirectionalLight(0xFF9955, 1.2);
    sun.position.set(50, 60, -30);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 200;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
    sun.shadow.camera.right = sun.shadow.camera.top = 80;
    sc.add(sun);

    // Neon fill from below
    const fill = new THREE.PointLight(0x00FFB2, 0.4, 60);
    fill.position.set(0, 1, 0);
    sc.add(fill);

    // Fog
    sc.fog = new THREE.FogExp2(0x1a2035, 0.018);

    // Sky plane (gradient billboard)
    const skyGeo = new THREE.PlaneGeometry(300, 300);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x1a2035, side: THREE.BackSide, fog: false });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.rotation.x = Math.PI / 2;
    skyMesh.position.y = 60;
    sc.add(skyMesh);
  }

  // ─── Ground Base ───────────────────────────────
  function buildGround(sc) {
    // Main ground plane
    const ground = addBox(sc, 0, -0.5, 0, 200, 1, 200, COLORS.ground, 'ground');
    ground.receiveShadow = true;

    // Ground variation tiles
    for (let i = -4; i <= 4; i++) {
      for (let j = -4; j <= 4; j++) {
        if ((i + j) % 3 === 0) {
          addBox(sc, i*22 + 2, -0.45, j*22 + 2, 18, 0.12, 18, COLORS.groundAlt, null);
        }
      }
    }
  }

  /* ══════════════════════════════════════════════
     ZONE 1 — LOCAL SKATEPARK (-50..0 x, -50..0 z)
  ══════════════════════════════════════════════ */
  function buildSkatepark(sc) {
    setZone('skatepark', -25, -25, 28, 28);

    // Flat ground
    addBox(sc, -25, 0.01, -25, 54, 0.1, 54, COLORS.cement, null);

    // Half-pipe (back wall)
    addBox(sc, -25, 2.5, -48, 30, 5, 1.5, COLORS.ramp, 'wall');
    // Quarter ramp L
    for (let i = 0; i < 5; i++) {
      const angle = (i / 4) * (Math.PI / 2);
      const y = Math.sin(angle) * 4.5;
      const z = -47 + Math.cos(angle) * 4.5;
      addBox(sc, -25, y, z, 30, 0.3, 1.2, COLORS.ramp, 'ramp');
    }

    // Box obstacle
    addBox(sc, -20, 0.5, -20, 6, 1, 3, COLORS.concrete, 'ledge');
    addBox(sc, -30, 0.5, -22, 4, 1, 8, COLORS.concrete, 'ledge');

    // Rails on ledges
    addRail(sc, -23, 1.1, -20, -17, 1.1, -20);
    addRail(sc, -32, 1.1, -25, -28, 1.1, -25);

    // Funbox
    addBox(sc, -38, 0.8, -30, 8, 1.6, 8, COLORS.ramp, 'ledge');
    // Funbox ramps
    addBox(sc, -38, 0.4, -25, 8, 1, 1, COLORS.ramp, 'ramp', -0.4);
    addBox(sc, -38, 0.4, -35, 8, 1, 1, COLORS.ramp, 'ramp', 0.4);

    // Street section (a few steps)
    addBox(sc, -10, 0.25, -30, 10, 0.5, 6, COLORS.concrete, 'ledge');
    addBox(sc, -10, 0.5, -37, 10, 1.0, 6, COLORS.concrete, 'ledge');
    // Rail on steps
    addRail(sc, -15, 1.1, -37, -5, 1.1, -37);

    // Boundary walls
    addBox(sc, -25, 2, -53, 54, 4, 1, COLORS.concrete, 'wall');
    addBox(sc, -53, 2, -25, 1, 4, 54, COLORS.concrete, 'wall');

    // Signage pole
    addBox(sc, -22, 3, -52, 0.3, 6, 0.3, COLORS.metal, null);
    addBox(sc, -22, 5.5, -52, 4, 1, 0.1, COLORS.orange, null);

    // Graffiti art on half-pipe wall
    addBox(sc, -20, 2.5, -47.8, 6, 3, 0.1, COLORS.graffiti1, null);
    addBox(sc, -30, 2.5, -47.8, 4, 2, 0.1, COLORS.graffiti2, null);
  }

  /* ══════════════════════════════════════════════
     ZONE 2 — DOWNTOWN PLAZA (0..50 x, -50..0 z)
  ══════════════════════════════════════════════ */
  function buildPlaza(sc) {
    setZone('plaza', 25, -25, 28, 28);

    // Ground
    addBox(sc, 25, 0.01, -25, 54, 0.1, 54, 0x353a45, null);

    // Central plaza steps (3-tier staircase)
    addBox(sc, 25, 0.4, -25, 16, 0.8, 16, COLORS.concrete, 'ledge');
    addBox(sc, 25, 0.8, -25, 12, 1.6, 12, COLORS.concrete, 'ledge');
    addBox(sc, 25, 1.2, -25, 8, 2.4, 8, COLORS.concrete, 'ledge');

    // Stair sets (approach ramps)
    for (let i = 0; i < 4; i++) {
      addBox(sc, 25 + (i-1.5)*3, 0.2 + i*0.2, -32 + i*0.5, 2.5, 0.4, 1.5, COLORS.cement, 'ledge');
    }

    // Long rails
    addRail(sc, 10, 1.0, -22, 18, 1.0, -22);
    addRail(sc, 32, 1.0, -22, 40, 1.0, -22);
    addRail(sc, 10, 1.0, -28, 18, 1.0, -28);

    // Benches (skatable ledges)
    addBox(sc, 8, 0.6, -15, 6, 1.2, 1.5, COLORS.concrete, 'ledge');
    addBox(sc, 42, 0.6, -15, 6, 1.2, 1.5, COLORS.concrete, 'ledge');
    addBox(sc, 8, 0.6, -35, 6, 1.2, 1.5, COLORS.concrete, 'ledge');
    addBox(sc, 42, 0.6, -35, 6, 1.2, 1.5, COLORS.concrete, 'ledge');

    // Rail on benches
    addRail(sc, 5, 1.3, -15, 11, 1.3, -15);
    addRail(sc, 39, 1.3, -15, 45, 1.3, -15);

    // Security patrol area marker (visual only)
    addBox(sc, 35, 0.02, -40, 10, 0.04, 10, 0x334455, null);

    // Building facades (background)
    addBox(sc, 2, 10, -52, 12, 20, 2, COLORS.blue, 'wall');
    addBox(sc, 20, 8, -52, 10, 16, 2, COLORS.cement, 'wall');
    addBox(sc, 45, 12, -52, 14, 24, 2, COLORS.concrete, 'wall');

    // Windows (neon lights on building)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        addBox(sc, 2 + (c-1)*3, 6 + r*4, -51, 1.5, 1.5, 0.2,
          [COLORS.neonYellow, COLORS.neon, 0xFFFFFF][Math.floor(Math.random()*3)], null);
      }
    }

    // Street lamp posts
    [[15, -10], [35, -10], [15, -42], [35, -42]].forEach(([x, z]) => {
      addBox(sc, x, 4, z, 0.2, 8, 0.2, COLORS.metal, null);
      const light = new THREE.PointLight(COLORS.neonYellow, 0.6, 18);
      light.position.set(x, 8.5, z);
      sc.add(light);
      addBox(sc, x, 8.5, z, 1.5, 0.2, 0.3, COLORS.neonYellow, null);
    });
  }

  /* ══════════════════════════════════════════════
     ZONE 3 — BACK ALLEY GRAFFITI (-50..0 x, 0..50 z)
  ══════════════════════════════════════════════ */
  function buildAlley(sc) {
    setZone('alley', -25, 25, 28, 28);

    // Ground
    addBox(sc, -25, 0.01, 25, 54, 0.1, 54, COLORS.groundAlt, null);

    // Narrow corridor walls (the alley feel)
    addBox(sc, -38, 5, 25, 2, 10, 50, COLORS.cement, 'wall');
    addBox(sc, -12, 5, 25, 2, 10, 50, COLORS.cement, 'wall');

    // ─── Graffiti mural walls ─────────────────────
    // Large graffiti canvases on walls
    addBox(sc, -37.5, 3, 10, 0.2, 6, 12, COLORS.graffiti1, null);
    addBox(sc, -37.5, 3, 25, 0.2, 6, 8,  COLORS.graffiti2, null);
    addBox(sc, -37.5, 3, 40, 0.2, 6, 10, COLORS.graffiti3, null);
    addBox(sc, -12.5, 3, 15, 0.2, 6, 15, COLORS.graffiti2, null);
    addBox(sc, -12.5, 3, 35, 0.2, 6, 12, COLORS.graffiti1, null);

    // GRAFFITI WALL — interactive target
    const grafWall = addBox(sc, -37.5, 3.5, 38, 0.3, 7, 12, COLORS.graffiti3, 'wall');
    grafWall.userData.isGraffitiWall = true;
    grafWall.userData.label = 'GRAFFITI WALL';

    // Dumpsters (obstacles)
    addBox(sc, -35, 1, 12, 2.5, 2, 4, COLORS.metal, 'ledge');
    addBox(sc, -15, 1, 38, 2.5, 2, 4, COLORS.metal, 'ledge');

    // Low pipes / rails across alley
    addRail(sc, -36, 1.5, 18, -14, 1.5, 18);
    addRail(sc, -36, 1.5, 28, -14, 1.5, 28);
    addRail(sc, -36, 1.5, 38, -14, 1.5, 38);

    // Stacked pallets/boxes
    addBox(sc, -22, 0.5, 20, 3, 1, 3, COLORS.wood, 'ledge');
    addBox(sc, -22, 1.1, 20, 2, 0.8, 2, COLORS.wood, 'ledge');
    addBox(sc, -28, 0.5, 42, 4, 1, 4, COLORS.wood, 'ledge');

    // Neon signs (depth)
    addBox(sc, -13, 5, 8, 0.2, 1, 3, COLORS.neon, null);
    addBox(sc, -13, 5, 15, 0.2, 1, 4, COLORS.graffiti1, null);

    // Atmospheric lighting
    const neonLight1 = new THREE.PointLight(0xFF3366, 1.0, 25);
    neonLight1.position.set(-14, 4, 25);
    sc.add(neonLight1);
    const neonLight2 = new THREE.PointLight(0x33FFCC, 0.8, 20);
    neonLight2.position.set(-36, 4, 18);
    sc.add(neonLight2);

    // Alley end wall
    addBox(sc, -25, 5, 52, 28, 10, 2, COLORS.cement, 'wall');
    addBox(sc, -25, 3.5, 51.9, 20, 7, 0.2, COLORS.graffiti2, null);
  }

  /* ══════════════════════════════════════════════
     ZONE 4 — ROOFTOP LINE (0..50 x, 0..50 z)
  ══════════════════════════════════════════════ */
  function buildRooftop(sc) {
    setZone('rooftop', 25, 25, 28, 28);

    // Elevated rooftop base
    addBox(sc, 25, 4, 25, 54, 8, 54, COLORS.cement, 'ground');

    // Rooftop surface
    addBox(sc, 25, 8.05, 25, 52, 0.1, 52, COLORS.groundAlt, null);

    // Access ramp from plaza
    addBox(sc, 3, 2, 3, 8, 0.2, 10, COLORS.ramp, 'ramp', -0.6);

    // Rooftop obstacles
    addBox(sc, 15, 9, 15, 4, 2, 4, COLORS.concrete, 'ledge');  // AC unit
    addBox(sc, 35, 9, 12, 6, 1.5, 3, COLORS.concrete, 'ledge'); // vent block
    addBox(sc, 25, 9, 25, 3, 2, 3, COLORS.concrete, 'ledge');   // central shaft

    // Long rooftop rails
    addRail(sc, 8, 8.15, 20, 20, 8.15, 20);
    addRail(sc, 30, 8.15, 20, 42, 8.15, 20);
    addRail(sc, 8, 8.15, 35, 20, 8.15, 35);
    addRail(sc, 30, 8.15, 35, 42, 8.15, 35);

    // Roof edge ledges
    addBox(sc, 25, 8.35, 2,  52, 0.5, 1.2, COLORS.concrete, 'ledge');
    addBox(sc, 25, 8.35, 48, 52, 0.5, 1.2, COLORS.concrete, 'ledge');
    addBox(sc, 2,  8.35, 25, 1.2, 0.5, 52, COLORS.concrete, 'ledge');
    addBox(sc, 48, 8.35, 25, 1.2, 0.5, 52, COLORS.concrete, 'ledge');

    // FINISH LINE indicator
    addBox(sc, 25, 8.06, 44, 40, 0.02, 1.5, COLORS.neonYellow, null);
    addBox(sc, 25, 8.06, 44.2, 40, 0.02, 0.3, COLORS.orange, null);

    // Rooftop lighting: city glow from below
    const cityGlow = new THREE.PointLight(0xFF7B3A, 0.5, 60);
    cityGlow.position.set(25, 2, 25);
    sc.add(cityGlow);

    // Water tower
    addBox(sc, 44, 12, 44, 3, 5, 3, COLORS.wood, 'wall');
    addBox(sc, 44, 17, 44, 4, 3, 4, COLORS.wood, 'wall');

    // Antenna
    addBox(sc, 10, 12, 10, 0.2, 8, 0.2, COLORS.metal, null);

    // Hidden collectibles
    for (let i = 0; i < 4; i++) {
      const col = buildCollectible(sc);
      const angle = (i / 4) * Math.PI * 2;
      col.position.set(25 + Math.cos(angle) * 15, 9.5, 25 + Math.sin(angle) * 15);
      col.userData.isCollectible = true;
      col.userData.id = i;
    }
  }

  function buildCollectible(sc) {
    const geo = new THREE.OctahedronGeometry(0.4, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      color: COLORS.neonYellow, emissive: 0xFFAA00, emissiveIntensity: 0.8
    }));
    sc.add(m);
    return m;
  }

  // ─── Connector paths between zones ────────────
  function buildConnectors(sc) {
    // Skatepark → Plaza corridor
    addBox(sc, 0, 0.01, -25, 6, 0.1, 54, COLORS.cement, null);
    addRail(sc, -2, 0.15, -35, 2, 0.15, -15);

    // Plaza → Alley corridor
    addBox(sc, -25, 0.01, 0, 54, 0.1, 6, COLORS.cement, null);
    addRail(sc, -40, 0.15, -2, -10, 0.15, 2);

    // Plaza → Rooftop ramp (large)
    addBox(sc, 3, 2.0, 1, 8, 0.25, 10, COLORS.ramp, 'ramp', -0.5);
    addBox(sc, 3, 3.8, 5, 8, 0.25, 6,  COLORS.ramp, 'ramp', -0.4);
    addBox(sc, 3, 5.2, 9, 8, 0.25, 4,  COLORS.ramp, 'ramp', -0.25);

    // Alley → Rooftop fire escape stairs
    addBox(sc, -8, 2, 10, 2.5, 0.3, 8, COLORS.metal, 'ramp', -0.45);
    addBox(sc, -6, 4, 12, 2.5, 0.3, 6, COLORS.metal, 'ramp', -0.4);
    addBox(sc, -4, 6, 14, 2.5, 0.3, 5, COLORS.metal, 'ramp', -0.35);
  }

  // ─── Init ──────────────────────────────────────
  function build(sc, renderer) {
    scene = sc;
    buildSky(sc, renderer);
    buildGround(sc);
    buildSkatepark(sc);
    buildPlaza(sc);
    buildAlley(sc);
    buildRooftop(sc);
    buildConnectors(sc);
  }

  // ─── Collectible spin update ───────────────────
  function update(dt) {
    if (!scene) return;
    scene.traverse(obj => {
      if (obj.userData.isCollectible) {
        obj.rotation.y += dt * 2;
        obj.position.y = 9.5 + Math.sin(Date.now() * 0.002) * 0.2;
      }
    });
  }

  // ─── Collision helpers ─────────────────────────

  // Simple AABB sweep — returns closest ground Y below pos
  function getGroundY(pos) {
    let highestY = -999;
    collidables.forEach(c => {
      if (c.type !== 'ground' && c.type !== 'ledge' && c.type !== 'ramp') return;
      const bb = new THREE.Box3().setFromObject(c.mesh);
      if (pos.x < bb.min.x - 0.5 || pos.x > bb.max.x + 0.5) return;
      if (pos.z < bb.min.z - 0.5 || pos.z > bb.max.z + 0.5) return;
      if (bb.max.y < highestY) return;
      if (pos.y + 2 > bb.max.y) highestY = bb.max.y;
    });
    return highestY;
  }

  // Returns nearest grindable rail within distance
  function getNearestRail(pos, maxDist) {
    let best = null; let bestDist = maxDist;
    rails.forEach(r => {
      const closest = closestPointOnSegment(pos, r.start, r.end);
      const d = pos.distanceTo(closest);
      if (d < bestDist) { bestDist = d; best = r; }
    });
    return best;
  }

  function closestPointOnSegment(p, a, b) {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ap = new THREE.Vector3().subVectors(p, a);
    const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.dot(ab)));
    return new THREE.Vector3().addVectors(a, ab.multiplyScalar(t));
  }

  function getCollidables() { return collidables; }
  function getRails()       { return rails; }
  function getZones()       { return zones; }
  function inZoneCheck(name, pos) { return inZone(name, pos); }

  function getGraffitiWall() {
    let found = null;
    collidables.forEach(c => {
      if (c.mesh.userData.isGraffitiWall) found = c.mesh;
    });
    return found;
  }

  return {
    build, update,
    getGroundY, getNearestRail, closestPointOnSegment,
    getCollidables, getRails, getZones, inZoneCheck,
    getGraffitiWall
  };
})();
