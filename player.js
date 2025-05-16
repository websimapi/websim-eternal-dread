import * as THREE from 'three';

export class Player {
    constructor(camera, controls, scene, audioManager) {
        this.camera = camera;
        this.controls = controls;
        this.scene = scene;
        this.audioManager = audioManager;
        
        this.position = new THREE.Vector3(0, 1.6, 0);
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        this.movementSpeed = 4.0;
        this.runSpeed = 8.0;
        this.jumpStrength = 10.0;
        this.gravity = 20.0;
        
        this.controlsActive = false;
        this.isDead = false;
        this.isCrouching = false;
        this.isRunning = false;
        this.canJump = true;
        
        this.sanity = 100;
        this.sanityDecreaseRate = 1.0; // Sanity lost per second in darkness
        
        this.setupFlashlight();
        this.setupKeyControls();
    }
    
    setupFlashlight() {
        // Create flashlight (spotlight)
        this.flashlight = new THREE.SpotLight(0xffffff, 1.0, 15, Math.PI / 6, 0.5, 1);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.castShadow = true;
        
        // Flashlight target
        this.flashlightTarget = new THREE.Object3D();
        this.flashlightTarget.position.set(0, 0, -1);
        this.scene.add(this.flashlightTarget);
        this.flashlight.target = this.flashlightTarget;
        
        // Configure shadow
        this.flashlight.shadow.mapSize.width = 1024;
        this.flashlight.shadow.mapSize.height = 1024;
        this.flashlight.shadow.camera.near = 0.5;
        this.flashlight.shadow.camera.far = 15;
        
        this.flashlightOn = false;
        this.batteryLevel = 100;
        this.batteryDrainRate = 2.0; // Battery percentage lost per second
        this.batteryRechargeRate = 1.0; // Battery percentage recharged per second when off
    }
    
