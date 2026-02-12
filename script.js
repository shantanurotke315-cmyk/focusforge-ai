// ===== GLOBAL STATE =====
let gameState = {
    username: 'Hunter',
    level: 1,
    xp: 0,
    rank: 'E',
    tasks: [],
    completedCount: 0,
    lastVisit: new Date().toDateString(),
    streak: 0,
    achievements: [],
    hardQuestsCompleted: 0
};

let selectedDifficulty = 'easy';
let timerInterval = null;
let timerSeconds = 1500; // 25 minutes
let isWorkMode = true;
let confirmCallback = null;

// ===== AUDIO SYSTEM =====
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'click':
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'complete':
            oscillator.frequency.value = 1000;
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'levelup':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1047, audioContext.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
    }
}

// ===== ACHIEVEMENTS SYSTEM =====
const achievementsList = [
    { id: 'first_quest', name: 'First Quest', icon: '⚔️', condition: () => gameState.completedCount >= 1 },
    { id: 'quest_10', name: '10 Quests', icon: '🎯', condition: () => gameState.completedCount >= 10 },
    { id: 'quest_50', name: '50 Quests', icon: '🏅', condition: () => gameState.completedCount >= 50 },
    { id: 'quest_100', name: '100 Quests', icon: '👑', condition: () => gameState.completedCount >= 100 },
    { id: 'first_levelup', name: 'Level Up', icon: '⬆️', condition: () => gameState.level >= 2 },
    { id: 'level_10', name: 'Level 10', icon: '⭐', condition: () => gameState.level >= 10 },
    { id: 'level_25', name: 'Level 25', icon: '💫', condition: () => gameState.level >= 25 },
    { id: 'level_50', name: 'Level 50', icon: '✨', condition: () => gameState.level >= 50 },
    { id: 'level_100', name: 'Max Level', icon: '🌟', condition: () => gameState.level >= 100 },
    { id: 'streak_7', name: '7 Day Streak', icon: '🔥', condition: () => gameState.streak >= 7 },
    { id: 'streak_30', name: '30 Day Streak', icon: '🔥🔥', condition: () => gameState.streak >= 30 },
    { id: 'hard_5', name: 'Hard Quests', icon: '💪', condition: () => gameState.hardQuestsCompleted >= 5 },
    { id: 's_rank', name: 'S-Rank Hunter', icon: '🏆', condition: () => gameState.rank === 'S' }
];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    checkStreak();
    checkAchievements();
    initializeParticles();
    renderUI();
    attachEventListeners();
});

