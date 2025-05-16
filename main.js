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
        this.initialize();
        this.setupEventListeners();
    }

    async initialize() {
        // Initialize loading screen
        this.loadingProgress = 0;
        this.updateLoadingBar();

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.05);
        this.scene.background = new THREE.Color(0x000000);

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
        this.updateLoadingProgress(90);

        // Set up lighting
        this.setupLighting();
        
        // Final loading steps
        this.updateLoadingProgress(100);
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
        }, 1000);

        // Start game loop
        this.animate();
    }

    setupLighting() {
        // Ambient light (very dim)
        const ambientLight = new THREE.AmbientLight(0x111111, 0.1);
        this.scene.add(ambientLight);
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
        
        if (this.player.controlsActive && !this.player.isDead) {
            this.player.update(delta, this.world);
            this.world.update(delta);
            this.aiManager.update(delta, this.player, this.world);
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

window.addEventListener('load', () => {
    const game = new Game();
});

