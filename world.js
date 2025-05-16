import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class World {
    constructor(scene, player, aiManager, audioManager) {
        this.scene = scene;
        this.player = player;
        this.aiManager = aiManager;
        this.audioManager = audioManager;
        
        this.chunks = new Map();
        this.chunkSize = 10;
        this.renderDistance = 3;
        this.entities = [];
        this.interactables = [];
        this.collidables = [];
        
        this.noise2D = createNoise2D();
    }

    async initialize() {
        // Load textures
        this.textures = {
            ground: new THREE.TextureLoader().load('ground_texture.png'),
            wall: new THREE.TextureLoader().load('wall_texture.png'),
            tree: new THREE.TextureLoader().load('tree_texture.png')
        };
        
        // Apply texture settings
        Object.values(this.textures).forEach(texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 1);
        });
        
        // Create materials with brighter colors
        this.materials = {
            ground: new THREE.MeshStandardMaterial({ 
                map: this.textures.ground,
                roughness: 0.9,
                metalness: 0.0,
                color: 0x555555  
            }),
            wall: new THREE.MeshStandardMaterial({ 
                map: this.textures.wall,
                roughness: 0.9,
                metalness: 0.0,
                color: 0x444444  
            }),
            tree: new THREE.MeshStandardMaterial({
                map: this.textures.tree,
                roughness: 0.9,
                metalness: 0.0,
                color: 0x444444,  
                side: THREE.DoubleSide,
                alphaTest: 0.5
            })
        };
        
        // Generate initial chunks around player
        this.updateChunks();
        
        // Create environment props
        await this.createEnvironmentProps();
    }
    
    reset() {
        // Clear all chunks
        this.chunks.forEach(chunk => {
            chunk.dispose();
        });
        this.chunks.clear();
        
        // Remove all entities
        this.entities.forEach(entity => {
            this.scene.remove(entity.mesh);
        });
        this.entities = [];
        
        // Remove all interactables
        this.interactables = [];
        
        // Clear collidables
        this.collidables = [];
        
        // Regenerate chunks
        this.updateChunks();
    }

    getChunkKeyFromPosition(x, z) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        return `${chunkX},${chunkZ}`;
    }
    
    getChunkByPosition(x, z) {
        const key = this.getChunkKeyFromPosition(x, z);
        return this.chunks.get(key);
    }
    
    updateChunks() {
        const playerChunkX = Math.floor(this.player.position.x / this.chunkSize);
        const playerChunkZ = Math.floor(this.player.position.z / this.chunkSize);
        
        // Add new chunks that are in range
        for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
            for (let z = playerChunkZ - this.renderDistance; z <= playerChunkZ + this.renderDistance; z++) {
                const key = `${x},${z}`;
                if (!this.chunks.has(key)) {
                    const chunk = new Chunk(this, x, z);
                    this.chunks.set(key, chunk);
                }
            }
        }
        
        // Remove chunks that are out of range
        this.chunks.forEach((chunk, key) => {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - playerChunkX) > this.renderDistance || 
                Math.abs(z - playerChunkZ) > this.renderDistance) {
                chunk.dispose();
                this.chunks.delete(key);
            }
        });
    }
    
    async createEnvironmentProps() {
        // Create different types of props (trees, rocks, etc.)
        const treeGeometry = new THREE.PlaneGeometry(2, 4);
        
        // Create hideout spots
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 100;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            this.createHideout(x, z);
        }
        
        // Create horror elements that can trigger jump scares
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 15 + Math.random() * 120;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            this.createHorrorElement(x, z);
        }
    }
    
    createHideout(x, z) {
        // Create a small shelter where the player can hide
        const y = this.getHeightAt(x, z);
        
        const width = 3 + Math.random() * 2;
        const depth = 3 + Math.random() * 2;
        const height = 2.5;
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = this.materials.wall;
        
        const hideout = new THREE.Mesh(geometry, material);
        hideout.position.set(x, y + height/2, z);
        hideout.castShadow = true;
        hideout.receiveShadow = true;
        this.scene.add(hideout);
        
        // Create a hole (entrance)
        const entranceWidth = 1.2;
        const entranceHeight = 1.8;
        const entranceGeometry = new THREE.BoxGeometry(entranceWidth, entranceHeight, depth + 0.5);
        const entrancePosition = new THREE.Vector3(x, y + entranceHeight/2, z + depth/2);
        
        // Create a Boolean CSG operation to cut the entrance
        const entranceMesh = new THREE.Mesh(entranceGeometry);
        entranceMesh.position.copy(entrancePosition);
        
        // Create an interactable for the hideout
        this.interactables.push({
            type: 'hideout',
            position: new THREE.Vector3(x, y, z),
            size: new THREE.Vector3(width, height, depth),
            isPlayerInside: (playerPos) => {
                return Math.abs(playerPos.x - x) < width/2 &&
                       Math.abs(playerPos.z - z) < depth/2 &&
                       playerPos.y > y && playerPos.y < y + height;
            }
        });
    }
    
    createHorrorElement(x, z) {
        const y = this.getHeightAt(x, z);
        
        // Random horror element (statue, altar, etc.)
        const type = Math.floor(Math.random() * 3);
        let mesh;
        
        if (type === 0) {
            // Creepy statue
            const geometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
            const material = new THREE.MeshStandardMaterial({ color: 0x222222 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y + 1, z);
        } else if (type === 1) {
            // Altar
            const geometry = new THREE.BoxGeometry(1.5, 0.5, 1.5);
            const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y + 0.25, z);
        } else {
            // Strange symbol on ground
            const geometry = new THREE.CircleGeometry(1, 8);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x550000,
                side: THREE.DoubleSide
            });
            mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(x, y + 0.01, z);
        }
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        
        // Create an interactable horror element
        this.interactables.push({
            type: 'horror',
            position: new THREE.Vector3(x, y, z),
            mesh: mesh,
            triggerDistance: 3 + Math.random() * 2,
            activated: false,
            jumpScareType: Math.floor(Math.random() * 5), 
            update: (playerPos, delta) => {
                const distance = playerPos.distanceTo(new THREE.Vector3(x, y, z));
                if (!this.activated && distance < this.triggerDistance) {
                    this.aiManager.triggerJumpScare(this.jumpScareType);
                    this.activated = true;
                    setTimeout(() => {
                        this.activated = false;
                    }, 60000); 
                }
            }
        });
    }
    
    checkCollision(position, radius, checkVertical = false) {
        for (const collidable of this.collidables) {
            const horizontalDistance = new THREE.Vector2(
                position.x - collidable.position.x,
                position.z - collidable.position.z
            ).length();
            
            if (horizontalDistance < radius + collidable.radius) {
                // For vertical check, make sure we're actually above the object
                if (checkVertical) {
                    // For trees, check if we're within the trunk radius
                    if (collidable.type === 'tree') {
                        // Trees have a very small trunk radius for landing
                        const trunkRadius = collidable.radius * 0.3;
                        if (horizontalDistance > trunkRadius) {
                            continue; // Not above the trunk, so no collision
                        }
                    }
                    
                    // Check if we're at or below the top of the object
                    const objectTop = collidable.position.y + 
                        (collidable.type === 'rock' ? collidable.radius : 0);
                    
                    // Only collide if we're near the top of the object
                    if (position.y > objectTop + 0.7) {
                        continue; // Too far above the object, no collision
                    }
                }
                
                return {
                    collides: true,
                    object: collidable,
                    penetration: radius + collidable.radius - horizontalDistance
                };
            }
        }
        return { collides: false };
    }
    
    update(delta) {
        // Update chunks based on player position
        this.updateChunks();
        
        // Update interactables
        this.interactables.forEach(interactable => {
            if (interactable.update) {
                interactable.update(this.player.position, delta);
            }
        });
        
        // Update entities
        this.entities.forEach(entity => {
            entity.update(delta);
        });
        
        // Check if player is in a hideout
        const playerInHideout = this.interactables.some(
            interactable => interactable.type === 'hideout' && 
            interactable.isPlayerInside(this.player.position)
        );
        
        if (playerInHideout && this.player.isCrouching) {
            this.player.recoverSanity(delta * 5);
        }
    }
    
    getHeightAt(x, z) {
        const scale = 0.05;
        const height = this.noise2D(x * scale, z * scale) * 2;
        return height;
    }
}