function initializeParticles() {
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (5 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// ===== LOCAL STORAGE =====
function loadGameState() {
    const saved = localStorage.getItem('soloLevelingGame');
    if (saved) {
        gameState = { ...gameState, ...JSON.parse(saved) };
    }
}

function saveGameState() {
    localStorage.setItem('soloLevelingGame', JSON.stringify(gameState));
}

// ===== STREAK SYSTEM =====
function checkStreak() {
    const today = new Date().toDateString();
    const lastVisit = new Date(gameState.lastVisit).toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastVisit === today) {
        // Same day, keep streak
        return;
    } else if (lastVisit === yesterdayStr) {
        // Consecutive day
        gameState.streak++;
    } else {
        // Streak broken
        gameState.streak = 1;
    }
    
    gameState.lastVisit = today;
    saveGameState();
}

// ===== RANK SYSTEM =====
function getRankByLevel(level) {
    if (level >= 86) return 'S';
    if (level >= 66) return 'A';
    if (level >= 46) return 'B';
    if (level >= 26) return 'C';
    if (level >= 11) return 'D';
    return 'E';
}

function getXPForLevel(level) {
    return 100 + (level - 1) * 20;
}

// ===== XP & LEVELING =====
function addXP(amount) {
    gameState.xp += amount;
    const xpNeeded = getXPForLevel(gameState.level);
    
    if (gameState.xp >= xpNeeded) {
        levelUp();
    }
    
    updateXPBar();
    saveGameState();
}

function levelUp() {
    if (gameState.level >= 100) return;
    
    gameState.xp -= getXPForLevel(gameState.level);
    gameState.level++;
    
    const newRank = getRankByLevel(gameState.level);
    const rankChanged = newRank !== gameState.rank;
    gameState.rank = newRank;
    
    playSound('levelup');
    showLevelUpModal(rankChanged);
    checkAchievements();
    saveGameState();
    renderUI();
}

function showLevelUpModal(rankChanged = false) {
    const modal = document.getElementById('levelUpModal');
    const levelDisplay = document.getElementById('newLevelDisplay');
    const levelUpText = document.getElementById('levelUpText');
    
    levelDisplay.textContent = gameState.level;
    
    if (rankChanged) {
        levelUpText.textContent = `You've reached Rank ${gameState.rank}! You're becoming stronger!`;
    } else {
        levelUpText.textContent = `Congratulations! You've reached Level ${gameState.level}!`;
    }
    
    modal.classList.remove('hidden');
}

// ===== TASKS/QUESTS SYSTEM =====
function createTask(title, difficulty) {
    const xpRewards = { easy: 10, medium: 25, hard: 50 };
    const task = {
        id: Date.now(),
        title: title.trim(),
        difficulty,
        xp: xpRewards[difficulty],
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    gameState.tasks.push(task);
    saveGameState();
    renderTasks();
    showSystemMessage('⚔️ QUEST CREATED');
    playSound('click');
}

function completeTask(taskId) {
    const task = gameState.tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;
    
    task.completed = true;
    gameState.completedCount++;
    
    if (task.difficulty === 'hard') {
        gameState.hardQuestsCompleted++;
    }
    
    addXP(task.xp);
    checkAchievements();
    saveGameState();
    renderTasks();
    renderUI();
    showSystemMessage(`⚔️ QUEST COMPLETED +${task.xp} XP`);
    playSound('complete');
}

function deleteTask(taskId) {
    showConfirmModal('Are you sure you want to delete this quest?', () => {
        gameState.tasks = gameState.tasks.filter(t => t.id !== taskId);
        saveGameState();
        renderTasks();
        playSound('click');
    });
}

// ===== ACHIEVEMENTS =====
function checkAchievements() {
    let newAchievements = false;
    
    achievementsList.forEach(achievement => {
        if (!gameState.achievements.includes(achievement.id) && achievement.condition()) {
            gameState.achievements.push(achievement.id);
            newAchievements = true;
            showSystemMessage(`🏆 ACHIEVEMENT UNLOCKED: ${achievement.name}`);
        }
    });
    
    if (newAchievements) {
        saveGameState();
        renderAchievements();
    }
}

// ===== POMODORO TIMER =====
function startTimer() {
    if (timerInterval) return;
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            playSound('complete');
            
            if (isWorkMode) {
                showSystemMessage('⏱️ WORK SESSION COMPLETE! Take a break.');
                timerSeconds = 300; // 5 min break
                isWorkMode = false;
            } else {
                showSystemMessage('⏱️ BREAK OVER! Ready for another session?');
                timerSeconds = 1500; // 25 min work
                isWorkMode = true;
            }
            
            updateTimerDisplay();
            updateTimerMode();
        }
    }, 1000);
    
    document.getElementById('startTimerBtn').textContent = 'PAUSE';
    playSound('click');
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        document.getElementById('startTimerBtn').textContent = 'START';
        playSound('click');
    }
}

