export class UI {
    constructor() {
        this.inventoryVisible = false;
        this.setupInventoryUI();
        this.setupMoonPhaseUI();
    }
    
    setupInventoryUI() {
        this.inventoryContainer = document.createElement('div');
        this.inventoryContainer.id = 'inventory-container';
        this.inventoryContainer.className = 'hidden';
        this.inventoryContainer.style.position = 'absolute';
        this.inventoryContainer.style.top = '50%';
        this.inventoryContainer.style.left = '50%';
        this.inventoryContainer.style.transform = 'translate(-50%, -50%)';
        this.inventoryContainer.style.width = '80%';
        this.inventoryContainer.style.maxWidth = '800px';
        this.inventoryContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.inventoryContainer.style.border = '2px solid #ff5555';
        this.inventoryContainer.style.padding = '20px';
        this.inventoryContainer.style.zIndex = '20';
        
        // Create inventory header
        const header = document.createElement('h2');
        header.textContent = 'INVENTORY';
        header.style.color = '#ff5555';
        header.style.marginBottom = '20px';
        this.inventoryContainer.appendChild(header);
        
        // Create grid for items
        this.itemGrid = document.createElement('div');
        this.itemGrid.style.display = 'grid';
        this.itemGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
        this.itemGrid.style.gap = '10px';
        this.inventoryContainer.appendChild(this.itemGrid);
        
        // Create crafting section
        const craftingHeader = document.createElement('h3');
        craftingHeader.textContent = 'CRAFTING';
        craftingHeader.style.color = '#ff5555';
        craftingHeader.style.margin = '20px 0';
        this.inventoryContainer.appendChild(craftingHeader);
        
        this.craftingGrid = document.createElement('div');
        this.craftingGrid.style.display = 'grid';
        this.craftingGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        this.craftingGrid.style.gap = '10px';
        this.inventoryContainer.appendChild(this.craftingGrid);
        
        document.body.appendChild(this.inventoryContainer);
        
        // Create the inventory bar slots
        const inventoryBar = document.getElementById('inventory-bar');
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slot = i;
            inventoryBar.appendChild(slot);
        }
    }
    
    setupMoonPhaseUI() {
        this.moonPhaseIndicator = document.createElement('div');
        this.moonPhaseIndicator.id = 'moon-phase';
        this.moonPhaseIndicator.style.position = 'absolute';
        this.moonPhaseIndicator.style.top = '20px';
        this.moonPhaseIndicator.style.right = '20px';
        this.moonPhaseIndicator.style.width = '40px';
        this.moonPhaseIndicator.style.height = '40px';
        this.moonPhaseIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.moonPhaseIndicator.style.borderRadius = '50%';
        this.moonPhaseIndicator.style.overflow = 'hidden';
        this.moonPhaseIndicator.style.boxShadow = '0 0 10px rgba(150, 150, 255, 0.5)';
        
        // Add inner moon shape
        this.moonShape = document.createElement('div');
        this.moonShape.style.width = '100%';
        this.moonShape.style.height = '100%';
        this.moonShape.style.backgroundColor = '#ccccff';
        this.moonShape.style.borderRadius = '50%';
        this.moonShape.style.transform = 'scale(0.8)';
        this.moonPhaseIndicator.appendChild(this.moonShape);
        
        document.getElementById('game-container').appendChild(this.moonPhaseIndicator);
    }

    updateSanityBar(value) {
        const sanityBar = document.getElementById('sanity-bar');
        sanityBar.style.width = `${value}%`;
        
        // Change color based on sanity level
        if (value > 60) {
            sanityBar.style.backgroundColor = '#ff5555';
        } else if (value > 30) {
            sanityBar.style.backgroundColor = '#ff3333';
        } else {
            sanityBar.style.backgroundColor = '#ff0000';
        }
    }
    
    updateMoonPhase(phase, totalPhases) {
        // Update the visual representation of the moon phase
        const scaleFactor = 0.8; // Maximum size of the moon
        
        // Full moon at phase 4
        if (phase === 4) {
            this.moonShape.style.transform = `scale(${scaleFactor})`;
            this.moonShape.style.boxShadow = '0 0 10px rgba(200, 200, 255, 0.8)';
            this.moonPhaseIndicator.style.opacity = '1';
        } 
        // New moon (very dark)
        else if (phase === 0 || phase === totalPhases - 1) {
            this.moonShape.style.transform = `scale(0.1)`;
            this.moonPhaseIndicator.style.opacity = '0.3';
        }
        // Waxing phases (1-3)
        else if (phase < 4) {
            const size = 0.2 + (phase * 0.15);
            // Right half of the moon grows
            this.moonShape.style.transform = `scale(${size})`;
            this.moonShape.style.borderRadius = '50%';
            this.moonPhaseIndicator.style.opacity = `${0.4 + (phase * 0.15)}`;
        }
        // Waning phases (5-7)
        else {
            const size = 0.8 - ((phase - 4) * 0.15);
            this.moonShape.style.transform = `scale(${size})`;
            this.moonShape.style.borderRadius = '50%';
            this.moonPhaseIndicator.style.opacity = `${0.85 - ((phase - 4) * 0.15)}`;
        }
    }

    showInteractionPrompt(text) {
        const prompt = document.getElementById('interaction-prompt');
        prompt.textContent = text;
        prompt.style.display = 'block';
    }
    
    hideInteractionPrompt() {
        const prompt = document.getElementById('interaction-prompt');
        prompt.style.display = 'none';
    }
    
    showJumpScare(text) {
        const jumpscare = document.createElement('div');
        jumpscare.className = 'jumpscare';
        
        const textElement = document.createElement('div');
        textElement.className = 'jumpscare-text';
        textElement.textContent = text;
        
        jumpscare.appendChild(textElement);
        document.body.appendChild(jumpscare);
        
        // Remove jumpscare after a short time
        setTimeout(() => {
            document.body.removeChild(jumpscare);
        }, 2000);
    }
    
    updateInventorySlot(slotIndex, item) {
        const slots = document.querySelectorAll('.inventory-slot');
        const slot = slots[slotIndex];
        
        if (!slot) return;
        
        // Clear existing content
        slot.innerHTML = '';
        
        if (item) {
            // Create item representation
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.style.width = '100%';
            itemElement.style.height = '100%';
            itemElement.style.display = 'flex';
            itemElement.style.justifyContent = 'center';
            itemElement.style.alignItems = 'center';
            itemElement.style.backgroundColor = item.color || '#666';
            itemElement.textContent = item.icon || '?';
            
            // Add tooltip
            itemElement.title = item.name;
            
            slot.appendChild(itemElement);
        }
    }
    
    toggleInventory() {
        this.inventoryVisible = !this.inventoryVisible;
        
        if (this.inventoryVisible) {
            this.inventoryContainer.classList.remove('hidden');
        } else {
            this.inventoryContainer.classList.add('hidden');
        }
    }
}