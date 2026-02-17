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
    updateShopUI: (items, playerCurrency, buyFn) => {
        const list = document.getElementById('shop-items');
        if (!list) return;
        list.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.style.justifyContent = 'space-between';
            row.style.padding = '0.5rem 1rem';
            
            const name = document.createElement('span');
            name.textContent = item.name;
            
            const price = document.createElement('span');
            price.textContent = `$${item.price}`;
            price.style.color = playerCurrency >= item.price ? '#00ff00' : '#ff0000';
            
            const buyBtn = document.createElement('button');
            buyBtn.className = 'menu-btn small';
            buyBtn.textContent = 'BUY';
            buyBtn.disabled = playerCurrency < item.price;
            buyBtn.onclick = () => buyFn(item);
            
            row.appendChild(name);
            row.appendChild(price);
            row.appendChild(buyBtn);
            list.appendChild(row);
        });
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

class Cash {
    constructor(scene, position) {
        this.scene = scene;
        this.value = Math.floor(Math.random() * 50) + 20;
        
        const geo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
        const mat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(position).y = 0.5;
        this.scene.add(this.mesh);
        
        this.collected = false;
    }
    update() {
        this.mesh.rotation.y += 0.05;
        this.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.01) * 0.1;
    }
    remove() {
        this.scene.remove(this.mesh);
    }
}

class Bullet {
    constructor(scene, position, direction, damage) {
        this.scene = scene;
        this.damage = damage;
        this.speed = 1.0;
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        this.mesh.position.copy(position);
        this.direction = direction.clone().normalize();
        this.scene.add(this.mesh);
        this.startTime = Date.now();
        this.isDead = false;
    }
    update(enemies) {
        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed));
        
        // Collision
        enemies.forEach(e => {
            if (!this.isDead && this.mesh.position.distanceTo(e.mesh.position) < 1.5) {
                e.takeDamage(this.damage);
                this.die();
            }
        });

        if (Date.now() - this.startTime > 2000) this.die();
    }
    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.scene.remove(this.mesh);
    }
}

