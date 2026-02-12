import * as THREE from 'three';

/**
 * CONCRETE REIGN - Main Entry Point
 * Lead Gameplay Programmer: AI
 */

// 1. UI Controller
window.ui = {
    showScreen: (id) => {
        document.querySelectorAll('.overlay').forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(`${id}-screen`);
        if (screen) {
            screen.classList.remove('hidden');
        } else {
            const altScreen = document.getElementById(id);
            if (altScreen) altScreen.classList.remove('hidden');
        }
    },
    hideScreens: () => {
        document.querySelectorAll('.overlay').forEach(s => s.classList.add('hidden'));

        if (window.game && window.game.gameStarted) {
            if (window.game.isPaused) {
                document.getElementById('pause-menu').classList.remove('hidden');
                document.exitPointerLock(); // Ensure mouse is free
            } else {
                 if(document.getElementById('game-container')) document.getElementById('game-container').requestPointerLock();
            }
        }
    },
    showNotification: (text) => {
        const area = document.getElementById('notification-area');
        if (!area) return;
        const div = document.createElement('div');
        div.className = 'mission-popup';
        div.textContent = text;
        area.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },
    updateMissionUI: (missions) => {
        const list = document.getElementById('mission-list');
        if (!list) return;
        list.innerHTML = '';
        missions.forEach(m => {
            const btn = document.createElement('button');
            btn.className = 'menu-btn small';
            btn.style.fontSize = '0.9rem';
            btn.textContent = m.title;
            btn.onclick = () => window.ui.showMissionDetails(m);
            list.appendChild(btn);
        });
    },
    showMissionDetails: (m) => {
        document.getElementById('empty-details').classList.add('hidden');
        const content = document.getElementById('details-content');
        content.classList.remove('hidden');
        document.getElementById('detail-title').textContent = m.title;
        document.getElementById('detail-desc').textContent = m.description || "No data available.";
        const objList = document.getElementById('detail-objectives');
        objList.innerHTML = '';
        if (m.objectives) {
            m.objectives.forEach(o => {
                const li = document.createElement('li');
                li.textContent = o;
                objList.appendChild(li);
            });
        }
    }
};

// 2. Supporting Classes

class Enemy {
    constructor(scene, type = 'THUG') {
        this.scene = scene;
        this.type = type;
        this.health = type === 'POLICE' ? 150 : 100;
        this.speed = type === 'POLICE' ? 0.12 : 0.08;
        this.state = 'IDLE';
        this.mesh = new THREE.Group();
        
        // Detailed Low Poly Enemy
        const torsoInfo = type === 'POLICE' ? {col: 0x000044, scale: [0.6, 0.9, 0.3]} : {col: 0x333333, scale: [0.6, 0.8, 0.3]};
        
        const torso = new THREE.Mesh(new THREE.BoxGeometry(...torsoInfo.scale), new THREE.MeshPhongMaterial({ color: torsoInfo.col }));
        torso.position.y = 1.2;
        
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), new THREE.MeshPhongMaterial({ color: 0xffd1aa })); // Skin
        head.position.y = 1.85;

        // Limbs
        const armGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
        const legGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
        const limbMat = new THREE.MeshPhongMaterial({ color: torsoInfo.col });
        const skinMat = new THREE.MeshPhongMaterial({color: 0xffd1aa});
        
        const lArm = new THREE.Mesh(armGeo, limbMat); lArm.position.set(-0.4, 1.2, 0);
        const rArm = new THREE.Mesh(armGeo, limbMat); rArm.position.set(0.4, 1.2, 0);
        const lLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({color: 0x111111})); lLeg.position.set(-0.2, 0.4, 0);
        const rLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({color: 0x111111})); rLeg.position.set(0.2, 0.4, 0);

        this.mesh.add(torso, head, lArm, rArm, lLeg, rLeg);
        this.spawn();
        scene.add(this.mesh);
        
        // Randomized Voice Lines
        this.aggroLines = ["You picked the wrong city!", "I'm gonna melt you!", "Backup required!", "Hostile engaged!"];
    }
    spawn() {
        this.mesh.position.set((Math.random() - 0.5) * 300, 1, (Math.random() - 0.5) * 300); // Smaller Map
    }
    takeDamage(amt) {
        this.health -= amt;
        this.mesh.children.forEach(c => {
             if(c.material) {
                 c.userData.oldColor = c.material.color.getHex();
                 c.material.color.set(0xff0000);
             }
        });
        setTimeout(() => this.mesh.children.forEach(c => {
             if(c.material && c.userData.oldColor) c.material.color.set(c.userData.oldColor);
        }), 100);

        if(this.state !== 'ATTACK') {
             this.state = 'ATTACK';
             const line = this.aggroLines[Math.floor(Math.random() * this.aggroLines.length)];
             window.ui.showNotification(`${this.type}: "${line}"`);
        }

        if (this.health <= 0) this.die();
    }
    die() {
        this.scene.remove(this.mesh);
        if (window.game) {
            const idx = window.game.enemies.indexOf(this);
            if (idx > -1) window.game.enemies.splice(idx, 1);
            window.game.addChaos(this.type === 'POLICE' ? 200 : 50);
        }
    }
    update(player) {
        const dist = this.mesh.position.distanceTo(player.mesh.position);
        
        // Aggro logic
        if (this.state === 'ATTACK' || (this.type === 'POLICE' && player.wantedLevel > 0) || dist < 15) {
            this.state = 'ATTACK';
            const dir = player.mesh.position.clone().sub(this.mesh.position).normalize();
            
            if (dist > 1.5) {
                this.mesh.position.add(dir.multiplyScalar(this.speed));
            }
            this.mesh.lookAt(player.mesh.position);
            
            if (dist < 2 && Math.random() < 0.05) { // More aggressive attack
                player.takeDamage(this.type === 'POLICE' ? 5 : 2);
            }
        }
    }
}

