const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const difficultySelection = document.getElementById('difficultySelection');

// --- Game State and Configuration ---
let player, bullets, enemies, enemyBullets, score, gameOver, level, nextLevelScore, gameLoopId;
let keys = {};

const difficultySettings = {
    easy: { enemySpeed: 2, enemySpawnInterval: 1200, enemyBulletSpeed: 3, enemyShootInterval: 1500 },
    normal: { enemySpeed: 3, enemySpawnInterval: 1000, enemyBulletSpeed: 4, enemyShootInterval: 1000 },
    hard: { enemySpeed: 4, enemySpawnInterval: 700, enemyBulletSpeed: 5, enemyShootInterval: 750 }
};
let currentDifficulty;

const playerInitialState = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    color: '#00ff00',
    speed: 5,
    lastShot: 0,
    shootCooldown: {
        initial: 300,
        current: 300,
        minimum: 50
    },
    health: {
        initial: 3,
        current: 3
    }
};

// --- Initialization ---
function startGame() {
    const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
    currentDifficulty = difficultySettings[selectedDifficulty];

    startScreen.style.display = 'none';
    canvas.style.display = 'block';
    
    initGame();
}

function initGame() {
    player = { ...playerInitialState, shootCooldown: playerInitialState.shootCooldown.initial, health: playerInitialState.health.initial };
    bullets = [];
    enemies = [];
    enemyBullets = [];
    score = 0;
    level = 1;
    nextLevelScore = 100;
    gameOver = false;
    
    resetButton.style.display = 'none';
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

// --- Drawing Functions ---
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawBullets() {
    ctx.fillStyle = '#ffff00';
    for (const bullet of bullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

function drawEnemies() {
    ctx.fillStyle = '#ff0000';
    for (const enemy of enemies) {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
}

function drawEnemyBullets() {
    ctx.fillStyle = '#ff00ff';
    for (const bullet of enemyBullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

function drawUI() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
    ctx.fillText(`Level: ${level}`, 20, 70);
    ctx.fillText(`Health: ${player.health.current}`, canvas.width - 150, 40);
}

// --- Game Logic ---
function movePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;
    if (keys['Space']) shoot();
}

function shoot() {
    const now = Date.now();
    if (now - player.lastShot > player.shootCooldown.current) {
        player.lastShot = now;
        bullets.push({ x: player.x + player.width / 2 - 2.5, y: player.y, width: 5, height: 10 });
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= 7;
        if (bullets[i].y < 0) bullets.splice(i, 1);
    }
}

let lastEnemySpawn = 0;
function spawnEnemy() {
    const now = Date.now();
    if (now - lastEnemySpawn > currentDifficulty.enemySpawnInterval) {
        lastEnemySpawn = now;
        const size = Math.random() * 30 + 20;
        enemies.push({
            x: Math.random() * (canvas.width - size),
            y: -size,
            width: size,
            height: size,
            lastShot: 0,
            shootInterval: Math.random() * 500 + currentDifficulty.enemyShootInterval
        });
    }
}

function updateEnemies() {
    const now = Date.now();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.y += currentDifficulty.enemySpeed;

        if (now - enemy.lastShot > enemy.shootInterval && enemy.y > 0) {
            enemy.lastShot = now;
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemyBullets.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                width: 8,
                height: 8,
                velocityX: Math.cos(angle) * currentDifficulty.enemyBulletSpeed,
                velocityY: Math.sin(angle) * currentDifficulty.enemyBulletSpeed
            });
        }
        if (enemy.y > canvas.height) enemies.splice(i, 1);
    }
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // Early return if no objects to check
    if (bullets.length === 0 && enemies.length === 0 && enemyBullets.length === 0) return;

    // Player bullets vs Enemies
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i]) continue; // Safety check
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (enemies[j] && isColliding(bullets[i], enemies[j])) {
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                score += 10;
                checkLevelUp();
                break;
            }
        }
    }

    // Player vs Enemies or Enemy Bullets
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (isColliding(player, enemies[i])) {
            enemies.splice(i, 1);
            player.health.current--;
            break;
        }
    }
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (isColliding(player, enemyBullets[i])) {
            enemyBullets.splice(i, 1);
            player.health.current--;
            break;
        }
    }

    if (player.health.current <= 0) {
        gameOver = true;
    }
}

function checkLevelUp() {
    if (score >= nextLevelScore) {
        level++;
        nextLevelScore *= 2; // Next level requires double the score
        player.shootCooldown.current = Math.max(player.shootCooldown.minimum, player.shootCooldown.current - 50); // Increase fire rate
    }
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// --- Game Loop ---
function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
        resetButton.style.display = 'block';
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    movePlayer();
    updateBullets();
    updateEnemyBullets();
    spawnEnemy();
    updateEnemies();
    checkCollisions();

    drawPlayer();
    drawBullets();
    drawEnemies();
    drawEnemyBullets();
    drawUI();

    gameLoopId = requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);
startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', initGame);