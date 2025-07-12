class WhackAMoleGame {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.isPlaying = false;
        this.moleTimer = null;
        this.gameTimer = null;
        this.activeMoles = new Set();
        this.maxLevel = 3;
        this.pointsPerLevel = 50;
        
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.timeElement = document.getElementById('time');
        this.startBtn = document.getElementById('start-btn');
        this.gameOverElement = document.getElementById('game-over');
        this.levelUpElement = document.getElementById('level-up');
        this.victoryElement = document.getElementById('victory');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalLevelElement = document.getElementById('final-level');
        this.victoryScoreElement = document.getElementById('victory-score');
        this.nextLevelElement = document.getElementById('next-level');
        this.restartBtn = document.getElementById('restart-btn');
        this.continueBtn = document.getElementById('continue-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.holes = document.querySelectorAll('.hole');
        this.moles = document.querySelectorAll('.mole');
        
        this.initCustomCursor();
        this.init();
    }
    
    initCustomCursor() {
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        cursor.innerHTML = `
            <div class="hammer-head"></div>
            <div class="hammer-handle"></div>
        `;
        document.body.appendChild(cursor);
        
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        
        document.addEventListener('mousedown', () => {
            cursor.style.transform = 'translate(-10px, -26px) rotate(15deg) scale(0.9)';
        });
        
        document.addEventListener('mouseup', () => {
            cursor.style.transform = 'translate(-10px, -26px) rotate(0deg) scale(1)';
        });
    }
    
    init() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.continueBtn.addEventListener('click', () => this.nextLevel());
        this.playAgainBtn.addEventListener('click', () => this.restartGame());
        
        this.moles.forEach((mole, index) => {
            mole.addEventListener('click', () => this.hitMole(index));
        });
    }
    
    startGame() {
        this.isPlaying = true;
        this.score = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.activeMoles.clear();
        
        this.updateDisplay();
        this.startBtn.style.display = 'none';
        this.gameOverElement.classList.remove('show');
        this.levelUpElement.classList.remove('show');
        this.victoryElement.classList.remove('show');
        
        this.hideAllMoles();
        
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
        
        this.spawnMoles();
    }
    
    spawnMoles() {
        if (!this.isPlaying) return;
        
        // 隨機全部出現的機率 (第2級以上10%機率)
        if (this.level >= 2 && Math.random() < 0.1) {
            this.spawnAllMoles();
        } else {
            const randomHole = Math.floor(Math.random() * 9);
            if (!this.activeMoles.has(randomHole)) {
                this.showMole(randomHole);
            }
        }
        
        // 根據關卡調整速度
        const baseSpawnTime = 1500;
        const speedMultiplier = Math.pow(0.5, this.level - 1); // 每關速度增加一倍
        const nextSpawnTime = (Math.random() * baseSpawnTime + 500) * speedMultiplier;
        
        this.moleTimer = setTimeout(() => this.spawnMoles(), nextSpawnTime);
    }
    
    showMole(holeIndex) {
        const mole = this.moles[holeIndex];
        this.activeMoles.add(holeIndex);
        mole.classList.add('show');
        
        const hideTime = Math.random() * 2000 + 1000;
        setTimeout(() => {
            if (this.activeMoles.has(holeIndex)) {
                this.hideMole(holeIndex);
            }
        }, hideTime);
    }
    
    hideMole(holeIndex) {
        const mole = this.moles[holeIndex];
        mole.classList.remove('show');
        this.activeMoles.delete(holeIndex);
    }
    
    hitMole(holeIndex) {
        if (!this.isPlaying || !this.activeMoles.has(holeIndex)) return;
        
        const mole = this.moles[holeIndex];
        mole.classList.add('hit');
        mole.classList.remove('show');
        this.activeMoles.delete(holeIndex);
        
        this.score += 10;
        this.updateDisplay();
        
        this.createScorePopup(holeIndex);
        
        // 檢查是否達到下一關的分數
        if (this.score >= this.level * this.pointsPerLevel && this.level < this.maxLevel) {
            this.levelUp();
        } else if (this.score >= this.maxLevel * this.pointsPerLevel) {
            this.victory();
        }
        
        setTimeout(() => {
            mole.classList.remove('hit');
        }, 300);
    }
    
    createScorePopup(holeIndex) {
        const hole = this.holes[holeIndex];
        const popup = document.createElement('div');
        popup.textContent = '+10';
        popup.style.cssText = `
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            color: #FF6B6B;
            font-weight: bold;
            font-size: 1.5em;
            pointer-events: none;
            z-index: 10;
            animation: scoreFloat 1s ease-out forwards;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scoreFloat {
                0% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-50px); }
            }
        `;
        document.head.appendChild(style);
        
        hole.style.position = 'relative';
        hole.appendChild(popup);
        
        setTimeout(() => {
            hole.removeChild(popup);
            document.head.removeChild(style);
        }, 1000);
    }
    
    hideAllMoles() {
        this.moles.forEach((mole, index) => {
            mole.classList.remove('show', 'hit');
            this.activeMoles.delete(index);
        });
    }
    
    endGame() {
        this.isPlaying = false;
        clearTimeout(this.moleTimer);
        clearInterval(this.gameTimer);
        
        this.hideAllMoles();
        
        this.finalScoreElement.textContent = this.score;
        this.finalLevelElement.textContent = this.level;
        this.gameOverElement.classList.add('show');
        this.startBtn.style.display = 'inline-block';
    }
    
    restartGame() {
        this.isPlaying = false;
        clearTimeout(this.moleTimer);
        clearInterval(this.gameTimer);
        
        this.gameOverElement.classList.remove('show');
        this.levelUpElement.classList.remove('show');
        this.victoryElement.classList.remove('show');
        
        setTimeout(() => {
            this.startGame();
        }, 100);
    }
    
    spawnAllMoles() {
        for (let i = 0; i < 9; i++) {
            if (!this.activeMoles.has(i)) {
                this.showMole(i);
            }
        }
    }
    
    levelUp() {
        this.isPlaying = false;
        clearTimeout(this.moleTimer);
        clearInterval(this.gameTimer);
        
        this.hideAllMoles();
        this.level++;
        this.nextLevelElement.textContent = this.level;
        this.levelUpElement.classList.add('show');
    }
    
    nextLevel() {
        this.levelUpElement.classList.remove('show');
        this.isPlaying = true;
        this.activeMoles.clear();
        
        this.updateDisplay();
        
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
        
        this.spawnMoles();
    }
    
    victory() {
        this.isPlaying = false;
        clearTimeout(this.moleTimer);
        clearInterval(this.gameTimer);
        
        this.hideAllMoles();
        
        this.victoryScoreElement.textContent = this.score;
        this.victoryElement.classList.add('show');
    }
    
    updateDisplay() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
        this.timeElement.textContent = this.timeLeft;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WhackAMoleGame();
});