class MissionManager {
    constructor(game) {
        this.game = game;
        this.activeMission = null;
        this.marker = null;
        this.setupMarker();
        this.missions = [
            { 
               id: 'DEBT',
               title: 'DEBT COLLECTION',
               target: new THREE.Vector3(30, 0, 30),
               desc: 'Collect protection money.',
               stage: 0 
            }
        ];
    }
    setupMarker() {
        this.marker = new THREE.Mesh(new THREE.CylinderGeometry(0, 1, 3, 4), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        this.game.scene.add(this.marker);
    }
    update() {
        if (!this.marker) return;
        const pos = this.activeMission ? this.activeMission.target : new THREE.Vector3(10, 0, 10);
        this.marker.position.copy(pos).y = 2 + Math.sin(Date.now() * 0.003) * 0.5;
        this.marker.rotation.y += 0.05;
        
        const dist = this.game.player.mesh.position.distanceTo(pos);
        if (dist < 3) {
            if (!this.activeMission) {
                this.startMission(this.missions[0]);
            } else {
                this.advanceMission();
            }
        }
    }
    startMission(m) {
        this.activeMission = m;
        this.activeMission.stage = 1;
        this.marker.material.color.set(0xffff00);
        window.ui.showNotification("MISSION STARTED: Talk to the Informant");
        // Move marker to next step
        this.activeMission.target.set(-40, 0, -20); 
    }
    advanceMission() {
        if(this.activeMission.stage === 1) {
             this.activeMission.stage = 2;
             window.ui.showNotification("INFORMANT: 'They are hiding at the docks!'");
             window.ui.showNotification("OBJECTIVE UPDATE: Go to Docks");
             this.activeMission.target.set(50, 0, 50);
        } else if (this.activeMission.stage === 2) {
             this.completeMission();
        }
    }
    completeMission() {
        window.ui.showNotification("MISSION COMPLETE: Payday!");
        this.activeMission = null;
        this.game.addChaos(1000);
        this.marker.material.color.set(0x00ff00);
        // Reset marker for next loop
        this.marker.position.set(10,0,10);
    }
}

class HeatManager {
    constructor(game) { this.game = game; this.last = 0; }
    update() {
        const lv = this.game.player.wantedLevel;
        if (lv === 0) return;
        const now = Date.now();
        if (now - this.last > 10000 - (lv * 1500)) {
            const p = this.game.player.mesh.position;
            const pm = new Enemy(this.game.scene, 'POLICE');
            pm.mesh.position.set(p.x + (Math.random()-0.5)*40, 1, p.z + (Math.random()-0.5)*40);
            this.game.enemies.push(pm);
            this.last = now;
        }
    }
}

// 3. Engine

class ConcreteReign {
    constructor() {
        this.container = document.getElementById('game-container');
        this.isPaused = false;
        this.gameStarted = true;
        this.enemies = [];
        this.keys = {};
        this.lastCombatTime = 0;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a20); // Darker Blue/Grey City Night
        this.scene.fog = new THREE.FogExp2(0x1a1a20, 0.015); // Clearer fog
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraRotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.mouseSensitivity = 0.002;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const amb = new THREE.AmbientLight(0xffffff, 0.6);
        const moon = new THREE.DirectionalLight(0xaaccff, 0.8);
        moon.position.set(20, 100, 20);
        moon.castShadow = true;
        this.scene.add(amb, moon);
        
