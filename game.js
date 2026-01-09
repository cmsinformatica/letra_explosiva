/* ==========================================
   LETRA EXPLOSIVA - Game Engine
   Mobile-First Game with Touch Support
   ========================================== */

class LetraExplosiva {
    constructor() {
        // Game State
        this.state = {
            isRunning: false,
            isPaused: false,
            score: 0,
            lives: 3,
            combo: 1,
            maxCombo: 1,
            level: 1,
            letters: [],
            powerUps: [],
            highScore: parseInt(localStorage.getItem('letraExplosiva_highScore')) || 0,
            currentSpeed: 5000,
            spawnRate: 1500,
            powerUpChance: 0.05
        };

        // Intervals
        this.spawnInterval = null;
        this.difficultyInterval = null;
        this.powerUpInterval = null;

        // Constants
        this.LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.COLORS = ['#00ffaa', '#ff6b9d', '#ffaa00', '#66ccff', '#cc66ff', '#ff88aa'];
        this.POWER_UP_TYPES = [
            { type: 'life', emoji: '❤️', effect: () => this.addLife() },
            { type: 'slow', emoji: '⏱️', effect: () => this.slowMotion() },
            { type: 'bomb', emoji: '💣', effect: () => this.clearAllLetters() }
        ];

        // Audio Context for sound effects
        this.audioContext = null;

        // DOM Elements
        this.elements = {};

        // Bind methods
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    // ==========================================
    // Initialization
    // ==========================================
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.createVirtualKeyboard();
        this.updateHighScoreDisplay();
        this.updateGameAreaHeight();

        // Initialize audio on first interaction
        document.addEventListener('click', () => this.initAudio(), { once: true });
        document.addEventListener('touchstart', () => this.initAudio(), { once: true });
    }

