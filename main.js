import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { World } from './world.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { AudioManager } from './audio.js';
import { AIManager } from './ai.js';
import { InventorySystem } from './inventory.js';

class Game {
    constructor() {
        // Initialize the clock
        this.clock = new THREE.Clock();
        this.initialize();
        this.setupEventListeners();
    }

    async initialize() {
        // Initialize loading screen
        this.loadingProgress = 0;
        this.updateLoadingBar();

        // Create scene
        this.scene = new THREE.Scene();
        // Reduced fog density for better visibility
        this.scene.fog = new THREE.FogExp2(0x000000, 0.03);
        this.scene.background = new THREE.Color(0x050505); // Slightly lighter background

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Set up camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = 1.6; // Eye height

        // Create controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // Initialize UI
        this.ui = new UI();
        this.updateLoadingProgress(10);

        // Initialize audio manager
        this.audioManager = new AudioManager();
        await this.audioManager.initialize();
        this.updateLoadingProgress(30);

        // Initialize AI manager for jump scares
        this.aiManager = new AIManager(this.audioManager);
        await this.aiManager.initialize();
        this.updateLoadingProgress(50);

        // Create player
        this.player = new Player(this.camera, this.controls, this.scene, this.audioManager);
        this.updateLoadingProgress(60);

        // Initialize inventory system
        this.inventory = new InventorySystem(this.ui);
        this.updateLoadingProgress(70);

        // Create world
        this.world = new World(this.scene, this.player, this.aiManager, this.audioManager);
        await this.world.initialize();
        this.updateLoadingProgress(80);

        // Set up lighting
        this.setupLighting();
        
        // Initialize moon cycle
        this.moonCycle = new MoonCycle(this.scene);
        this.updateLoadingProgress(95);
        
        // Initialize collision debugger
        this.collisionDebugger = new CollisionDebugger(this.scene, this.world);
        
        // Final loading steps
        this.updateLoadingProgress(100);
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
        }, 1000);

        // Start game loop
        this.animate();
        
        window.game = this;
    }

    setupLighting() {
        // Increased ambient light for better visibility
        const ambientLight = new THREE.AmbientLight(0x222222, 0.4);
        this.scene.add(ambientLight);
        
        // Moonlight will be added and managed by the MoonCycle class
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Start game button
        document.getElementById('start-button').addEventListener('click', () => {
            document.getElementById('start-screen').classList.add('hidden');
            this.controls.lock();
            this.audioManager.playSound('ambient');
        });

        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            document.getElementById('death-screen').classList.add('hidden');
            this.player.reset();
            this.world.reset();
            this.controls.lock();
        });

        // Lock/unlock controls
        this.controls.addEventListener('lock', () => {
            this.player.controlsActive = true;
        });

        this.controls.addEventListener('unlock', () => {
            this.player.controlsActive = false;
            if (!this.player.isDead && !document.getElementById('start-screen').classList.contains('hidden')) {
                document.getElementById('start-screen').classList.remove('hidden');
            }
        });

        // Key controls
        document.addEventListener('keydown', (event) => {
            if (!this.player.controlsActive) return;
            
            switch (event.code) {
                case 'KeyF':
                    this.player.toggleFlashlight();
                    break;
                case 'KeyE':
                    this.player.interact(this.world);
                    break;
                case 'Tab':
                    event.preventDefault();
                    this.inventory.toggleInventory();
                    break;
                case 'KeyC':
                    this.player.toggleCrouch();
                    break;
                case 'KeyO':
                    // Toggle collision debugger
                    this.collisionDebugger.toggle();
                    break;
            }
        });
    }

    updateLoadingProgress(progress) {
        this.loadingProgress = progress;
        this.updateLoadingBar();
    }

    updateLoadingBar() {
        const loadingBar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        
        loadingBar.style.width = `${this.loadingProgress}%`;
        
        if (this.loadingProgress < 30) {
            loadingText.textContent = "Summoning dark entities...";
        } else if (this.loadingProgress < 60) {
            loadingText.textContent = "Crafting your nightmares...";
        } else if (this.loadingProgress < 90) {
            loadingText.textContent = "The shadows are gathering...";
        } else {
            loadingText.textContent = "Your nightmare awaits...";
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = Math.min(0.1, this.clock.getDelta());
        
        if (this.player && this.player.controlsActive && !this.player.isDead) {
            this.player.update(delta, this.world);
            this.world.update(delta);
            this.aiManager.update(delta, this.player, this.world);
            this.moonCycle.update(delta);
            this.collisionDebugger.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    gameOver() {
        this.player.isDead = true;
        this.controls.unlock();
        document.getElementById('death-screen').classList.remove('hidden');
        this.audioManager.playSound('player_death');
    }
}

class MoonCycle {
    constructor(scene) {
        this.scene = scene;
        this.cycleLength = 20 * 60; // 20 minutes in seconds
        this.currentTime = 0;
        this.currentPhase = 0;
        this.totalPhases = 8; // 8 phases of the moon
        
        // Create the moonlight (directional light) - increased intensity
        this.moonLight = new THREE.DirectionalLight(0xCCCCFF, 0);
        this.moonLight.position.set(0, 10, -10);
        this.moonLight.castShadow = true;
        
        // Configure shadow
        this.moonLight.shadow.mapSize.width = 1024;
        this.moonLight.shadow.mapSize.height = 1024;
        this.moonLight.shadow.camera.near = 0.5;
        this.moonLight.shadow.camera.far = 50;
        this.moonLight.shadow.camera.left = -20;
        this.moonLight.shadow.camera.right = 20;
        this.moonLight.shadow.camera.top = 20;
        this.moonLight.shadow.camera.bottom = -20;
        
        this.scene.add(this.moonLight);
        
        // Initialize with random phase
        this.currentPhase = Math.floor(Math.random() * this.totalPhases);
        this.updateMoonlightIntensity();
        
        console.log(`Moon cycle started at phase ${this.currentPhase + 1}`);
    }
    
    update(delta) {
        this.currentTime += delta;
        
        // Check if we need to change phase
        if (this.currentTime >= this.cycleLength) {
            this.currentTime = 0;
            this.currentPhase = (this.currentPhase + 1) % this.totalPhases;
            this.updateMoonlightIntensity();
            console.log(`Moon phase changed to ${this.currentPhase + 1}`);
        }
    }
    
    updateMoonlightIntensity() {
        // Phases 0-3: waxing moon (increasing light)
        // Phase 4: full moon (brightest)
        // Phases 5-7: waning moon (decreasing light)
        
        let intensity = 0;
        
        // Special case for phases 4-6: chance for complete darkness
        // Reduced probability of complete darkness from 30% to 15%
        if (this.currentPhase >= 3 && this.currentPhase <= 5) {
            // 15% chance for no moonlight on these phases
            if (Math.random() < 0.15) {
                intensity = 0.1; // Minimum light instead of complete darkness
                console.log("Moon obscured - very dark but not complete darkness");
                this.moonLight.intensity = intensity;
                return;
            }
        }
        
        // Normal moon cycle - increased baseline intensity
        if (this.currentPhase < 4) {
            // Waxing moon (0-3)
            intensity = 0.25 + (this.currentPhase * 0.15);
        } else if (this.currentPhase === 4) {
            // Full moon - significantly brighter
            intensity = 0.8;
        } else {
            // Waning moon (5-7)
            intensity = 0.5 - ((this.currentPhase - 5) * 0.1);
        }
        
        // Set the moonlight intensity
        this.moonLight.intensity = intensity;
        
        // Also adjust fog density based on moonlight
        if (this.scene.fog) {
            // More moonlight = less dense fog
            this.scene.fog.density = 0.03 - (intensity * 0.02);
        }
        
        // Update UI if available
        if (window.game && window.game.ui) {
            window.game.ui.updateMoonPhase(this.currentPhase, this.totalPhases);
        }
    }
    
    getCurrentMoonlightLevel() {
        return this.moonLight.intensity;
    }
}

class CollisionDebugger {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.enabled = false;
        this.debugMeshes = [];
    }
    
    toggle() {
        this.enabled = !this.enabled;
        
        if (this.enabled) {
            this.createDebugMeshes();
        } else {
            this.clearDebugMeshes();
        }
    }
    
    createDebugMeshes() {
        this.clearDebugMeshes();
        
        for (const collidable of this.world.collidables) {
            let debugMesh;
            
            if (collidable.isComplex && collidable.collisionMesh) {
                // Clone the complex collision mesh
                const geometry = collidable.collisionMesh.geometry.clone();
                const material = new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5
                });
                
                debugMesh = new THREE.Mesh(geometry, material);
                debugMesh.position.copy(collidable.collisionMesh.position);
                debugMesh.rotation.copy(collidable.collisionMesh.rotation);
                debugMesh.scale.copy(collidable.collisionMesh.scale);
            } else {
                // Create simple sphere for radius-based collisions
                const geometry = new THREE.SphereGeometry(collidable.radius, 16, 16);
                const material = new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5
                });
                
                debugMesh = new THREE.Mesh(geometry, material);
                debugMesh.position.copy(collidable.position);
            }
            
            this.scene.add(debugMesh);
            this.debugMeshes.push(debugMesh);
        }
    }
    
    clearDebugMeshes() {
        for (const mesh of this.debugMeshes) {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        }
        this.debugMeshes = [];
    }
    
    update() {
        if (!this.enabled) return;
        
        // Clear and recreate debug meshes each frame
        this.clearDebugMeshes();
        this.createDebugMeshes();
    }
}

window.addEventListener('load', () => {
    const game = new Game();
});