        // Add random street lights
        for(let k=0; k<20; k++) {
            const sl = new THREE.PointLight(0xffaa00, 1, 40);
            sl.position.set((Math.random()-0.5)*300, 8, (Math.random()-0.5)*300);
            this.scene.add(sl);
        }

        this.createCity();

        // Player Setup
        this.player = { 
            mesh: new THREE.Group(), 
            health: 100, 
            maxHealth: 100, 
            wantedLevel: 0, 
            chaosScore: 0, 
            velocity: new THREE.Vector3(), 
            onGround: false, 
            stamina: 100,
            isPunching: false,
            punchTime: 0
        };
        this.buildPlayerModel();
        
        this.scene.add(this.player.mesh);

        this.missionManager = new MissionManager(this);
        this.heatManager = new HeatManager(this);
        for (let i = 0; i < 15; i++) this.enemies.push(new Enemy(this.scene));

        this.setupInputs();
        
        // Initialize Mission UI
        window.ui.updateMissionUI([
            {
                title: "DEBT COLLECTION",
                description: "The shopkeeper at the Docks is holding out. Find the informant, get the location, and collect.",
                objectives: ["Meet Informant at Plaza", "Travel to Dry Docks", "Shake down the target"]
            }
        ]);
        
        this.animate();
    }
    
