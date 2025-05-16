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
        
        // Player dimensions
        this.eyeHeight = 1.6;
        this.crouchHeight = 0.8;
        this.standingHeight = 1.6;
        this.collisionRadius = 0.3;
        
        // Terrain following
        this.currentGroundY = 0;
        this.terrainSmoothingFactor = 0.25; // Lower for slower terrain adaptation
        this.maxClimbAngle = Math.PI / 4; // Maximum angle player can climb (45 degrees)
        
        this.sanity = 100;
        this.sanityDecreaseRate = 1.0; // Sanity lost per second in darkness
        
        this.setupFlashlight();
        this.setupKeyControls();
    }
    
    setupFlashlight() {
        // Create flashlight (spotlight) - increased range and intensity
        this.flashlight = new THREE.SpotLight(0xffffff, 1.5, 25, Math.PI / 5, 0.5, 1);
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
        this.flashlight.shadow.camera.far = 25; // Increased far plane
        
        this.flashlightOn = false;
        this.batteryLevel = 100;
        this.batteryDrainRate = 1.0; // Reduced battery drain rate (was 2.0)
        this.batteryRechargeRate = 1.5; // Increased recharge rate (was 1.0)
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
            this.eyeHeight = this.crouchHeight;
            this.movementSpeed = 2.0; // Slower when crouching
        } else {
            this.eyeHeight = this.standingHeight;
            this.movementSpeed = 4.0; // Normal movement speed
        }
        
        // Don't immediately change camera height - let the movement system handle it
        // based on current terrain to avoid clipping
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
        
        // Reset direction vector
        this.direction.set(0, 0, 0);
        
        // Get camera direction vectors
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep movement on the horizontal plane
        cameraDirection.normalize();
        
        // Get right vector (perpendicular to camera direction)
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Apply forward/backward movement relative to camera direction
        if (this.keys.forward) {
            this.direction.add(cameraDirection);
        }
        if (this.keys.backward) {
            this.direction.sub(cameraDirection);
        }
        
        // Apply left/right movement relative to camera direction
        if (this.keys.right) {
            this.direction.add(rightVector);
        }
        if (this.keys.left) {
            this.direction.sub(rightVector);
        }
        
        // Normalize direction if moving
        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
        }
        
        // Apply gravity and check ground collision
        this.velocity.y -= this.gravity * delta;
        
        // Store previous position for collision detection
        const previousPosition = this.position.clone();
        
        // Calculate horizontal movement
        const actualSpeed = this.isCrouching ? this.movementSpeed : this.movementSpeed * speedMultiplier;
        const horizontalVelocity = new THREE.Vector3(
            this.direction.x * actualSpeed,
            0,
            this.direction.z * actualSpeed
        );
        
        // Apply vertical velocity
        this.position.y += this.velocity.y * delta;
        
        // Check if we're standing on an object using raycasting
        const standingCollision = world.checkStandingCollision(
            this.position,
            this.collisionRadius,
            this.eyeHeight
        );
        
        // Get terrain height at current position
        const currentGroundY = world.getHeightAt(this.position.x, this.position.z);
        
        // Check if we're on the ground (terrain or object)
        const playerBottom = this.position.y - this.eyeHeight;
        let onObject = false;
        
        if (standingCollision.collides) {
            // We're above an object
            const objectTopY = standingCollision.point.y;
            
            if (playerBottom <= objectTopY && this.velocity.y <= 0) {
                // We're standing on the object
                this.position.y = objectTopY + this.eyeHeight;
                this.velocity.y = 0;
                this.canJump = true;
                onObject = true;
            }
        }
        
        if (!onObject && playerBottom <= currentGroundY && this.velocity.y <= 0) {
            // We're on the terrain
            this.position.y = currentGroundY + this.eyeHeight;
            this.velocity.y = 0;
            this.canJump = true;
            this.currentGroundY = currentGroundY;
        }
        
        // Now handle horizontal movement with collision detection
        if (this.canJump) { // Only do terrain following when on the ground
            // Try to move in the requested direction
            const nextX = this.position.x + horizontalVelocity.x * delta;
            const nextZ = this.position.z + horizontalVelocity.z * delta;
            
            // Get heights at test positions for slope calculation
            const nextPosGroundY = world.getHeightAt(nextX, nextZ);
            
            // Calculate the slope angle
            const rise = nextPosGroundY - currentGroundY;
            const run = Math.sqrt(
                Math.pow(horizontalVelocity.x * delta, 2) + 
                Math.pow(horizontalVelocity.z * delta, 2)
            );
            
            // Prevent division by zero
            const slopeAngle = run > 0.001 ? Math.atan(rise / run) : 0;
            
            // Check if slope is too steep
            if (Math.abs(slopeAngle) <= this.maxClimbAngle) {
                // Check for object collisions before moving
                const nextPosition = new THREE.Vector3(nextX, this.position.y, nextZ);
                const collision = world.checkCollision(nextPosition, this.collisionRadius);
                
                if (!collision.collides) {
                    // No collision - apply movement
                    this.position.x = nextX;
                    this.position.z = nextZ;
                    
                    // Check if we're now standing on an object at the new position
                    const newStandingCollision = world.checkStandingCollision(
                        this.position,
                        this.collisionRadius,
                        this.eyeHeight
                    );
                    
                    if (newStandingCollision.collides) {
                        // We're above an object at new position
                        const objectTopY = newStandingCollision.point.y;
                        
                        // Only adjust height if we're close enough to the object top
                        if (Math.abs(playerBottom - objectTopY) < 1.0) {
                            this.position.y = objectTopY + this.eyeHeight;
                            this.currentGroundY = objectTopY;
                        } else {
                            // Smoothly adapt to new ground height from terrain
                            const targetY = nextPosGroundY + this.eyeHeight;
                            this.position.y = THREE.MathUtils.lerp(
                                this.position.y, 
                                targetY, 
                                this.terrainSmoothingFactor
                            );
                            this.currentGroundY = nextPosGroundY;
                        }
                    } else if (!onObject) {
                        // Smoothly adapt to new ground height from terrain
                        const targetY = nextPosGroundY + this.eyeHeight;
                        this.position.y = THREE.MathUtils.lerp(
                            this.position.y, 
                            targetY, 
                            this.terrainSmoothingFactor
                        );
                        this.currentGroundY = nextPosGroundY;
                    }
                } else {
                    // Handle collision with sliding
                    const collisionNormal = new THREE.Vector3()
                        .subVectors(nextPosition, collision.object.position)
                        .normalize();
                    
                    // Calculate slide direction
                    const slideDirection = new THREE.Vector3()
                        .copy(horizontalVelocity)
                        .projectOnPlane(collisionNormal)
                        .normalize();
                    
                    // Try multiple slide directions if the first one fails
                    const trySlide = (direction, factor = 0.5) => {
                        const slideX = this.position.x + direction.x * actualSpeed * delta * factor;
                        const slideZ = this.position.z + direction.z * actualSpeed * delta * factor;
                        
                        // Check if sliding causes another collision
                        const slidePosition = new THREE.Vector3(slideX, this.position.y, slideZ);
                        const slideCollision = world.checkCollision(slidePosition, this.collisionRadius);
                        
                        if (!slideCollision.collides) {
                            // Slide successful
                            this.position.x = slideX;
                            this.position.z = slideZ;
                            
                            // Update ground height for slide position
                            const slideGroundY = world.getHeightAt(slideX, slideZ);
                            const targetY = slideGroundY + this.eyeHeight;
                            this.position.y = THREE.MathUtils.lerp(
                                this.position.y, 
                                targetY, 
                                this.terrainSmoothingFactor
                            );
                            this.currentGroundY = slideGroundY;
                            return true;
                        }
                        return false;
                    };
                    
                    // Try the primary slide direction
                    if (slideDirection.lengthSq() > 0) {
                        // Try primary slide direction
                        const slidSuccess = trySlide(slideDirection);
                        
                        // If primary slide failed, try alternative directions
                        if (!slidSuccess) {
                            // Try sliding along x-axis only
                            const xDirection = new THREE.Vector3(horizontalVelocity.x, 0, 0).normalize();
                            const xSlideSuccess = trySlide(xDirection, 0.4);
                            
                            // If that fails, try sliding along z-axis only
                            if (!xSlideSuccess) {
                                const zDirection = new THREE.Vector3(0, 0, horizontalVelocity.z).normalize();
                                trySlide(zDirection, 0.4);
                            }
                        }
                    }
                }
            } else {
                // Slope is too steep - slide along the slope with improved mechanics
                const slopeDirection = new THREE.Vector3(
                    horizontalVelocity.x, 
                    0, 
                    horizontalVelocity.z
                ).normalize();
                
                // Calculate normal vector to the slope
                const slopeNormal = new THREE.Vector3(
                    -slopeDirection.z * Math.sign(rise), 
                    0, 
                    slopeDirection.x * Math.sign(rise)
                ).normalize();
                
                // Project movement onto the slope face
                const projectedVelocity = new THREE.Vector3()
                    .copy(horizontalVelocity)
                    .projectOnPlane(slopeNormal);
                
                // Try primary slide direction
                const nextX = this.position.x + projectedVelocity.x * delta * 0.5;
                const nextZ = this.position.z + projectedVelocity.z * delta * 0.5;
                
                // Check for collision
                const nextPosition = new THREE.Vector3(nextX, this.position.y, nextZ);
                const collision = world.checkCollision(nextPosition, this.collisionRadius);
                
                if (!collision.collides) {
                    this.position.x = nextX;
                    this.position.z = nextZ;
                }
            }
        } else {
            // We're in the air - apply horizontal movement without terrain adaptation
            // But still check for collisions with objects
            const nextPosition = new THREE.Vector3(
                this.position.x + horizontalVelocity.x * delta,
                this.position.y,
                this.position.z + horizontalVelocity.z * delta
            );
            
            const collision = world.checkCollision(nextPosition, this.collisionRadius);
            
            if (!collision.collides) {
                // No collision - apply movement
                this.position.x = nextPosition.x;
                this.position.z = nextPosition.z;
            } else {
                // Handle air collision with improved sliding
                const collisionNormal = new THREE.Vector3()
                    .subVectors(nextPosition, collision.object.position)
                    .normalize();
                
                // Calculate slide direction
                const slideDirection = new THREE.Vector3()
                    .copy(horizontalVelocity)
                    .projectOnPlane(collisionNormal)
                    .normalize();
                
                // Try multiple slide directions
                const trySlide = (direction, factor = 0.5) => {
                    const slideX = this.position.x + direction.x * actualSpeed * delta * factor;
                    const slideZ = this.position.z + direction.z * actualSpeed * delta * factor;
                    
                    // Check if sliding causes another collision
                    const slidePosition = new THREE.Vector3(slideX, this.position.y, slideZ);
                    const slideCollision = world.checkCollision(slidePosition, this.collisionRadius);
                    
                    if (!slideCollision.collides) {
                        // Slide successful
                        this.position.x = slideX;
                        this.position.z = slideZ;
                        return true;
                    }
                    return false;
                };
                
                // Try the primary slide direction
                if (slideDirection.lengthSq() > 0) {
                    // Try primary slide direction
                    const slidSuccess = trySlide(slideDirection);
                    
                    // If primary slide failed, try alternative directions
                    if (!slidSuccess) {
                        // Try sliding along x-axis only
                        const xDirection = new THREE.Vector3(horizontalVelocity.x, 0, 0).normalize();
                        const xSlideSuccess = trySlide(xDirection, 0.4);
                        
                        // If that fails, try sliding along z-axis only
                        if (!xSlideSuccess) {
                            const zDirection = new THREE.Vector3(0, 0, horizontalVelocity.z).normalize();
                            trySlide(zDirection, 0.4);
                        }
                    }
                }
            }
        }
        
        // Add micro-adjustment if we're stuck
        if (this.direction.lengthSq() > 0 && 
            this.position.distanceTo(previousPosition) < 0.01 && 
            this.canJump) {
            // We haven't moved despite trying to - we might be stuck
            // Add a tiny "unstuck" force
            this.position.x += this.direction.x * 0.05;
            this.position.z += this.direction.z * 0.05;
            this.position.y += 0.05; // Slight upward nudge to clear small obstacles
        }
        
        // Update camera position
        this.camera.position.x = this.position.x;
        this.camera.position.y = this.position.y;
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
        
        // Update battery indicator in UI
        if (window.game && window.game.ui) {
            window.game.ui.updateBatteryLevel(this.batteryLevel);
        }
    }
    
    updateSanity(delta, world) {
        // Decrease sanity in darkness, adjusted by moon cycle
        if (!this.flashlightOn) {
            const moonlightLevel = window.game?.moonCycle?.getCurrentMoonlightLevel() || 0;
            // Reduce sanity loss based on moonlight level
            const darknessFactor = 0.7 - (moonlightLevel * 1.5); // Reduced base darkness factor from 1.0 to 0.7
            this.sanity = Math.max(0, this.sanity - (this.sanityDecreaseRate * Math.max(0, darknessFactor) * delta));
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
        const originalY = this.position.y;
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
        this.currentGroundY = 0;
        
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