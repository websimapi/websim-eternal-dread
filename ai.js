export class AIManager {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.monsters = [];
        this.jumpScareTimeoutMin = 30; // Minimum seconds between random jump scares
        this.jumpScareTimeoutMax = 120; // Maximum seconds between random jump scares
        this.nextRandomJumpScare = this.getRandomJumpScareTime();
        this.jumpScareTimer = 0;
        this.activeJumpScare = false;
    }
    
    async initialize() {
        // Prepare jump scare prompts
        this.jumpScarePrompts = [
            "I can see you through the darkness",
            "Behind you. Turn around now.",
            "Your soul belongs to me",
            "There is no escape from your fate",
            "I've been watching you for so long",
            "The shadows are consuming you",
            "Your fear sustains me",
            "Run. They're coming for you.",
            "You will die here, alone and forgotten",
            "Look into my eyes and embrace eternity",
            "The blood must flow. Your blood.",
            "They crawl beneath your skin",
            "Every breath brings you closer to me",
            "The walls have eyes. They're watching.",
            "Your sanity is slipping away"
        ];
        
        // Create different types of monsters
        this.monsterTypes = [
            {
                name: 'Stalker',
                speed: 3.0,
                damage: 15,
                triggerDistance: 25,
                attackDistance: 1.5,
                fleeFromLight: true
            },
            {
                name: 'Screamer',
                speed: 6.0,
                damage: 25,
                triggerDistance: 15,
                attackDistance: 2.0,
                fleeFromLight: false
            },
            {
                name: 'Phantom',
                speed: 2.0,
                damage: 10,
                triggerDistance: 10,
                attackDistance: 1.0,
                fleeFromLight: true,
                canTeleport: true
            }
        ];
    }
    
    update(delta, player, world) {
        // Update monsters
        this.updateMonsters(delta, player, world);
        
        // Update jump scare timer
        if (!this.activeJumpScare) {
            this.jumpScareTimer += delta;
            
            if (this.jumpScareTimer >= this.nextRandomJumpScare) {
                // Random chance for jump scare, higher when sanity is lower
                const moonlightLevel = window.game?.moonCycle?.getCurrentMoonlightLevel() || 0;
                // Increase jump scare chance in brighter moonlight
                const jumpScareChance = 0.2 + (1 - player.sanity / 100) * 0.5 + (moonlightLevel * 0.2);
                
                if (Math.random() < jumpScareChance) {
                    this.triggerRandomJumpScare(player);
                }
                
                this.jumpScareTimer = 0;
                this.nextRandomJumpScare = this.getRandomJumpScareTime();
            }
        }
        
        // Spawn monsters based on light usage
        if (player.flashlightOn && Math.random() < 0.001 * delta) {
            this.spawnMonster(player.position, world);
        }
    }
    
    updateMonsters(delta, player, world) {
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            
            // Update monster position and state
            const distanceToPlayer = monster.position.distanceTo(player.position);
            
            // Decide if monster should flee from light
            let shouldFlee = false;
            if (monster.fleeFromLight && player.flashlightOn) {
                // Check if monster is in the direction of the flashlight
                const toMonster = monster.position.clone().sub(player.position).normalize();
                const flashlightDir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.camera.quaternion);
                
                const dot = toMonster.dot(flashlightDir);
                if (dot > 0.7 && distanceToPlayer < 10) {
                    shouldFlee = true;
                }
            }
            
            if (shouldFlee) {
                // Move away from player
                const fleeDir = monster.position.clone().sub(player.position).normalize();
                monster.position.add(fleeDir.multiplyScalar(monster.speed * 1.5 * delta));
                
                // If monster gets far enough away, remove it
                if (distanceToPlayer > 40) {
                    this.removeMonster(i);
                    continue;
                }
            } else if (distanceToPlayer <= monster.triggerDistance) {
                // Move towards player
                const moveDir = player.position.clone().sub(monster.position).normalize();
                monster.position.add(moveDir.multiplyScalar(monster.speed * delta));
                
                // Attack player if close enough
                if (distanceToPlayer <= monster.attackDistance) {
                    player.takeDamage(monster.damage * delta);
                    
                    // Small chance to trigger jumpscare on attack
                    if (Math.random() < 0.1) {
                        this.triggerJumpScare(monster.jumpScareType || 0);
                    }
                }
                
                // Update sound intensity based on distance
                const volume = Math.max(0, 1 - distanceToPlayer / monster.triggerDistance);
                this.audioManager.updateMonsterSound(monster.id, volume);
            } else {
                // If player gets too far from monster, remove it
                if (distanceToPlayer > monster.triggerDistance * 2) {
                    this.removeMonster(i);
                    continue;
                }
                
                // Random wandering
                monster.wanderTime -= delta;
                if (monster.wanderTime <= 0) {
                    monster.wanderDir.x = (Math.random() - 0.5) * 2;
                    monster.wanderDir.z = (Math.random() - 0.5) * 2;
                    monster.wanderDir.normalize();
                    monster.wanderTime = 1 + Math.random() * 2;
                }
                
                monster.position.x += monster.wanderDir.x * monster.speed * 0.5 * delta;
                monster.position.z += monster.wanderDir.z * monster.speed * 0.5 * delta;
            }
            
            // Update Y position based on terrain
            monster.position.y = world.getHeightAt(monster.position.x, monster.position.z) + monster.height / 2;
            
            // Update monster mesh position
            monster.mesh.position.copy(monster.position);
        }
    }
    
    spawnMonster(nearPosition, world) {
        const monsterType = this.monsterTypes[Math.floor(Math.random() * this.monsterTypes.length)];
        
        // Spawn monster at a distance from the player
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 10;
        const x = nearPosition.x + Math.cos(angle) * distance;
        const z = nearPosition.z + Math.sin(angle) * distance;
        const y = world.getHeightAt(x, z);
        
        // Create monster
        const monster = {
            id: Date.now().toString(),
            type: monsterType.name,
            position: new THREE.Vector3(x, y, z),
            speed: monsterType.speed,
            damage: monsterType.damage,
            triggerDistance: monsterType.triggerDistance,
            attackDistance: monsterType.attackDistance,
            fleeFromLight: monsterType.fleeFromLight,
            canTeleport: monsterType.canTeleport || false,
            height: 2,
            wanderDir: new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2).normalize(),
            wanderTime: 1 + Math.random() * 2,
            jumpScareType: Math.floor(Math.random() * 5)
        };
        
        // Create monster mesh
        const geometry = new THREE.ConeGeometry(0.5, monster.height, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        monster.mesh = new THREE.Mesh(geometry, material);
        monster.mesh.position.copy(monster.position);
        
        world.scene.add(monster.mesh);
        this.monsters.push(monster);
        
        // Play monster spawn sound
        this.audioManager.playMonsterSound(monster.id, monster.type);
        
        // Increase spawn chance during full moonlight (phase 4)
        const moonlightLevel = window.game?.moonCycle?.getCurrentMoonlightLevel() || 0;
        if (moonlightLevel > 0.4) {
            // Spawn an additional monster during bright moonlight
            if (Math.random() < 0.3) {
                setTimeout(() => {
                    this.spawnMonster(nearPosition, world);
                }, 5000);
            }
        }
    }
    
    removeMonster(index) {
        const monster = this.monsters[index];
        this.audioManager.stopMonsterSound(monster.id);
        monster.mesh.geometry.dispose();
        monster.mesh.material.dispose();
        monster.mesh.parent.remove(monster.mesh);
        this.monsters.splice(index, 1);
    }
    
    async triggerJumpScare(type) {
        if (this.activeJumpScare) return;
        this.activeJumpScare = true;
        
        // Get a random prompt or use LLM to generate one
        let jumpScareText;
        
        if (Math.random() < 0.3) {
            // Use LLM to generate a custom jumpscare message
            try {
                const completion = await websim.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are generating a short, terrifying jumpscare message for a horror game. The message should be brief (max 10 words), deeply unsettling, and personally threatening to the player. Make it feel like the horror knows the player personally. Do not include any explanations, just output the message in capital letters."
                        }
                    ],
                });
                jumpScareText = completion.content.trim();
            } catch (error) {
                // Fallback to predefined prompts if LLM fails
                jumpScareText = this.jumpScarePrompts[Math.floor(Math.random() * this.jumpScarePrompts.length)];
            }
        } else {
            // Use predefined prompts
            jumpScareText = this.jumpScarePrompts[Math.floor(Math.random() * this.jumpScarePrompts.length)];
        }
        
        // Create jumpscare visual element
        const jumpscareElement = document.createElement('div');
        jumpscareElement.className = 'jumpscare';
        
        const textElement = document.createElement('div');
        textElement.className = 'jumpscare-text';
        textElement.textContent = jumpScareText.toUpperCase();
        
        jumpscareElement.appendChild(textElement);
        document.body.appendChild(jumpscareElement);
        
        // Play jumpscare sound with TTS
        try {
            const result = await websim.textToSpeech({
                text: jumpScareText,
                voice: Math.random() < 0.5 ? "en-male" : "en-female"
            });
            
            const audio = new Audio(result.url);
            audio.volume = 0.8;
            audio.play();
        } catch (error) {
            // Fallback sound if TTS fails
            this.audioManager.playSound('jumpscare');
        }
        
        // Remove jumpscare after a short time
        setTimeout(() => {
            document.body.removeChild(jumpscareElement);
            this.activeJumpScare = false;
        }, 2000);
        
        return jumpScareText;
    }
    
    triggerRandomJumpScare(player) {
        if (player.sanity < 70) {
            this.triggerJumpScare(Math.floor(Math.random() * 5));
            player.takeDamage(5); // Jumpscares reduce sanity
        }
    }
    
    getRandomJumpScareTime() {
        return this.jumpScareTimeoutMin + Math.random() * (this.jumpScareTimeoutMax - this.jumpScareTimeoutMin);
    }
}