class Enemy {
    constructor(scene, type = 'THUG') {
        this.scene = scene;
        this.type = type;
        this.health = type === 'POLICE' ? 150 : 100;
        this.speed = type === 'POLICE' ? 0.12 : 0.08;
        this.state = 'IDLE';
        this.mesh = new THREE.Group();
        this.lastAttackTime = 0;
        this.isPunching = false;
        this.punchTime = 0;
        
        // Detailed Low Poly Enemy
        const torsoInfo = type === 'POLICE' ? {col: 0x000044, scale: [0.6, 0.9, 0.3]} : {col: 0x333333, scale: [0.6, 0.8, 0.3]};
        
        const torso = new THREE.Mesh(new THREE.BoxGeometry(...torsoInfo.scale), new THREE.MeshPhongMaterial({ color: torsoInfo.col }));
        torso.position.y = 1.2;
        
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), new THREE.MeshPhongMaterial({ color: 0xffd1aa })); // Skin
        head.position.y = 1.85;

        // Limbs with Joints
        const limbMat = new THREE.MeshPhongMaterial({ color: torsoInfo.col });
        const armGeo = new THREE.BoxGeometry(0.15, 0.35, 0.15);
        const legGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
        
        const lUpperArm = new THREE.Mesh(armGeo, limbMat); lUpperArm.position.set(-0.4, 1.35, 0);
        const lLowerArm = new THREE.Mesh(armGeo, limbMat); lLowerArm.position.y = -0.35;
        lUpperArm.add(lLowerArm);

        const rUpperArm = new THREE.Mesh(armGeo, limbMat); rUpperArm.position.set(0.4, 1.35, 0);
        const rLowerArm = new THREE.Mesh(armGeo, limbMat); rLowerArm.position.y = -0.35;
        rUpperArm.add(rLowerArm);

        const lUpperLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({color: 0x111111})); lUpperLeg.position.set(-0.2, 0.65, 0);
        const lLowerLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({color: 0x111111})); lLowerLeg.position.y = -0.45;
        lUpperLeg.add(lLowerLeg);

        const rUpperLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({color: 0x111111})); rUpperLeg.position.set(0.2, 0.65, 0);
        const rLowerLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({color: 0x111111})); rLowerLeg.position.y = -0.45;
        rUpperLeg.add(rLowerLeg);

        this.mesh.add(torso, head, lUpperArm, rUpperArm, lUpperLeg, rUpperLeg);
        this.spawn();
        scene.add(this.mesh);
        
        // Randomized Voice Lines
        this.aggroLines = ["You picked the wrong city!", "I'm gonna melt you!", "Backup required!", "Hostile engaged!"];
    }
    spawn() {
        // Stay within the 200x200 map (halfsize 100)
        this.mesh.position.set((Math.random() - 0.5) * 180, 1, (Math.random() - 0.5) * 180); 
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
            
            // Drop Cash
            window.game.drops.push(new Cash(this.scene, this.mesh.position));
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
            
            const now = Date.now();
            if (dist < 2 && now - this.lastAttackTime > 1500) { 
                this.lastAttackTime = now;
                this.isPunching = true;
                this.punchTime = now;
                player.takeDamage(this.type === 'POLICE' ? 10 : 5);
                setTimeout(() => { if(this.mesh) this.isPunching = false; }, 400);
            }
        }

        // --- NPC Animation ---
        const t = Date.now() * 0.005;
        if (this.isPunching) {
            const punchProgress = (Date.now() - this.punchTime) / 400;
            const armAngle = -Math.sin(punchProgress * Math.PI) * 1.5;
            this.mesh.children[3].rotation.x = armAngle; // Right Upper Arm
            this.mesh.children[3].children[0].rotation.x = Math.sin(punchProgress * Math.PI) * 0.8; // Right Forearm
            this.mesh.children[2].rotation.x = -armAngle * 0.2; // Left Arm counter
        } else if (dist > 1.5 && this.state === 'ATTACK') {
             // NPC Walk
             const walkSpeed = 10;
             this.mesh.children[2].rotation.x = Math.sin(t * walkSpeed) * 0.5;
             this.mesh.children[3].rotation.x = -Math.sin(t * walkSpeed) * 0.5;
             this.mesh.children[4].rotation.x = -Math.sin(t * walkSpeed) * 0.5;
             this.mesh.children[5].rotation.x = Math.sin(t * walkSpeed) * 0.5;
             
             // Move forearms/calves for fluidness
             this.mesh.children[2].children[0].rotation.x = -Math.abs(Math.sin(t * walkSpeed)) * 0.3;
             this.mesh.children[3].children[0].rotation.x = -Math.abs(Math.sin(t * walkSpeed)) * 0.3;
             this.mesh.children[4].children[0].rotation.x = Math.abs(Math.sin(t * walkSpeed)) * 0.5;
             this.mesh.children[5].children[0].rotation.x = Math.abs(Math.sin(t * walkSpeed)) * 0.5;
        } else {
             // Reset pose
             for(let i=2; i<6; i++) {
                 this.mesh.children[i].rotation.x = 0;
                 this.mesh.children[i].rotation.y = 0;
                 if(this.mesh.children[i].children[0]) this.mesh.children[i].children[0].rotation.x = 0;
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
            
            // Spawn around player but within bounds
            let sx = p.x + (Math.random()-0.5)*40;
            let sz = p.z + (Math.random()-0.5)*40;
            sx = Math.max(-90, Math.min(90, sx));
            sz = Math.max(-90, Math.min(90, sz));
            
            pm.mesh.position.set(sx, 1, sz);
            this.game.enemies.push(pm);
            this.last = now;
        }
    }
}

// 3. Engine

class ConcreteReign {
    constructor() {
        this.container = document.getElementById('game-container');
        this.drops = [];
        this.bullets = [];
        this.environmentObjects = []; // For collisions and minimap
        this.isPaused = false;
        this.gameStarted = true;
        this.enemies = [];
        this.keys = {};
        this.lastCombatTime = 0;
        this.lastWeaponFire = 0;
        this.time = 0; // For Day/Night cycle

        this.shopItems = [
            { id: 'pistol', name: 'PISTOL', price: 200, damage: 15, cooldown: 500 },
            { id: 'smg', name: 'SMG', price: 1000, damage: 8, cooldown: 100 },
            { id: 'shotgun', name: 'SHOTGUN', price: 1500, damage: 10, cooldown: 800, pellets: 5 }
        ];

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

        // Lighting System
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sunLight.position.set(20, 100, 20);
        this.sunLight.castShadow = true;
        this.scene.add(this.ambientLight, this.sunLight);
        
        this.streetLights = [];

        // Create City
        this.createCity();
        
        // DOCKSIDE DRAPES - Weapon Shop (Moved inward)
        const shopGeo = new THREE.BoxGeometry(20, 15, 20);
        const shopMat = new THREE.MeshPhongMaterial({ color: 0x330000 });
        this.shopBuilding = new THREE.Mesh(shopGeo, shopMat);
        this.shopBuilding.position.set(80, 7.5, 80); 
        this.scene.add(this.shopBuilding);

        // Add shop to environment objects
        this.environmentObjects.push({
            type: 'shop',
            x: 80, z: 80,
            w: 20, d: 20
        });
        
        const shopSignGeo = new THREE.PlaneGeometry(10, 3);
        const shopSignMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const sign = new THREE.Mesh(shopSignGeo, shopSignMat);
        sign.position.set(80, 12, 90.1);
        this.scene.add(sign);

        // Giant Neon Pillar for visibility
        const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 100, 8);
        const pillarMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
        const shopPillar = new THREE.Mesh(pillarGeo, pillarMat);
        shopPillar.position.set(80, 50, 80);
        this.scene.add(shopPillar);