    buildPlayerModel() {
        // Low Poly Black Male, Tanktop, Jeans, Buzzcut
        const skinColor = 0x3d2314;
        const jeansColor = 0x111111;
        const tankColor = 0xffffff;

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), new THREE.MeshPhongMaterial({ color: tankColor })); // White Tank
        torso.position.y = 1.2;
        
        const pants = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.4, 0.26), new THREE.MeshPhongMaterial({ color: jeansColor }));
        pants.position.y = 0.85;

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), new THREE.MeshPhongMaterial({ color: skinColor }));
        head.position.y = 1.75;
        
        // Buzzcut
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.26), new THREE.MeshPhongMaterial({ color: 0x000000 }));
        hair.position.y = 1.9;

        const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), new THREE.MeshPhongMaterial({ color: skinColor })); lArm.position.set(-0.35, 1.2, 0);
        const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), new THREE.MeshPhongMaterial({ color: skinColor })); rArm.position.set(0.35, 1.2, 0);
        
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.2), new THREE.MeshPhongMaterial({ color: jeansColor })); lLeg.position.set(-0.15, 0.4, 0);
        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.85, 0.2), new THREE.MeshPhongMaterial({ color: jeansColor })); rLeg.position.set(0.15, 0.4, 0);

        this.player.mesh.add(torso, pants, head, hair, lArm, rArm, lLeg, rLeg);
    }
    
    createCity() {
        // Procedural Textures
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = 512; ctx.canvas.height = 512;
        
        // ASPHALT
        ctx.fillStyle = '#222'; ctx.fillRect(0,0,512,512);
        for(let i=0; i<5000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#333' : '#111';
            ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
        }
        const asphaltTex = new THREE.CanvasTexture(ctx.canvas);
        asphaltTex.wrapS = THREE.RepeatWrapping; asphaltTex.wrapT = THREE.RepeatWrapping;
        asphaltTex.repeat.set(20, 20);

        // BRICK
        ctx.fillStyle = '#4a3c31'; ctx.fillRect(0,0,512,512); // Dark brown base
        ctx.fillStyle = '#5c4d3d'; // Lighter brick
        for(let i=0; i<16; i++) {
            for(let j=0; j<8; j++) {
                if(Math.random() > 0.1) ctx.fillRect(i*32 + (j%2)*16, j*64, 30, 60);
            }
        }
        const brickTex = new THREE.CanvasTexture(ctx.canvas);
        
        // Ground
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshPhongMaterial({ map: asphaltTex }));
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Buildings (Smaller Map)
        const blockGeo = new THREE.BoxGeometry(1,1,1);
        const blockMat = new THREE.MeshPhongMaterial({ map: brickTex });
        const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });

        for (let i = 0; i < 80; i++) {
            const h = Math.random() * 40 + 10;
            const w = Math.random() * 15 + 10;
            const geo = new THREE.BoxGeometry(w, h, w);
            const mat = new THREE.MeshPhongMaterial({ color: 0x202025 });
            const building = new THREE.Mesh(geo, mat);
            
            building.position.set((Math.random() - 0.5) * 300, h / 2, (Math.random() - 0.5) * 300);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            
            // Add static "cars" - varied colors
            if(i % 5 === 0) {
                 const carCol = Math.random() > 0.5 ? 0xcc0000 : 0x0000cc;
                 const car = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 2), new THREE.MeshPhongMaterial({color: carCol}));
                 car.position.set(building.position.x + 15, 0.75, building.position.z + 15);
                 this.scene.add(car);
            }
        }
    }

    setupInputs() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') this.togglePause();
            if (e.code === 'Space' && this.player.onGround) {
                this.player.velocity.y = 0.3; // Jump Force
                this.player.onGround = false;
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('mousedown', () => { 
            if (!this.isPaused) this.attack(); 
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!this.isPaused && document.pointerLockElement) {
                // Invert controls: UP moves camera DOWN (positive X rotation with camera structure)
                this.cameraRotation.y -= e.movementX * this.mouseSensitivity;
                this.cameraRotation.x += e.movementY * this.mouseSensitivity; 
                this.cameraRotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.cameraRotation.x));
            }
        });
        
        this.container.addEventListener('click', () => {
            if (!this.isPaused) this.container.requestPointerLock();
        });
    }

    attack() {
        if(this.player.isPunching) return;
        
        this.player.isPunching = true;
        this.player.punchTime = Date.now();
        
        this.lastCombatTime = Date.now();
        this.enemies.forEach(e => {
            if (this.player.mesh.position.distanceTo(e.mesh.position) < 4) {
                e.takeDamage(25);
                this.addChaos(50);
            }
        });
        
        // Reset punch state after animation
        setTimeout(() => {
            this.player.isPunching = false;
        }, 300);
    }

    addChaos(a) {
        this.player.chaosScore += a;
        const el = document.getElementById('chaos-score');
        if (el) el.textContent = `CHAOS: ${String(this.player.chaosScore).padStart(6, '0')}`;
        const lv = Math.min(5, Math.floor(this.player.chaosScore / 1000));
        if (lv > this.player.wantedLevel) {
            this.player.wantedLevel = lv;
            document.querySelectorAll('#wanted-stars .star').forEach((s, i) => s.classList.toggle('active', i < lv));
            window.ui.showNotification("WANTED LEVEL UP");
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pm = document.getElementById('pause-menu');
        if (pm) pm.classList.toggle('hidden', !this.isPaused);
        
        if (this.isPaused) {
            document.exitPointerLock();
        } else {
            this.container.requestPointerLock();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if(this.isPaused) return;

        this.updateMinimap();

        // Animated Player Limb Logic
        const isMoving = this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'];
        let t = Date.now() * 0.005; 
        
        // PUNCH ANIMATION OVERRIDE
        if (this.player.isPunching) {
            const punchProgress = (Date.now() - this.player.punchTime) / 300; // 0 to 1
            const armAngle = Math.sin(punchProgress * Math.PI) * -1.5; // Swing up and down
            this.player.mesh.children[5].rotation.x = armAngle; // Right Arm Punch
            this.player.mesh.children[4].rotation.x = 0; // Left Arm Idle
        } 
        else if (isMoving && this.player.onGround) {
            const legSpeed = this.keys['ShiftLeft'] ? 10 : 5; // Slower, smoother
            
            this.player.mesh.children[4].rotation.x = Math.sin(t * legSpeed) * 0.5;
            this.player.mesh.children[5].rotation.x = -Math.sin(t * legSpeed) * 0.5;
            this.player.mesh.children[6].rotation.x = -Math.sin(t * legSpeed) * 0.5;
            this.player.mesh.children[7].rotation.x = Math.sin(t * legSpeed) * 0.5;
        } else {
            // Idle/Jump Pose
            for(let i=4; i<8; i++) this.player.mesh.children[i].rotation.x = 0;
        }

        // --- Physics & Movement ---
        this.player.mesh.rotation.y = this.cameraRotation.y;
        
        // sprinting allowed in air now
        const isSprinting = this.keys['ShiftLeft'] && this.player.stamina > 0;
        const speed = isSprinting ? 0.3 : 0.15;
        const crouchMod = this.keys['ControlLeft'] ? 0.5 : 1.0;
        
        if(this.keys['ShiftLeft']) {
             this.player.stamina -= 0.5;
             document.getElementById('dash-fill').style.width = this.player.stamina + '%'; // Using dash bar as sprint bar
        } else if (this.player.stamina < 100) {
             this.player.stamina += 0.2;
             document.getElementById('dash-fill').style.width = this.player.stamina + '%';
        }

        const move = new THREE.Vector3();
        if(this.keys['KeyW']) move.z += 1;
        if(this.keys['KeyS']) move.z -= 1;
        if(this.keys['KeyA']) move.x += 1;
        if(this.keys['KeyD']) move.x -= 1;
        
        if(move.length() > 0) {
            move.normalize();
            move.applyEuler(new THREE.Euler(0, this.player.mesh.rotation.y, 0));
            this.player.mesh.position.add(move.multiplyScalar(speed * crouchMod));
        }

        // Gravity & Jump
        this.player.velocity.y -= 0.015; // Gravity
        this.player.mesh.position.y += this.player.velocity.y;
        
        if(this.player.mesh.position.y < 0) {
             this.player.mesh.position.y = 0;
             this.player.velocity.y = 0;
             this.player.onGround = true;
        }

        // --- Regen ---
        if (Date.now() - this.lastCombatTime > 30000 && this.player.health < 100) {
             this.player.health += 0.1;
             document.getElementById('hp-fill').style.width = this.player.health + '%';
        }

        // Update Systems
        this.missionManager.update();
        this.heatManager.update();
        this.enemies.forEach(e => e.update(this.player));

        // Camera Follow
        const camDist = 6;
        const camHeight = 2.5;
        const offset = new THREE.Vector3(0, camHeight, -camDist);
        offset.applyEuler(this.cameraRotation);
        
        this.camera.position.copy(this.player.mesh.position).add(offset);
        this.camera.lookAt(this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)));

        this.renderer.render(this.scene, this.camera);
    }

    updateMinimap() {
        const c = document.getElementById('minimap');
        if(!c) return;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#111'; 
        ctx.fillRect(0,0,300,300); // Clear
        
        // Map Center (Player) is at 150,150
        const mapScale = 2; // Zoom level

        // Draw Player Arrow
        ctx.save();
        ctx.translate(150, 150);
        ctx.rotate(-this.player.mesh.rotation.y);
        ctx.fillStyle = '#c41e3a';
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(4, 5); ctx.lineTo(-4, 5);
        ctx.fill();
        ctx.restore();

        // Draw Enemies
        ctx.fillStyle = '#ff0000';
        this.enemies.forEach(e => {
            const dx = (e.mesh.position.x - this.player.mesh.position.x) * mapScale;
            const dy = (e.mesh.position.z - this.player.mesh.position.z) * mapScale;
            
            // Only draw if within minimap bounds roughly
            if(Math.abs(dx) < 140 && Math.abs(dy) < 140) {
                 // In 2D canvas, y is down, so we map 3D z to canvas y
                 ctx.fillRect(150 + dx - 2, 150 + dy - 2, 4, 4);
            }
        });
        
        // Draw Mission Marker
        if (this.missionManager.marker && this.missionManager.activeMission) {
             const mPos = this.missionManager.marker.position;
             const dx = (mPos.x - this.player.mesh.position.x) * mapScale;
             const dy = (mPos.z - this.player.mesh.position.z) * mapScale;
             
             ctx.fillStyle = '#ffff00';
             if(Math.abs(dx) < 140 && Math.abs(dy) < 140) {
                 ctx.beginPath();
                 ctx.arc(150 + dx, 150 + dy, 4, 0, Math.PI*2);
                 ctx.fill();
             } else {
                 // Draw direction indicator on edge?
             }
        }
    }
}

// 4. Start
window.game = new ConcreteReign();
