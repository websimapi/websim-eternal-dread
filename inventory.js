export class InventorySystem {
    constructor(ui) {
        this.ui = ui;
        this.items = [];
        this.maxItems = 20;
        this.equippedItems = new Array(5).fill(null);
        this.recipeList = this.getRecipes();
    }
    
    addItem(item) {
        if (this.items.length < this.maxItems) {
            this.items.push(item);
            
            // If we have empty quickbar slots, equip it automatically
            const emptySlot = this.equippedItems.findIndex(slot => slot === null);
            if (emptySlot !== -1) {
                this.equippedItems[emptySlot] = item;
                this.ui.updateInventorySlot(emptySlot, item);
            }
            
            return true;
        }
        return false;
    }
    
    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            const item = this.items[index];
            this.items.splice(index, 1);
            
            // If the item was equipped, unequip it
            const equippedIndex = this.equippedItems.findIndex(
                equippedItem => equippedItem && equippedItem.id === item.id
            );
            
            if (equippedIndex !== -1) {
                this.equippedItems[equippedIndex] = null;
                this.ui.updateInventorySlot(equippedIndex, null);
            }
            
            return item;
        }
        return null;
    }
    
    equipItem(inventoryIndex, slotIndex) {
        if (inventoryIndex >= 0 && inventoryIndex < this.items.length &&
            slotIndex >= 0 && slotIndex < this.equippedItems.length) {
            
            const item = this.items[inventoryIndex];
            this.equippedItems[slotIndex] = item;
            this.ui.updateInventorySlot(slotIndex, item);
            return true;
        }
        return false;
    }
    
    unequipItem(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.equippedItems.length) {
            this.equippedItems[slotIndex] = null;
            this.ui.updateInventorySlot(slotIndex, null);
            return true;
        }
        return false;
    }
    
    getRecipes() {
        return [
            {
                result: {
                    id: 'improved_flashlight',
                    name: 'Improved Flashlight',
                    description: 'A flashlight with longer battery life and brighter beam.',
                    icon: 'F+',
                    color: '#ffcc00',
                    type: 'tool',
                    durability: 100,
                    properties: {
                        lightIntensity: 1.5,
                        batteryLife: 2.0
                    }
                },
                ingredients: [
                    { id: 'flashlight', count: 1 },
                    { id: 'battery', count: 2 },
                    { id: 'tape', count: 1 }
                ]
            },
            {
                result: {
                    id: 'makeshift_weapon',
                    name: 'Makeshift Weapon',
                    description: 'A crude weapon that can keep monsters at bay.',
                    icon: 'W',
                    color: '#888888',
                    type: 'weapon',
                    durability: 50,
                    properties: {
                        damage: 10,
                        range: 2.0
                    }
                },
                ingredients: [
                    { id: 'stick', count: 1 },
                    { id: 'scrap_metal', count: 1 },
                    { id: 'tape', count: 1 }
                ]
            },
            {
                result: {
                    id: 'sanity_pill',
                    name: 'Sanity Pill',
                    description: 'A pill that restores some sanity.',
                    icon: 'S',
                    color: '#7766ee',
                    type: 'consumable',
                    properties: {
                        sanityRestore: 25
                    }
                },
                ingredients: [
                    { id: 'herbs', count: 2 },
                    { id: 'chemical', count: 1 }
                ]
            }
        ];
    }
    
    canCraft(recipeIndex) {
        if (recipeIndex >= 0 && recipeIndex < this.recipeList.length) {
            const recipe = this.recipeList[recipeIndex];
            
            // Check if we have all required ingredients
            return recipe.ingredients.every(ingredient => {
                const count = this.items.filter(item => item.id === ingredient.id).length;
                return count >= ingredient.count;
            });
        }
        return false;
    }
    
    craft(recipeIndex) {
        if (!this.canCraft(recipeIndex)) {
            return false;
        }
        
        const recipe = this.recipeList[recipeIndex];
        
        // Remove ingredients
        recipe.ingredients.forEach(ingredient => {
            for (let i = 0; i < ingredient.count; i++) {
                const index = this.items.findIndex(item => item.id === ingredient.id);
                if (index !== -1) {
                    this.removeItem(index);
                }
            }
        });
        
        // Add crafted item
        this.addItem(recipe.result);
        return true;
    }
    
    toggleInventory() {
        this.ui.toggleInventory();
    }
}