        // Persistent Shop Icon (3D Sprite)
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 80px Oswald';
        ctx.textAlign = 'center';
        ctx.fillText('$', 64, 90);
        const iconTex = new THREE.CanvasTexture(canvas);
        const iconMat = new THREE.SpriteMaterial({ map: iconTex, depthTest: false });
        this.shopSprite = new THREE.Sprite(iconMat);
        this.shopSprite.position.set(80, 25, 80);
        this.shopSprite.scale.set(10, 10, 1);
        this.scene.add(this.shopSprite);
        
        const shopDoorGeo = new THREE.PlaneGeometry(4, 6);
        const shopDoorMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        this.shopDoor = new THREE.Mesh(shopDoorGeo, shopDoorMat);
        this.shopDoor.position.set(80, 3, 90.1);
        this.scene.add(this.shopDoor);

        // Player Setup
        this.player = { 
            mesh: new THREE.Group(), 
            currency: 0,
            weapon: null,
            health: 100, 
            maxHealth: 100, 
            wantedLevel: 0, 
            chaosScore: 0, 
            velocity: new THREE.Vector3(), 
            onGround: false, 
            dashCharge: 100,
            isPunching: false,
            punchTime: 0,
            isBlocking: false,
            lastBlockTime: 0,
            parryActive: false,
            takeDamage: (amt) => {
                let finalAmt = amt;
                const now = Date.now();
                
                if (this.player.isBlocking) {
                    const blockDuration = now - this.player.lastBlockTime;
                    // Parry window: first 250ms of blocking
                    if (blockDuration < 250) {
                        // PARRY
                        finalAmt = 0;
                        window.ui.showNotification("PARRY!");
                        
                        // Flash Cyan for Parry
                        this.player.mesh.children.forEach(c => {
                            if(c.material && !c.userData.isFlashing) {
                                c.userData.isFlashing = true;
                                const originalHex = c.material.color.getHex();
                                c.material.color.set(0x00ffff);
                                setTimeout(() => {
                                    c.material.color.set(originalHex);
                                    c.userData.isFlashing = false;
                                }, 150);
                            }
                        });
                    } else {
                        // BLOCK (50% damage reduction)
                        finalAmt = amt * 0.5;
                        // Flash White for Block
                        this.player.mesh.children.forEach(c => {
                            if(c.material && !c.userData.isFlashing) {
                                c.userData.isFlashing = true;
                                const originalHex = c.material.color.getHex();
                                c.material.color.set(0xffffff);
                                setTimeout(() => {
                                    c.material.color.set(originalHex);
                                    c.userData.isFlashing = false;
                                }, 100);
                            }
                        });
                    }
                } else {
                    // Flash Red for Hit
                    this.player.mesh.children.forEach(c => {
                        if(c.material && !c.userData.isFlashing) {
                            c.userData.isFlashing = true;
                            const originalHex = c.material.color.getHex();
                            c.material.color.set(0xff0000);
                            setTimeout(() => {
                                c.material.color.set(originalHex);
                                c.userData.isFlashing = false;
                            }, 100);
                        }
                    });
                }

                this.player.health -= finalAmt;
                this.player.health = Math.max(0, this.player.health);
                document.getElementById('hp-fill').style.width = this.player.health + '%';
                
                if (finalAmt > 0) {
                    this.lastCombatTime = now;
                    // Shake camera
                    this.camera.position.x += (Math.random()-0.5) * 0.5;
                }

                if (this.player.health <= 0) {
                    window.ui.showNotification("WASTED");
                    setTimeout(() => window.location.reload(), 2000);
                }
            }
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
        // Higher detail Low Poly Model with joints
        const skinColor = 0x3d2314;
        const jeansColor = 0x111111;
        const tankColor = 0xffffff;

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), new THREE.MeshPhongMaterial({ color: tankColor }));
        torso.position.y = 1.2;
        
        // Head & Hair
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), new THREE.MeshPhongMaterial({ color: skinColor }));
        head.position.y = 1.75;
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.26), new THREE.MeshPhongMaterial({ color: 0x000000 }));
        hair.position.y = 1.9;

        // Arms - Divided into Upper/Lower for better animation control
        const armGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
        const lUpperArm = new THREE.Mesh(armGeo, new THREE.MeshPhongMaterial({ color: tankColor }));
        const lLowerArm = new THREE.Mesh(armGeo, new THREE.MeshPhongMaterial({ color: skinColor }));
        lUpperArm.position.set(-0.35, 1.35, 0);
        lLowerArm.position.y = -0.35;
        lUpperArm.add(lLowerArm);

        const rUpperArm = new THREE.Mesh(armGeo, new THREE.MeshPhongMaterial({ color: tankColor }));
        const rLowerArm = new THREE.Mesh(armGeo, new THREE.MeshPhongMaterial({ color: skinColor }));
        rUpperArm.position.set(0.35, 1.35, 0);
        rLowerArm.position.y = -0.35;
        rUpperArm.add(rLowerArm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
        const lUpperLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({ color: jeansColor }));
        const lLowerLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({ color: jeansColor }));
        lUpperLeg.position.set(-0.15, 0.65, 0);
        lLowerLeg.position.y = -0.45;
        lUpperLeg.add(lLowerLeg);

        const rUpperLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({ color: jeansColor }));
        const rLowerLeg = new THREE.Mesh(legGeo, new THREE.MeshPhongMaterial({ color: jeansColor }));
        rUpperLeg.position.set(0.15, 0.65, 0);
        rLowerLeg.position.y = -0.45;
        rUpperLeg.add(rLowerLeg);

        this.player.mesh.add(torso, head, hair, lUpperArm, rUpperArm, lUpperLeg, rUpperLeg);
    }
    
    createCity() {
        // Procedural Textures
        const canvasSize = 512;
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = canvasSize; ctx.canvas.height = canvasSize;
        
        // ASPHALT (Road Base)
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0,0,512,512);
        ctx.fillStyle = '#222';
        for(let i=0; i<2000; i++) ctx.fillRect(Math.random()*512, Math.random()*512, 1, 1);
        const asphaltTex = new THREE.CanvasTexture(ctx.canvas);
        asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
        asphaltTex.repeat.set(10, 10);

        // ROAD TEXTURE (With lane markings)
        const roadCtx = document.createElement('canvas').getContext('2d');
        roadCtx.canvas.width = 512; roadCtx.canvas.height = 512;
        roadCtx.fillStyle = '#111'; roadCtx.fillRect(0,0,512,512);
        roadCtx.fillStyle = '#ffff00'; // Double yellow
        roadCtx.fillRect(252, 0, 3, 512);
        roadCtx.fillRect(257, 0, 3, 512);
        roadCtx.fillStyle = '#ffffff'; // White dashed side lines
        for(let i=0; i<10; i++) roadCtx.fillRect(50, i*60 + 10, 4, 30);
        for(let i=0; i<10; i++) roadCtx.fillRect(458, i*60 + 10, 4, 30);
        const roadTex = new THREE.CanvasTexture(roadCtx.canvas);
        roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;

        // SIDEWALK TEXTURE (Concrete tiles)
        const swCtx = document.createElement('canvas').getContext('2d');
        swCtx.canvas.width = 512; swCtx.canvas.height = 512;
        swCtx.fillStyle = '#888'; swCtx.fillRect(0,0,512,512);
        swCtx.strokeStyle = '#666'; swCtx.lineWidth = 2;
        for(let i=0; i<4; i++) {
            for(let j=0; j<4; j++) swCtx.strokeRect(i*128, j*128, 128, 128);
        }
        const sidewalkTex = new THREE.CanvasTexture(swCtx.canvas);
        sidewalkTex.wrapS = sidewalkTex.wrapT = THREE.RepeatWrapping;
        sidewalkTex.repeat.set(1, 1);

        // BRICK (Buildings)
        const brickCtx = document.createElement('canvas').getContext('2d');
        brickCtx.canvas.width = 512; brickCtx.canvas.height = 512;
        brickCtx.fillStyle = '#4a3c31'; brickCtx.fillRect(0,0,512,512);
        brickCtx.fillStyle = '#5c4d3d'; 
        for(let i=0; i<16; i++) {
            for(let j=0; j<8; j++) {
                if(Math.random() > 0.1) brickCtx.fillRect(i*32 + (j%2)*16, j*64, 30, 20);
            }
        }
        const brickTex = new THREE.CanvasTexture(brickCtx.canvas);
        brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;

        // WINDOW TEXTURE (Better buildings)
        const winCtx = document.createElement('canvas').getContext('2d');
        winCtx.canvas.width = 512; winCtx.canvas.height = 512;
        winCtx.fillStyle = '#0a0a0c'; winCtx.fillRect(0,0,512,512);
        winCtx.strokeStyle = '#333'; winCtx.lineWidth = 4; winCtx.strokeRect(0,0,512,512);
        winCtx.fillStyle = '#ffffaa'; // Light on
        for(let x=0; x<4; x++) {
            for(let y=0; y<6; y++) {
                if(Math.random() > 0.3) winCtx.fillRect(x*128 + 20, y*85 + 10, 88, 65);
            }
        }
        const windowTex = new THREE.CanvasTexture(winCtx.canvas);
        windowTex.wrapS = windowTex.wrapT = THREE.RepeatWrapping;
        
        // Ground - Main Floor (Smaller: 200x200)
        const groundSize = 200;
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), new THREE.MeshPhongMaterial({ map: asphaltTex }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // WATER/VOID DECOR (Outside boundaries)
        const waterGeo = new THREE.PlaneGeometry(2000, 2000);
        const waterMat = new THREE.MeshPhongMaterial({ color: 0x050510, shininess: 100 });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI/2;
        water.position.y = -0.5; // Slightly below ground
        this.scene.add(water);

        // Invisible Walls (Map Boundaries)
        const wallMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        const wallGeo = new THREE.BoxGeometry(groundSize, 50, 1);
        
        const wallN = new THREE.Mesh(wallGeo, wallMat); wallN.position.set(0, 25, -groundSize/2);
        const wallS = new THREE.Mesh(wallGeo, wallMat); wallS.position.set(0, 25, groundSize/2);
        const wallE = new THREE.Mesh(wallGeo, wallMat); wallE.position.set(groundSize/2, 25, 0); wallE.rotation.y = Math.PI/2;
        const wallW = new THREE.Mesh(wallGeo, wallMat); wallW.position.set(-groundSize/2, 25, 0); wallW.rotation.y = Math.PI/2;
        this.scene.add(wallN, wallS, wallE, wallW);

        // Simple Road Grid
        for(let i = -groundSize/2 + 20; i < groundSize/2; i += 40) {
            const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, 12), new THREE.MeshPhongMaterial({ map: roadTex }));
            hRoad.rotation.x = -Math.PI/2; hRoad.position.set(0, 0.02, i);
            const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(12, groundSize), new THREE.MeshPhongMaterial({ map: roadTex }));
            vRoad.rotation.x = -Math.PI/2; vRoad.rotation.z = Math.PI/2; vRoad.position.set(i, 0.02, 0);
            this.scene.add(hRoad, vRoad);
        }

        // Buildings & Sidewalks (Compact)
        const swMat = new THREE.MeshPhongMaterial({ map: sidewalkTex });
        const occupiedZones = [
            { x: 100, z: 100, w: 25 }, // Dockside Drapes zone
            { x: 0, z: 0, w: 10 }      // Player spawn zone
        ];

        for (let i = 0; i < 40; i++) {
            const h = Math.random() * 20 + 10;
            const w = Math.random() * 8 + 6;
            const buffer = 4; // Sidewalk buffer
            
            let bx, bz, tooClose;
            let attempts = 0;
            
            do {
                tooClose = false;
                bx = (Math.random() - 0.5) * (groundSize - 30);
                bz = (Math.random() - 0.5) * (groundSize - 30);
                
                // 1. Check Road Collision (Roads are every 40 units starting at -80)
                const roadMargin = 10; // Road width is 12, center-to-edge is 6, plus margin
                if (Math.abs(bx % 40) < roadMargin || Math.abs((bx + 20) % 40) < roadMargin) tooClose = true;
                if (Math.abs(bz % 40) < roadMargin || Math.abs((bz + 20) % 40) < roadMargin) tooClose = true;
                
                // 2. Check Overlap with other buildings (AABB)
                if (!tooClose) {
                    for (const zone of occupiedZones) {
                        const dx = Math.abs(bx - zone.x);
                        const dz = Math.abs(bz - zone.z);
                        if (dx < (w + zone.w) / 2 + 2 && dz < (w + zone.w) / 2 + 2) {
                            tooClose = true;
                            break;
                        }
                    }
                }
                attempts++;
            } while (tooClose && attempts < 100);

            if (attempts >= 100) continue; // Skip if no spot found

            occupiedZones.push({ x: bx, z: bz, w: w });

            // Add Sidewalk Base
            const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.4, w + 4), swMat);
            sidewalk.position.set(bx, 0.2, bz);
            sidewalk.receiveShadow = true;
            this.scene.add(sidewalk);

            // Multi-material building
            const bGeo = new THREE.BoxGeometry(w, h, w);
            const materials = [
                new THREE.MeshPhongMaterial({ map: brickTex }), // sides
                new THREE.MeshPhongMaterial({ map: brickTex }), // sides
                new THREE.MeshPhongMaterial({ color: 0x333333 }), // top
                new THREE.MeshPhongMaterial({ color: 0x111111 }), // bottom
                new THREE.MeshPhongMaterial({ map: windowTex }), // front (windows)
                new THREE.MeshPhongMaterial({ map: windowTex })  // back (windows)
            ];
            const building = new THREE.Mesh(bGeo, materials);
            
            building.position.set(bx, h / 2 + 0.4, bz);
            building.castShadow = true; building.receiveShadow = true;
            this.scene.add(building);

            // COLLISION: Add building to environment objects
            this.environmentObjects.push({
                type: 'building',
                x: bx, z: bz,
                w: w, d: w,
                h: h
            });
            
            // Add Streetlight next to building
            const streetLight = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6), new THREE.MeshPhongMaterial({color: 0x333333}));
            pole.position.y = 3;
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 0xffaa00}));
            bulb.position.y = 6;
            const light = new THREE.PointLight(0xffaa00, 0, 30); // Start OFF
            light.position.y = 6;
            streetLight.add(pole, bulb, light);
            streetLight.position.set(bx + w/2 + 2, 0, bz + w/2 + 2);
            this.scene.add(streetLight);
            this.streetLights.push(light);
        }

        // Add Bushes
        const bushMat = new THREE.MeshPhongMaterial({ color: 0x113300 });
        for (let i = 0; i < 40; i++) {
            const bx = (Math.random() - 0.5) * 180;
            const bz = (Math.random() - 0.5) * 180;
            
            // Check road collision (Roads are every 40 units)
            if (Math.abs(bx % 40) < 12 || Math.abs((bx + 20) % 40) < 12) continue;
            if (Math.abs(bz % 40) < 12 || Math.abs((bz + 20) % 40) < 12) continue;

            const size = 0.8 + Math.random() * 0.6;
            const bush = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), bushMat);
            bush.position.set(bx, size / 2, bz);
            bush.castShadow = true;
            this.scene.add(bush);
            
            this.environmentObjects.push({
                type: 'bush',
                x: bx, z: bz,
                w: size * 1.5, d: size * 1.5
            });
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
            if (e.code === 'KeyF' && !this.player.isPunching) {
                this.player.isBlocking = true;
                this.player.lastBlockTime = Date.now();
            }
            if (e.code === 'KeyE') {
                const distToShop = this.player.mesh.position.distanceTo(this.shopDoor.position);
                if (distToShop < 5) {
                    window.ui.updateShopUI(this.shopItems, this.player.currency, (item) => this.buyItem(item));
                    window.ui.showScreen('shop');
                    document.exitPointerLock();
                }
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'KeyF') {
                this.player.isBlocking = false;
            }
        });
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
        if(this.player.isPunching || this.player.isBlocking) return;
        
        const now = Date.now();
        
        if (this.player.weapon) {
            // Gun Logic
            if (now - this.lastWeaponFire < this.player.weapon.cooldown) return;
            this.lastWeaponFire = now;
            
            const dir = new THREE.Vector3(0, 0, 1);
            dir.applyEuler(new THREE.Euler(this.cameraRotation.x, this.cameraRotation.y, 0));
            
            if (this.player.weapon.id === 'shotgun') {
                for(let i=0; i<this.player.weapon.pellets; i++) {
                    const spread = dir.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2));
                    this.bullets.push(new Bullet(this.scene, this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), spread, this.player.weapon.damage));
                }
            } else {
                this.bullets.push(new Bullet(this.scene, this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), dir, this.player.weapon.damage));
            }
            return;
        }

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

    addCurrency(a) {
        this.player.currency += a;
        const el = document.getElementById('cash-display');
        if (el) el.textContent = `$${this.player.currency}`;
    }

    buyItem(item) {
        if (this.player.currency >= item.price) {
            this.player.currency -= item.price;
            this.player.weapon = item;
            const el = document.getElementById('cash-display');
            if (el) el.textContent = `$${this.player.currency}`;
            window.ui.showNotification(`PURCHASED: ${item.name}`);
            window.ui.hideScreens();
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
            const armAngle = -Math.sin(punchProgress * Math.PI) * 1.5;
            
            // Right Upper Arm swings forward
            this.player.mesh.children[4].rotation.x = armAngle;
            // Right Lower Arm (forearm) extends out
            this.player.mesh.children[4].children[0].rotation.x = Math.sin(punchProgress * Math.PI) * 0.8;
            
            // Counter balance with left arm
            this.player.mesh.children[3].rotation.x = -armAngle * 0.2;
        } 
        else if (this.player.isBlocking) {
            // Block Pose (Arms up in front)
            this.player.mesh.children[3].rotation.x = -1.2;
            this.player.mesh.children[3].children[0].rotation.x = -0.5;
            this.player.mesh.children[4].rotation.x = -1.2;
            this.player.mesh.children[4].children[0].rotation.x = -0.5;
        }
        else if (isMoving && this.player.onGround) {
            const legSpeed = this.keys['ShiftLeft'] ? 10 : 5;
            
            // Upper parts swing
            this.player.mesh.children[3].rotation.x = Math.sin(t * legSpeed) * 0.5;
            this.player.mesh.children[4].rotation.x = -Math.sin(t * legSpeed) * 0.5;
            this.player.mesh.children[5].rotation.x = -Math.sin(t * legSpeed) * 0.5;
            this.player.mesh.children[6].rotation.x = Math.sin(t * legSpeed) * 0.5;
            
            // Add some lower part movement for fluidness
            this.player.mesh.children[3].children[0].rotation.x = -Math.abs(Math.sin(t * legSpeed)) * 0.3;
            this.player.mesh.children[4].children[0].rotation.x = -Math.abs(Math.sin(t * legSpeed)) * 0.3;
            this.player.mesh.children[5].children[0].rotation.x = Math.abs(Math.sin(t * legSpeed)) * 0.5;
            this.player.mesh.children[6].children[0].rotation.x = Math.abs(Math.sin(t * legSpeed)) * 0.5;
        } else {
            // Idle/Jump Pose
            for(let i=3; i<7; i++) {
                this.player.mesh.children[i].rotation.x = 0;
                this.player.mesh.children[i].rotation.y = 0;
                if(this.player.mesh.children[i].children[0]) {
                    this.player.mesh.children[i].children[0].rotation.x = 0;
                }
            }
        }

        // --- Physics & Movement ---
        this.player.mesh.rotation.y = this.cameraRotation.y;
        
        // Sprinting depends on Dash charge
        const isSprinting = this.keys['ShiftLeft'] && this.player.dashCharge > 0;
        const speed = isSprinting ? 0.3 : 0.15;
        const crouchMod = this.keys['ControlLeft'] ? 0.5 : 1.0;

        // Update Dash/Sprint charge
        if (this.keys['ShiftLeft'] && this.player.dashCharge > 0) {
            this.player.dashCharge -= 0.5;
        } else if (this.player.dashCharge < 100) {
            this.player.dashCharge += 0.2;
        }
        const dashFill = document.getElementById('dash-fill');
        if (dashFill) dashFill.style.width = this.player.dashCharge + '%';

        const move = new THREE.Vector3();
        if(this.keys['KeyW']) move.z += 1;
        if(this.keys['KeyS']) move.z -= 1;
        if(this.keys['KeyA']) move.x += 1;
        if(this.keys['KeyD']) move.x -= 1;
        
        const oldPos = this.player.mesh.position.clone();
        if(move.length() > 0) {
            move.normalize();
            move.applyEuler(new THREE.Euler(0, this.player.mesh.rotation.y, 0));
            this.player.mesh.position.add(move.multiplyScalar(speed * crouchMod));
        }

        // Environmental Collision
        const pr = 0.6; // Player collision radius
        for (const obj of this.environmentObjects) {
            const dx = Math.abs(this.player.mesh.position.x - obj.x);
            const dz = Math.abs(this.player.mesh.position.z - obj.z);
            const combinedW = (obj.w / 2) + pr;
            const combinedD = (obj.d / 2) + pr;

            if (dx < combinedW && dz < combinedD) {
                // Sliding collision: block axis that was crossed
                const dxOld = Math.abs(oldPos.x - obj.x);
                const dzOld = Math.abs(oldPos.z - obj.z);
                if (dxOld >= (obj.w/2 + pr)) this.player.mesh.position.x = oldPos.x;
                if (dzOld >= (obj.d/2 + pr)) this.player.mesh.position.z = oldPos.z;
            }
        }

        // Invisible Wall Collision Logic
        const halfSize = 100; // groundSize is 200
        if (this.player.mesh.position.x > halfSize) this.player.mesh.position.x = halfSize;
        if (this.player.mesh.position.x < -halfSize) this.player.mesh.position.x = -halfSize;
        if (this.player.mesh.position.z > halfSize) this.player.mesh.position.z = halfSize;
        if (this.player.mesh.position.z < -halfSize) this.player.mesh.position.z = -halfSize;

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
        
        // Shop Interaction Prompt
        const distToShop = this.player.mesh.position.distanceTo(this.shopDoor.position);
        if (distToShop < 5) {
            const area = document.getElementById('notification-area');
            if (area && !area.querySelector('.interact-prompt')) {
                const div = document.createElement('div');
                div.className = 'interact-prompt';
                div.innerHTML = '[E] ENTER DOCKSIDE DRAPES';
                div.style.color = '#ffff00';
                div.style.textAlign = 'center';
                area.appendChild(div);
                setTimeout(() => div.remove(), 100);
            }
        }

        // Bullet Update
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(this.enemies);
            if (this.bullets[i].isDead) this.bullets.splice(i, 1);
        }

        // Cash Collection
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            d.update();
            if (this.player.mesh.position.distanceTo(d.mesh.position) < 2) {
                this.addCurrency(d.value);
                d.remove();
                this.drops.splice(i, 1);
                window.ui.showNotification(`+$${d.value}`);
            }
        }

        // Camera Follow
        const camDist = 6;
        const camHeight = 2.5;
        const offset = new THREE.Vector3(0, camHeight, -camDist);
        offset.applyEuler(this.cameraRotation);
        
        this.camera.position.copy(this.player.mesh.position).add(offset);
        this.camera.lookAt(this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)));

        // Day/Night Cycle Logic
        this.time += 0.001; // Cycle speed
        const dn = Math.sin(this.time); // -1 (Night) to 1 (Day)
        
        // Sun position & color
        this.sunLight.position.set(Math.cos(this.time) * 100, Math.sin(this.time) * 100, 50);
        this.sunLight.intensity = Math.max(0, dn * 1.2);
        
        // Ambient & Sky color
        const skyCol = new THREE.Color().setHSL(0.6, 0.4, Math.max(0.1, dn * 0.5 + 0.2));
        this.scene.background = skyCol;
        this.scene.fog.color = skyCol;
        this.ambientLight.intensity = Math.max(0.2, dn * 0.5 + 0.3);

        // Toggle Streetlights
        const nightMode = dn < 0.1;
        this.streetLights.forEach(sl => {
            sl.intensity = nightMode ? 1.5 : 0;
        });

        this.renderer.render(this.scene, this.camera);
    }

    updateMinimap() {
        const c = document.getElementById('minimap');
        if(!c) return;
        const ctx = c.getContext('2d');
        const size = 180;
        const center = size / 2;
        const scale = 2; // Pixels per meter

        c.width = size; c.height = size; 
        
        ctx.fillStyle = '#0a0a0c'; 
        ctx.fillRect(0, 0, size, size);
        
        ctx.save();
        ctx.translate(center, center);
        
        const px = this.player.mesh.position.x;
        const pz = this.player.mesh.position.z;

        // Draw Roads (+Z is UP)
        ctx.fillStyle = '#1a1a1f';
        for(let i = -80; i <= 80; i += 40) {
            // Horizontal Roads (Z-parallel logic for canvas Y)
            ctx.fillRect((-100 - px) * scale, (pz - i - 6) * scale, 200 * scale, 12 * scale);
            // Vertical Roads (X-parallel logic for canvas X)
            ctx.fillRect((i - 6 - px) * scale, (pz - 100) * scale, 12 * scale, 200 * scale);
        }

        // Environment Objects (Buildings/Bushes/Shop)
        this.environmentObjects.forEach(obj => {
            const relX = (obj.x - px) * scale;
            const relZ = (pz - obj.z) * scale; // Inverted mapping: +Z is UP
            
            if (obj.type === 'shop') {
                ctx.fillStyle = '#600';
                ctx.fillRect(relX - (obj.w/2)*scale, relZ - (obj.d/2)*scale, obj.w*scale, obj.d*scale);
                ctx.strokeStyle = '#f00'; ctx.strokeRect(relX - (obj.w/2)*scale, relZ - (obj.d/2)*scale, obj.w*scale, obj.d*scale);
            } else if (obj.type === 'building') {
                ctx.fillStyle = '#333';
                ctx.fillRect(relX - (obj.w/2)*scale, relZ - (obj.d/2)*scale, obj.w*scale, obj.d*scale);
            } else if (obj.type === 'bush') {
                ctx.fillStyle = '#141';
                ctx.beginPath();
                ctx.arc(relX, relZ, (obj.w/2)*scale, 0, Math.PI*2);
                ctx.fill();
            }
        });

        // NPCs
        this.enemies.forEach(e => {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect((e.mesh.position.x - px) * scale - 2, (pz - e.mesh.position.z) * scale - 2, 4, 4);
        });

        // Mission Marker logic (if exists)
        if (this.missionManager && this.missionManager.activeMission) {
            const mPos = this.missionManager.target;
            if (mPos) {
                const relX = (mPos.x - px) * scale;
                const relZ = (pz - mPos.z) * scale;
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(relX, relZ, 4, 0, Math.PI*2);
                ctx.fill();
            }
        }

        // Shop Pointer (on edge if far)
        if (this.shopBuilding) {
            const dx = (this.shopBuilding.position.x - px) * scale;
            const dz = (pz - this.shopBuilding.position.z) * scale;
            const limit = size/2 - 10;
            if (Math.abs(dx) > limit || Math.abs(dz) > limit) {
                const angle = Math.atan2(dz, dx);
                const ex = Math.cos(angle) * limit;
                const ez = Math.sin(angle) * limit;
                ctx.fillStyle = '#00ff00';
                ctx.beginPath(); ctx.arc(ex, ez, 4, 0, Math.PI*2); ctx.fill();
            }
        }

        ctx.restore();

        // Player Pointer (Static Center)
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(-this.player.mesh.rotation.y);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
        ctx.fill();
        ctx.restore();
    }
}

// 4. Start
window.game = new ConcreteReign();