    cacheElements() {
        this.elements = {
            app: document.getElementById('app'),
            startScreen: document.getElementById('startScreen'),
            gameScreen: document.getElementById('gameScreen'),
            pauseScreen: document.getElementById('pauseScreen'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            gameArea: document.getElementById('gameArea'),
            score: document.getElementById('score'),
            combo: document.getElementById('combo'),
            lives: document.getElementById('lives'),
            level: document.getElementById('level'),
            finalScore: document.getElementById('finalScore'),
            maxComboDisplay: document.getElementById('maxCombo'),
            highScoreDisplay: document.getElementById('highScore'),
            highScoreStart: document.getElementById('highScoreStart'),
            levelReached: document.getElementById('levelReached'),
            keyboard: document.getElementById('virtualKeyboard')
        };
    }

    setupEventListeners() {
        // Keyboard
        document.addEventListener('keydown', this.handleKeydown);

        // Visibility change (pause when tab hidden)
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Window resize
        window.addEventListener('resize', () => this.updateGameAreaHeight());

        // Prevent context menu on long press
        document.addEventListener('contextmenu', e => e.preventDefault());
    }

    createVirtualKeyboard() {
        const keyboard = this.elements.keyboard;
        if (!keyboard) return;

        const rows = [
            'QWERTYUIOP',
            'ASDFGHJKL',
            'ZXCVBNM'
        ];

        keyboard.innerHTML = rows.map(row => `
            <div class="keyboard-row">
                ${row.split('').map(letter => `
                    <button class="key" data-letter="${letter}">${letter}</button>
                `).join('')}
            </div>
        `).join('');

        // Touch events for virtual keyboard
        keyboard.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('key')) {
                e.preventDefault();
                const letter = e.target.dataset.letter;
                e.target.classList.add('pressed');
                this.hitLetter(letter);
            }
        }, { passive: false });

        keyboard.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('key')) {
                e.target.classList.remove('pressed');
            }
        });

        // Mouse events for testing on desktop
        keyboard.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('key')) {
                const letter = e.target.dataset.letter;
                e.target.classList.add('pressed');
                this.hitLetter(letter);
            }
        });

        keyboard.addEventListener('mouseup', (e) => {
            if (e.target.classList.contains('key')) {
                e.target.classList.remove('pressed');
            }
        });
    }

    updateGameAreaHeight() {
        const gameArea = this.elements.gameArea;
        if (gameArea) {
            const height = gameArea.offsetHeight;
            document.documentElement.style.setProperty('--game-height', `${height}px`);
        }
    }

    // ==========================================
    // Audio System
    // ==========================================
    initAudio() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playSound(type) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        switch (type) {
            case 'hit':
                oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1760, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.15);
                break;

            case 'miss':
                oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                break;

            case 'powerup':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.4);
                break;

            case 'levelup':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(554, this.audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.2);
                oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.5);
                break;

            case 'gameover':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(55, this.audioContext.currentTime + 0.8);
                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 1);
                break;
        }
    }

    // ==========================================
    // Event Handlers
    // ==========================================
    handleKeydown(e) {
        // Pause toggle
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
            if (this.state.isRunning || this.state.isPaused) {
                this.togglePause();
                return;
            }
        }

        // Space to start/restart
        if (e.key === ' ') {
            if (!this.state.isRunning && !this.state.isPaused) {
                if (!this.elements.startScreen.classList.contains('hidden')) {
                    this.startGame();
                } else if (!this.elements.gameOverScreen.classList.contains('hidden')) {
                    this.restartGame();
                }
            }
            return;
        }

        if (!this.state.isRunning || this.state.isPaused) return;

        const key = e.key.toUpperCase();
        if (this.LETTERS.includes(key)) {
            this.hitLetter(key);
            this.highlightKey(key);
        }
    }

    handleVisibilityChange() {
        if (document.hidden && this.state.isRunning && !this.state.isPaused) {
            this.togglePause();
        }
    }

    highlightKey(letter) {
        const key = this.elements.keyboard?.querySelector(`[data-letter="${letter}"]`);
        if (key) {
            key.classList.add('highlight');
            setTimeout(() => key.classList.remove('highlight'), 200);
        }
    }

    // ==========================================
    // Game Flow
    // ==========================================
    startGame() {
        this.showScreen('gameScreen');

        this.state = {
            ...this.state,
            isRunning: true,
            isPaused: false,
            score: 0,
            lives: 3,
            combo: 1,
            maxCombo: 1,
            level: 1,
            letters: [],
            powerUps: [],
            currentSpeed: 5000,
            spawnRate: 1500
        };

        this.updateUI();
        this.updateGameAreaHeight();
        this.startSpawning();
        this.startDifficultyIncrease();
        this.startPowerUpSpawning();
    }

    restartGame() {
        this.elements.gameArea.innerHTML = '';
        this.startGame();
    }

    togglePause() {
        if (this.state.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    pauseGame() {
        if (!this.state.isRunning) return;

        this.state.isPaused = true;
        this.state.isRunning = false;
        this.clearIntervals();
        this.showScreen('pauseScreen');
    }

    resumeGame() {
        if (!this.state.isPaused) return;

        this.state.isPaused = false;
        this.state.isRunning = true;
        this.showScreen('gameScreen');
        this.startSpawning();
        this.startDifficultyIncrease();
        this.startPowerUpSpawning();
    }

    endGame() {
        this.state.isRunning = false;
        this.clearIntervals();
        this.playSound('gameover');

        // Clear remaining letters
        this.state.letters.forEach(l => l.element.remove());
        this.state.letters = [];
        this.state.powerUps.forEach(p => p.element.remove());
        this.state.powerUps = [];

        // Check high score
        const isNewRecord = this.state.score > this.state.highScore;
        if (isNewRecord) {
            this.state.highScore = this.state.score;
            localStorage.setItem('letraExplosiva_highScore', this.state.highScore);
        }

        // Update game over screen
        this.elements.finalScore.textContent = this.state.score;
        this.elements.maxComboDisplay.textContent = `x${this.state.maxCombo}`;
        this.elements.levelReached.textContent = this.state.level;
        this.elements.highScoreDisplay.textContent = this.state.highScore;

        if (isNewRecord) {
            this.elements.finalScore.classList.add('new-record');
        } else {
            this.elements.finalScore.classList.remove('new-record');
        }

        this.showScreen('gameOverScreen');
        this.updateHighScoreDisplay();
    }

    clearIntervals() {
        clearInterval(this.spawnInterval);
        clearInterval(this.difficultyInterval);
        clearInterval(this.powerUpInterval);
    }

    // ==========================================
    // Spawning
    // ==========================================
    startSpawning() {
        this.spawnLetter();
        this.spawnInterval = setInterval(() => {
            if (this.state.isRunning) {
                this.spawnLetter();
            }
        }, this.state.spawnRate);
    }

    startDifficultyIncrease() {
        this.difficultyInterval = setInterval(() => {
            if (this.state.isRunning) {
                // Increase level
                this.state.level++;
                this.playSound('levelup');

                // Update difficulty
                this.state.currentSpeed = Math.max(1500, this.state.currentSpeed - 200);
                this.state.spawnRate = Math.max(500, this.state.spawnRate - 100);
                this.state.powerUpChance = Math.min(0.15, this.state.powerUpChance + 0.01);

                // Restart spawn interval with new rate
                clearInterval(this.spawnInterval);
                this.spawnInterval = setInterval(() => {
                    if (this.state.isRunning) {
                        this.spawnLetter();
                    }
                }, this.state.spawnRate);

                this.updateUI();
            }
        }, 15000);
    }

    startPowerUpSpawning() {
        this.powerUpInterval = setInterval(() => {
            if (this.state.isRunning && Math.random() < this.state.powerUpChance) {
                this.spawnPowerUp();
            }
        }, 3000);
    }

    spawnLetter() {
        const gameArea = this.elements.gameArea;
        const letter = this.LETTERS[Math.floor(Math.random() * this.LETTERS.length)];
        const color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];

        const letterEl = document.createElement('div');
        letterEl.className = 'falling-letter font-game no-select';
        letterEl.textContent = letter;
        letterEl.style.color = color;

        // Random horizontal position (avoid edges)
        const maxX = gameArea.offsetWidth - 60;
        letterEl.style.left = `${Math.random() * maxX + 10}px`;
        letterEl.style.animationDuration = `${this.state.currentSpeed}ms`;

        const id = Date.now() + Math.random();
        letterEl.dataset.id = id;
        letterEl.dataset.letter = letter;

        this.state.letters.push({ id, letter, element: letterEl });
        gameArea.appendChild(letterEl);

        letterEl.addEventListener('animationend', () => {
            if (this.state.letters.find(l => l.id === id)) {
                this.missLetter(id);
            }
        });
    }

    spawnPowerUp() {
        const gameArea = this.elements.gameArea;
        const powerUpType = this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)];

        const powerUpEl = document.createElement('div');
        powerUpEl.className = 'power-up no-select';
        powerUpEl.textContent = powerUpType.emoji;

        const maxX = gameArea.offsetWidth - 50;
        powerUpEl.style.left = `${Math.random() * maxX + 10}px`;
        powerUpEl.style.animationDuration = `${this.state.currentSpeed * 1.5}ms`;

        const id = Date.now() + Math.random();
        powerUpEl.dataset.id = id;

        this.state.powerUps.push({ id, type: powerUpType, element: powerUpEl });
        gameArea.appendChild(powerUpEl);

        // Click/touch to collect
        const collect = (e) => {
            e.preventDefault();
            this.collectPowerUp(id);
        };

        powerUpEl.addEventListener('click', collect);
        powerUpEl.addEventListener('touchstart', collect, { passive: false });

        powerUpEl.addEventListener('animationend', () => {
            const index = this.state.powerUps.findIndex(p => p.id === id);
            if (index !== -1) {
                this.state.powerUps[index].element.remove();
                this.state.powerUps.splice(index, 1);
            }
        });
    }

    // ==========================================
    // Game Actions
    // ==========================================
    hitLetter(letter) {
        const letterIndex = this.state.letters.findIndex(l => l.letter === letter);
        if (letterIndex === -1) return;

        const letterData = this.state.letters[letterIndex];
        const rect = letterData.element.getBoundingClientRect();
        const gameRect = this.elements.gameArea.getBoundingClientRect();

        const x = rect.left - gameRect.left + rect.width / 2;
        const y = rect.top - gameRect.top + rect.height / 2;
        const color = letterData.element.style.color;

        // Remove from array first
        this.state.letters.splice(letterIndex, 1);

        // Explode animation
        letterData.element.classList.add('exploding');

        // Effects
        this.playSound('hit');
        this.createParticles(x, y, color);

        // Calculate score with combo bonus
        const points = 10 * this.state.combo;
        this.state.score += points;
        this.state.combo++;
        this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);

        this.showScorePopup(x, y, points);

        // Remove element after animation
        setTimeout(() => letterData.element.remove(), 400);

        this.updateUI();
    }

    missLetter(id) {
        const letterIndex = this.state.letters.findIndex(l => l.id === id);
        if (letterIndex === -1) return;

        const letterData = this.state.letters[letterIndex];
        letterData.element.remove();
        this.state.letters.splice(letterIndex, 1);

        this.state.lives--;
        this.state.combo = 1;

        this.playSound('miss');
        this.elements.app.classList.add('shake');
        setTimeout(() => this.elements.app.classList.remove('shake'), 500);

        this.updateUI();

        if (this.state.lives <= 0) {
            this.endGame();
        }
    }

    collectPowerUp(id) {
        const powerUpIndex = this.state.powerUps.findIndex(p => p.id === id);
        if (powerUpIndex === -1) return;

        const powerUpData = this.state.powerUps[powerUpIndex];
        const rect = powerUpData.element.getBoundingClientRect();
        const gameRect = this.elements.gameArea.getBoundingClientRect();

        const x = rect.left - gameRect.left + rect.width / 2;
        const y = rect.top - gameRect.top + rect.height / 2;

        // Remove
        powerUpData.element.remove();
        this.state.powerUps.splice(powerUpIndex, 1);

        // Apply effect
        this.playSound('powerup');
        powerUpData.type.effect();

        // Visual feedback
        this.showScorePopup(x, y, powerUpData.type.emoji);
    }

    // ==========================================
    // Power-up Effects
    // ==========================================
    addLife() {
        this.state.lives = Math.min(5, this.state.lives + 1);
        this.updateUI();
    }

    slowMotion() {
        const originalSpeed = this.state.currentSpeed;
        this.state.currentSpeed = this.state.currentSpeed * 2;

        // Apply to existing letters
        this.state.letters.forEach(l => {
            l.element.style.animationDuration = `${this.state.currentSpeed}ms`;
        });

        setTimeout(() => {
            this.state.currentSpeed = originalSpeed;
        }, 5000);
    }

    clearAllLetters() {
        const gameArea = this.elements.gameArea;

        this.state.letters.forEach(letterData => {
            const rect = letterData.element.getBoundingClientRect();
            const gameRect = gameArea.getBoundingClientRect();
            const x = rect.left - gameRect.left + rect.width / 2;
            const y = rect.top - gameRect.top + rect.height / 2;

            this.createParticles(x, y, letterData.element.style.color);
            letterData.element.classList.add('exploding');

            setTimeout(() => letterData.element.remove(), 400);
        });

        // Bonus points
        const bonus = this.state.letters.length * 5;
        this.state.score += bonus;

        this.state.letters = [];
        this.updateUI();
    }

    // ==========================================
    // Visual Effects
    // ==========================================
    createParticles(x, y, color) {
        const gameArea = this.elements.gameArea;
        const particleCount = 12;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.backgroundColor = color;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.boxShadow = `0 0 10px ${color}`;

            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 30 + Math.random() * 40;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;

            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);

            gameArea.appendChild(particle);
            setTimeout(() => particle.remove(), 600);
        }
    }

    showScorePopup(x, y, content) {
        const popup = document.createElement('div');
        popup.className = 'score-popup font-game';
        popup.textContent = typeof content === 'number' ? `+${content}` : content;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;

        this.elements.gameArea.appendChild(popup);
        setTimeout(() => popup.remove(), 800);
    }

    // ==========================================
    // UI Updates
    // ==========================================
    updateUI() {
        this.elements.score.textContent = this.state.score;
        this.elements.combo.textContent = `x${this.state.combo}`;
        this.elements.level.textContent = this.state.level;

        // Hearts for lives
        let hearts = '';
        for (let i = 0; i < this.state.lives; i++) {
            hearts += '❤️';
        }
        this.elements.lives.textContent = hearts || '💔';
    }

    updateHighScoreDisplay() {
        if (this.elements.highScoreStart) {
            if (this.state.highScore > 0) {
                this.elements.highScoreStart.textContent = this.state.highScore;
                this.elements.highScoreStart.parentElement.style.display = 'block';
            } else {
                this.elements.highScoreStart.parentElement.style.display = 'none';
            }
        }
    }

    showScreen(screenId) {
        ['startScreen', 'gameScreen', 'pauseScreen', 'gameOverScreen'].forEach(id => {
            const el = this.elements[id];
            if (el) {
                if (id === screenId) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            }
        });
    }
}

// ==========================================
// Initialize Game
// ==========================================
let game;

function startGame() {
    game.startGame();
}

function restartGame() {
    game.restartGame();
}

function resumeGame() {
    game.resumeGame();
}

document.addEventListener('DOMContentLoaded', () => {
    game = new LetraExplosiva();
    game.init();
});