class Chunk {
    constructor(world, x, z) {
        this.world = world;
        this.x = x;
        this.z = z;
        this.size = world.chunkSize;
        this.position = new THREE.Vector3(
            x * this.size,
            0,
            z * this.size
        );
        
        this.meshes = [];
        this.generate();
    }
    
    generate() {
        const groundGeometry = new THREE.PlaneGeometry(this.size, this.size, 8, 8);
        groundGeometry.rotateX(-Math.PI / 2);
        
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + this.position.x;
            const z = vertices[i + 2] + this.position.z;
            vertices[i + 1] = this.world.getHeightAt(x, z);
        }
        
        groundGeometry.computeVertexNormals();
        
        const groundMesh = new THREE.Mesh(groundGeometry, this.world.materials.ground);
        groundMesh.position.copy(this.position);
        groundMesh.receiveShadow = true;
        this.world.scene.add(groundMesh);
        this.meshes.push(groundMesh);
        
        const numFeatures = 5 + Math.floor(Math.random() * 10);
        for (let i = 0; i < numFeatures; i++) {
            const localX = Math.random() * this.size;
            const localZ = Math.random() * this.size;
            const worldX = this.position.x + localX;
            const worldZ = this.position.z + localZ;
            
            if (Math.sqrt(worldX * worldX + worldZ * worldZ) < 10) continue;
            
            const y = this.world.getHeightAt(worldX, worldZ);
            
            if (Math.random() < 0.7) { 
                this.createTree(worldX, y, worldZ);
            } else { 
                this.createRock(worldX, y, worldZ);
            }
        }
    }
    
    createTree(x, y, z) {
        const height = 4 + Math.random() * 3;
        const width = height * 0.6;
        const trunkRadius = 0.3; 
        
        const planeGeometry = new THREE.PlaneGeometry(width, height);
        
        for (let i = 0; i < 2; i++) {
            const treeMesh = new THREE.Mesh(planeGeometry, this.world.materials.tree);
            treeMesh.position.set(x, y + height/2, z);
            treeMesh.rotation.y = Math.PI / 4 + i * (Math.PI / 2);
            treeMesh.castShadow = true;
            this.world.scene.add(treeMesh);
            this.meshes.push(treeMesh);
        }
        
        this.world.collidables.push({
            position: new THREE.Vector3(x, y, z),
            radius: trunkRadius,
            height: height,
            type: 'tree'
        });
        
        if (false) { 
            const collisionGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, height, 8);
            const collisionMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
            collisionMesh.position.set(x, y + height/2, z);
            this.world.scene.add(collisionMesh);
            this.meshes.push(collisionMesh);
        }
    }
    
    createRock(x, y, z) {
        const size = 0.5 + Math.random() * 1;
        const geometry = new THREE.DodecahedronGeometry(size, 0);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x777777,
            roughness: 0.9,
            metalness: 0.0
        });
        
        const rockMesh = new THREE.Mesh(geometry, material);
        rockMesh.position.set(x, y + size * 0.5, z);
        rockMesh.rotation.set(
            Math.random() * Math.PI, 
            Math.random() * Math.PI, 
            Math.random() * Math.PI
        );
        rockMesh.castShadow = true;
        rockMesh.receiveShadow = true;
        
        this.world.scene.add(rockMesh);
        this.meshes.push(rockMesh);
        
        this.world.collidables.push({
            position: new THREE.Vector3(x, y + size * 0.5, z),
            radius: size,
            type: 'rock',
            mesh: rockMesh
        });
        
        if (false) { 
            const collisionGeometry = new THREE.SphereGeometry(size, 8, 8);
            const collisionMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            const collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
            collisionMesh.position.set(x, y + size * 0.5, z);
            this.world.scene.add(collisionMesh);
            this.meshes.push(collisionMesh);
        }
    }
    
    dispose() {
        this.meshes.forEach(mesh => {
            this.world.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        this.meshes = [];
    }
}