function resetTimer() {
    pauseTimer();
    timerSeconds = isWorkMode ? 1500 : 300;
    updateTimerDisplay();
    playSound('click');
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimerMode() {
    document.getElementById('timerMode').textContent = isWorkMode ? 'Work Mode' : 'Break Mode';
}

// ===== UI RENDERING =====
function renderUI() {
    // Player info
    document.getElementById('playerName').textContent = gameState.username;
    document.getElementById('playerLevel').textContent = gameState.level;
    document.getElementById('playerRank').textContent = gameState.rank;
    document.getElementById('streakCount').textContent = gameState.streak + '🔥';
    
    // Stats dashboard
    document.getElementById('totalCompleted').textContent = gameState.completedCount;
    document.getElementById('currentLevel').textContent = gameState.level;
    document.getElementById('currentRank').textContent = gameState.rank;
    
    updateXPBar();
    renderTasks();
    renderAchievements();
}

function updateXPBar() {
    const xpNeeded = getXPForLevel(gameState.level);
    const percentage = (gameState.xp / xpNeeded) * 100;
    
    document.getElementById('xpFill').style.width = percentage + '%';
    document.getElementById('xpText').textContent = `${gameState.xp} / ${xpNeeded}`;
    document.getElementById('xpRemaining').textContent = xpNeeded - gameState.xp;
}

function renderTasks() {
    const questList = document.getElementById('questList');
    const emptyState = document.getElementById('emptyState');
    const activeTasks = gameState.tasks.filter(t => !t.completed);
    const completedTasks = gameState.tasks.filter(t => t.completed);
    const allTasks = [...activeTasks, ...completedTasks];
    
    if (allTasks.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    questList.innerHTML = allTasks.map(task => `
        <div class="quest-item ${task.completed ? 'completed' : ''}" data-testid="quest-item-${task.id}">
            <div class="quest-checkbox ${task.completed ? 'checked' : ''}" 
                 onclick="completeTask(${task.id})"
                 data-testid="quest-checkbox-${task.id}">
                ${task.completed ? '✓' : ''}
            </div>
            <div class="quest-details">
                <div class="quest-title" data-testid="quest-title-${task.id}">${task.title}</div>
                <div class="quest-meta">
                    <span class="difficulty-tag ${task.difficulty}" data-testid="quest-difficulty-${task.id}">
                        ${task.difficulty}
                    </span>
                    <span data-testid="quest-xp-${task.id}">+${task.xp} XP</span>
                </div>
            </div>
            <div class="quest-actions">
                <button class="action-btn" onclick="deleteTask(${task.id})" data-testid="delete-quest-${task.id}">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function renderAchievements() {
    const achievementsList = document.getElementById('achievementsList');
    
    achievementsList.innerHTML = window.achievementsList.map(achievement => `
        <div class="achievement-item ${gameState.achievements.includes(achievement.id) ? 'unlocked' : ''}"
             data-testid="achievement-${achievement.id}">
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
        </div>
    `).join('');
}

// ===== SYSTEM MESSAGE =====
function showSystemMessage(message) {
    const messageEl = document.getElementById('systemMessage');
    const contentEl = document.getElementById('messageContent');
    
    contentEl.textContent = message;
    messageEl.classList.remove('hidden');
    
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 3000);
}

// ===== MODALS =====
function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const confirmText = document.getElementById('confirmText');
    
    confirmText.textContent = message;
    confirmCallback = onConfirm;
    modal.classList.remove('hidden');
}

// ===== EVENT LISTENERS =====
function attachEventListeners() {
    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
        const modal = document.getElementById('settingsModal');
        document.getElementById('settingsNameInput').value = gameState.username;
        modal.classList.remove('hidden');
        playSound('click');
    });
    
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const newName = document.getElementById('settingsNameInput').value.trim();
        if (newName) {
            gameState.username = newName;
            saveGameState();
            renderUI();
            showSystemMessage('⚙️ SETTINGS SAVED');
        }
        document.getElementById('settingsModal').classList.add('hidden');
        playSound('click');
    });
    
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
        playSound('click');
    });
    
    document.getElementById('resetDataBtn').addEventListener('click', () => {
        showConfirmModal('Are you sure you want to reset ALL data? This cannot be undone!', () => {
            localStorage.removeItem('soloLevelingGame');
            location.reload();
        });
    });
    
    // Edit name inline
    document.getElementById('editNameBtn').addEventListener('click', () => {
        document.getElementById('settingsBtn').click();
    });
    
    // Quest form
    document.getElementById('addQuestBtn').addEventListener('click', () => {
        const form = document.getElementById('questForm');
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) {
            document.getElementById('questTitle').focus();
        }
        playSound('click');
    });
    
    document.getElementById('cancelQuestBtn').addEventListener('click', () => {
        document.getElementById('questForm').classList.add('hidden');
        document.getElementById('questTitle').value = '';
        playSound('click');
    });
    
    // Difficulty selection
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedDifficulty = btn.dataset.difficulty;
            playSound('click');
        });
    });
    
    // Submit quest
    document.getElementById('submitQuestBtn').addEventListener('click', () => {
        const title = document.getElementById('questTitle').value.trim();
        if (title) {
            createTask(title, selectedDifficulty);
            document.getElementById('questForm').classList.add('hidden');
            document.getElementById('questTitle').value = '';
            
            // Reset to easy
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
            document.querySelector('[data-difficulty="easy"]').classList.add('selected');
            selectedDifficulty = 'easy';
        }
    });
    
    // Enter key to submit quest
    document.getElementById('questTitle').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('submitQuestBtn').click();
        }
    });
    
    // Timer controls
    document.getElementById('startTimerBtn').addEventListener('click', () => {
        if (timerInterval) {
            pauseTimer();
        } else {
            startTimer();
        }
    });
    
    document.getElementById('resetTimerBtn').addEventListener('click', resetTimer);
    
    // Level up modal
    document.getElementById('closeLevelUpBtn').addEventListener('click', () => {
        document.getElementById('levelUpModal').classList.add('hidden');
        playSound('click');
    });
    
    // Confirm modal
    document.getElementById('confirmYesBtn').addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
            confirmCallback = null;
        }
        document.getElementById('confirmModal').classList.add('hidden');
        playSound('click');
    });
    
    document.getElementById('confirmNoBtn').addEventListener('click', () => {
        confirmCallback = null;
        document.getElementById('confirmModal').classList.add('hidden');
        playSound('click');
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                playSound('click');
            }
        });
    });
    
    // Initial difficulty selection
    document.querySelector('[data-difficulty="easy"]').classList.add('selected');
}

// Make functions globally accessible
window.completeTask = completeTask;
window.deleteTask = deleteTask;
window.achievementsList = achievementsList;