    setupKeyControls() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            run: false
        };
        
        document.addEventListener('keydown', (event) => {
            if (!this.controlsActive) return;
            
            switch (event.code) {
                case 'KeyW':
                    this.keys.forward = true;
                    break;
                case 'KeyS':
                    this.keys.backward = true;
                    break;
                case 'KeyA':
                    this.keys.left = true;
                    break;
                case 'KeyD':
                    this.keys.right = true;
                    break;
                case 'Space':
                    this.keys.jump = true;
                    if (this.canJump) {
                        this.jump();
                    }
                    break;
                case 'ShiftLeft':
                    this.keys.run = true;
                    break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.keys.forward = false;
                    break;
                case 'KeyS':
                    this.keys.backward = false;
                    break;
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'Space':
                    this.keys.jump = false;
                    break;
                case 'ShiftLeft':
                    this.keys.run = false;
                    break;
            }
        });
    }
    
    toggleFlashlight() {
        if (this.batteryLevel <= 0 && !this.flashlightOn) {
            this.audioManager.playSound('flashlight_fail');
            return;
        }
        
        this.flashlightOn = !this.flashlightOn;
        
        if (this.flashlightOn) {
            this.scene.add(this.flashlight);
            this.audioManager.playSound('flashlight_on');
        } else {
            this.scene.remove(this.flashlight);
            this.audioManager.playSound('flashlight_off');
        }
    }
    
    toggleCrouch() {
        this.isCrouching = !this.isCrouching;
        
        if (this.isCrouching) {
            this.camera.position.y = 0.8; // Crouch height
            this.movementSpeed = 2.0; // Slower when crouching
        } else {
            this.camera.position.y = 1.6; // Standing height
            this.movementSpeed = 4.0; // Normal movement speed
        }
    }
    
    jump() {
        if (!this.canJump) return;
        
        this.velocity.y = this.jumpStrength;
        this.canJump = false;
        this.audioManager.playSound('jump');
    }
    
    update(delta, world) {
        if (this.isDead) return;
        
        this.updateMovement(delta, world);
        this.updateFlashlight(delta);
        this.updateSanity(delta, world);
        this.checkInteractions(world);
    }
    
    updateMovement(delta, world) {
        // Calculate movement direction
        let speedMultiplier = 1;
        if (this.keys.run && !this.isCrouching) {
            speedMultiplier = this.runSpeed / this.movementSpeed;
            this.isRunning = true;
        } else {
            this.isRunning = false;
        }
        
        this.direction.z = Number(this.keys.forward) - Number(this.keys.backward);
        this.direction.x = Number(this.keys.right) - Number(this.keys.left);
        this.direction.normalize();
        
        // Apply gravity and check ground collision
        this.velocity.y -= this.gravity * delta;
        
        // Make sure world is defined before accessing it
        if (world) {
            const groundY = world.getHeightAt(this.position.x, this.position.z);
            if (this.position.y < groundY + 1.6 && this.velocity.y < 0) {
                this.position.y = groundY + 1.6;
                this.velocity.y = 0;
                this.canJump = true;
            }
        }
        
        // Update position
        const actualSpeed = this.isCrouching ? this.movementSpeed : this.movementSpeed * speedMultiplier;
        
        if (this.direction.z !== 0) {
            this.velocity.z = this.direction.z * actualSpeed;
        } else {
            this.velocity.z = 0;
        }
        
        if (this.direction.x !== 0) {
            this.velocity.x = this.direction.x * actualSpeed;
        } else {
            this.velocity.x = 0;
        }
        
        // Move position
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;
        
        // Update camera position
        this.camera.position.x = this.position.x;
        // Y is handled by crouch toggle
        this.camera.position.z = this.position.z;
        
        // Play footstep sounds
        if ((this.keys.forward || this.keys.backward || this.keys.left || this.keys.right) && this.canJump) {
            this.footstepTimer = (this.footstepTimer || 0) + delta;
            const stepInterval = this.isRunning ? 0.3 : (this.isCrouching ? 0.7 : 0.5);
            
            if (this.footstepTimer > stepInterval) {
                this.footstepTimer = 0;
                this.audioManager.playSound('footstep', { volume: this.isCrouching ? 0.2 : 0.5 });
            }
        }
    }
    
    updateFlashlight(delta) {
        // Update flashlight position and direction
        this.flashlight.position.copy(this.camera.position);
        
        const vector = new THREE.Vector3(0, 0, -1);
        vector.applyQuaternion(this.camera.quaternion);
        
        this.flashlightTarget.position.copy(this.camera.position).add(vector.multiplyScalar(5));
        
        // Update battery level
        if (this.flashlightOn) {
            this.batteryLevel = Math.max(0, this.batteryLevel - this.batteryDrainRate * delta);
            
            if (this.batteryLevel <= 0) {
                this.toggleFlashlight();
            }
        } else {
            this.batteryLevel = Math.min(100, this.batteryLevel + this.batteryRechargeRate * delta);
        }
    }
    
    updateSanity(delta, world) {
        // Decrease sanity in darkness
        if (!this.flashlightOn) {
            this.sanity = Math.max(0, this.sanity - this.sanityDecreaseRate * delta);
        }
        
        // Update UI
        document.getElementById('sanity-bar').style.width = `${this.sanity}%`;
        
        // Visual effects based on sanity
        const bloodOverlay = document.querySelector('.blood-overlay') || this.createBloodOverlay();
        bloodOverlay.style.backgroundColor = `rgba(80, 0, 0, ${(100 - this.sanity) / 100 * 0.5})`;
        
        // Game over if sanity reaches 0
        if (this.sanity <= 0 && !this.isDead) {
            this.die();
        }
    }
    
    createBloodOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'blood-overlay';
        document.getElementById('game-container').appendChild(overlay);
        return overlay;
    }
    
    checkInteractions(world) {
        // Check if any interactable is nearby
        const interactionRange = 3;
        let nearestInteractable = null;
        let nearestDistance = interactionRange;
        
        world.interactables.forEach(interactable => {
            const distance = this.position.distanceTo(interactable.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestInteractable = interactable;
            }
        });
        
        const interactionPrompt = document.getElementById('interaction-prompt');
        
        if (nearestInteractable) {
            interactionPrompt.style.display = 'block';
            
            if (nearestInteractable.type === 'hideout') {
                interactionPrompt.textContent = 'Press C to hide';
            } else if (nearestInteractable.type === 'item') {
                interactionPrompt.textContent = 'Press E to pick up';
            } else {
                interactionPrompt.textContent = 'Press E to interact';
            }
        } else {
            interactionPrompt.style.display = 'none';
        }
    }
    
    interact(world) {
        // Initialize inventory if not already set
        if (!this.inventory) {
            // This is a temporary fix - ideally the inventory should be passed
            // to the Player constructor rather than created here
            this.inventory = window.game?.inventory || {
                addItem: () => console.warn("Inventory not properly initialized")
            };
        }

        // Handle interaction with objects
        const interactionRange = 3;
        let nearestInteractable = null;
        let nearestDistance = interactionRange;
        
        world.interactables.forEach(interactable => {
            const distance = this.position.distanceTo(interactable.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestInteractable = interactable;
            }
        });
        
        if (nearestInteractable && nearestInteractable.type === 'item') {
            // Pick up item
            world.interactables = world.interactables.filter(i => i !== nearestInteractable);
            this.scene.remove(nearestInteractable.mesh);
            this.inventory.addItem(nearestInteractable.itemData);
            this.audioManager.playSound('pickup');
        }
    }
    
    recoverSanity(amount) {
        this.sanity = Math.min(100, this.sanity + amount);
    }
    
    takeDamage(amount) {
        this.sanity = Math.max(0, this.sanity - amount);
        this.audioManager.playSound('player_hurt');
        
        // Screen shake effect
        const shakeIntensity = amount / 10;
        this.cameraShake(shakeIntensity, 0.5);
    }
    
    cameraShake(intensity, duration) {
        const originalY = this.isCrouching ? 0.8 : 1.6;
        let elapsed = 0;
        
        const shakeInterval = setInterval(() => {
            if (elapsed >= duration) {
                clearInterval(shakeInterval);
                this.camera.position.y = originalY;
                return;
            }
            
            const offsetX = (Math.random() - 0.5) * intensity;
            const offsetY = (Math.random() - 0.5) * intensity;
            
            this.camera.position.y = originalY + offsetY;
            this.camera.position.x = this.position.x + offsetX;
            
            elapsed += 0.05;
        }, 50);
    }
    
    die() {
        this.isDead = true;
        this.audioManager.playSound('player_death');
        document.getElementById('death-screen').classList.remove('hidden');
    }
    
    reset() {
        this.position.set(0, 1.6, 0);
        this.velocity.set(0, 0, 0);
        this.isDead = false;
        this.sanity = 100;
        this.batteryLevel = 100;
        
        if (this.flashlightOn) {
            this.scene.remove(this.flashlight);
            this.flashlightOn = false;
        }
        
        if (this.isCrouching) {
            this.toggleCrouch();
        }
        
        // Update UI
        document.getElementById('sanity-bar').style.width = '100%';
        document.querySelector('.blood-overlay').style.backgroundColor = 'rgba(80, 0, 0, 0)';
    }
}