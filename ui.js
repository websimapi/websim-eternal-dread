export class UI {
    constructor() {
        this.inventoryVisible = false;
        this.setupInventoryUI();
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

