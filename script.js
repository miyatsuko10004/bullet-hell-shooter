const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetButton = document.getElementById('resetButton');

// Game state variables
let player, bullets, enemies, enemyBullets, score, gameOver, lastEnemySpawn;

const playerInitialState = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    color: '#00ff00',
    speed: 5,
    lastShot: 0,
    shootCooldown: 250 // 250ms
};

const bulletSpeed = 7;
const enemySpeed = 2;
const enemySpawnInterval = 1000; // 1000ms
const enemyBulletSpeed = 4;

function resetGame() {
    player = { ...playerInitialState };
    bullets = [];
    enemies = [];
    enemyBullets = [];
    score = 0;
    gameOver = false;
    lastEnemySpawn = 0;
    resetButton.style.display = 'none';
    gameLoop();
}

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
    ctx.fillStyle = '#ff00ff'; // Magenta for enemy bullets
    for (const bullet of enemyBullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

function drawScore() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 20, 40);
}

function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

const keys = {};

document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);
resetButton.addEventListener('click', resetGame);

function movePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
    if (keys['Space']) {
        shoot();
    }
}

function shoot() {
    const now = Date.now();
    if (now - player.lastShot > player.shootCooldown) {
        player.lastShot = now;
        bullets.push({
            x: player.x + player.width / 2 - 2.5,
            y: player.y,
            width: 5,
            height: 10,
        });
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bulletSpeed;
        if (bullet.y < 0) {
            bullets.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    const now = Date.now();
    if (now - lastEnemySpawn > enemySpawnInterval) {
        lastEnemySpawn = now;
        const size = Math.random() * 30 + 20; // 20-50px
        enemies.push({
            x: Math.random() * (canvas.width - size),
            y: -size,
            width: size,
            height: size,
            lastShot: 0,
            shootInterval: Math.random() * 1000 + 1000 // 1-2 seconds
        });
    }
}

function updateEnemies() {
    const now = Date.now();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.y += enemySpeed;

        if (now - enemy.lastShot > enemy.shootInterval && enemy.y > 0) {
            enemy.lastShot = now;
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemyBullets.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                width: 8,
                height: 8,
                velocityX: Math.cos(angle) * enemyBulletSpeed,
                velocityY: Math.sin(angle) * enemyBulletSpeed
            });
        }

        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
        }
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
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && enemies[j] && isColliding(bullets[i], enemies[j])) {
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 10;
                break;
            }
        }
    }

    for (const enemy of enemies) {
        if (isColliding(player, enemy)) {
            gameOver = true;
            break;
        }
    }

    for (const bullet of enemyBullets) {
        if (isColliding(player, bullet)) {
            gameOver = true;
            break;
        }
    }
}

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
    drawScore();
    requestAnimationFrame(gameLoop);
}

resetGame();
