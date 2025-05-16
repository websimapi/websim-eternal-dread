export class AudioManager {
    constructor() {
        this.sounds = {};
        this.monsterSounds = {};
    }
    
    async initialize() {
        // Load sounds
        this.sounds = {
            ambient: await this.createLoopingSound('ambient.mp3', 0.3),
            footstep: await this.createSound('footstep.mp3', 0.5),
            jumpscare: await this.createSound('jumpscare.mp3', 0.8),
            flashlight_on: await this.createSound('flashlight_on.mp3', 0.5),
            flashlight_off: await this.createSound('flashlight_off.mp3', 0.5),
            flashlight_fail: await this.createSound('flashlight_fail.mp3', 0.5),
            player_hurt: await this.createSound('player_hurt.mp3', 0.6),
            player_death: await this.createSound('player_death.mp3', 0.7),
            pickup: await this.createSound('pickup.mp3', 0.5),
            monster_stalk: await this.createLoopingSound('monster_stalk.mp3', 0),
            monster_attack: await this.createSound('monster_attack.mp3', 0.7),
            jump: await this.createSound('jump.mp3', 0.4)
        };
    }
    
    async createSound(url, volume = 1.0) {
        return {
            url: url,
            volume: volume,
            play: (options = {}) => {
                const audio = new Audio(url);
                audio.volume = options.volume !== undefined ? options.volume : volume;
                audio.play();
                return audio;
            }
        };
    }
    
    async createLoopingSound(url, volume = 1.0) {
        const sound = await this.createSound(url, volume);
        sound.loop = true;
        sound.play = (options = {}) => {
            const audio = new Audio(url);
            audio.volume = options.volume !== undefined ? options.volume : volume;
            audio.loop = true;
            audio.play();
            return audio;
        };
        return sound;
    }
    
    playSound(name, options = {}) {
        if (this.sounds[name]) {
            return this.sounds[name].play(options);
        }
        console.warn(`Sound "${name}" not found.`);
        return null;
    }
    
    playMonsterSound(monsterId, monsterType) {
        // Create a looping sound for the monster's presence
        if (!this.monsterSounds[monsterId]) {
            const audio = this.sounds.monster_stalk.play({ volume: 0 });
            this.monsterSounds[monsterId] = {
                audio: audio,
                volume: 0
            };
        }
    }
    
    updateMonsterSound(monsterId, volume) {
        if (this.monsterSounds[monsterId]) {
            this.monsterSounds[monsterId].audio.volume = volume;
            this.monsterSounds[monsterId].volume = volume;
        }
    }
    
    stopMonsterSound(monsterId) {
        if (this.monsterSounds[monsterId]) {
            this.monsterSounds[monsterId].audio.pause();
            delete this.monsterSounds[monsterId];
        }
    }
}

