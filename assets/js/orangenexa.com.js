
// Game constants
const COLORS = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // O
    '#0DFF72', // L
    '#F538FF', // J
    '#FF8E0D', // I
    '#FFE138', // S
    '#3877FF', // Z
];

const PIECES = {
    'T': [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    'O': [
        [2, 2],
        [2, 2],
    ],
    'L': [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0],
    ],
    'J': [
        [4, 0, 0],
        [4, 4, 4],
        [0, 0, 0],
    ],
    'I': [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
    ],
    'S': [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
    ],
    'Z': [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
    ]
};

const GRID_WIDTH = 12;
const GRID_HEIGHT = 20;
const BASE_DROP_INTERVAL = 1000;
const SCORE_PER_LINE = 10;
const LEVEL_SPEED_INCREASE = 0.9;

// Game state
let arena = createMatrix(GRID_WIDTH, GRID_HEIGHT);
let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
};

let score = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = BASE_DROP_INTERVAL;
let lastTime = 0;
let gameOver = false;
let isPaused = false;
let gameStarted = false;
let animationFrameId = null;

// DOM elements
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const startScreen = document.getElementById('start-screen');
context.scale(20, 20);

// Initialize game (but don't start yet)
init();

function init() {
    playerReset();
    addEventListeners();
    drawStartScreen();
}

function startGame() {
    if (gameStarted) return;

    gameStarted = true;
    gameOver = false;
    startScreen.style.display = 'none';
    lastTime = performance.now();
    update();
}

function createMatrix(width, height) {
    return Array.from({ length: height }, () => new Array(width).fill(0));
}

function createPiece(type) {
    return PIECES[type] || PIECES['T']; // Default to T if invalid type
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);

                // Add some styling to blocks
                context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                context.lineWidth = 0.05;
                context.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    // Clear canvas
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    context.lineWidth = 0.02;

    for (let x = 0; x < GRID_WIDTH; x++) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, GRID_HEIGHT);
        context.stroke();
    }

    for (let y = 0; y < GRID_HEIGHT; y++) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(GRID_WIDTH, y);
        context.stroke();
    }

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);

    // Draw ghost piece
    if (!gameOver && !isPaused) {
        drawGhostPiece();
    }
}

function drawStartScreen() {
    // Clear canvas
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw title
    context.fillStyle = '#0DC2FF';
    context.font = '20px Arial';
    context.textAlign = 'center';
    context.fillText('TETRIS', canvas.width / 40, canvas.height / 40);

    // Draw instructions
    context.fillStyle = '#fff';
    context.font = '10px Arial';
    context.fillText('Press ENTER to Start', canvas.width / 40, canvas.height / 20);
}

function drawGhostPiece() {
    const ghost = {
        pos: { ...player.pos },
        matrix: player.matrix.map(row => [...row])
    };

    while (!collide(arena, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;

    context.globalAlpha = 0.3;
    drawMatrix(ghost.matrix, ghost.pos);
    context.globalAlpha = 1.0;
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] === undefined ||
                    arena[y + o.y][x + o.x] === undefined ||
                    arena[y + o.y][x + o.x] !== 0)) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    // Transpose matrix
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }

    // Reverse each row to rotate 90deg
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function arenaSweep() {
    let linesCleared = 0;

    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        linesCleared++;
    }

    if (linesCleared > 0) {
        // Update score based on lines cleared
        score += linesCleared * SCORE_PER_LINE * level;
        scoreDisplay.textContent = score;

        // Increase level every 10 lines (adjust as needed)
        const newLevel = Math.floor(score / 100) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropInterval = BASE_DROP_INTERVAL * Math.pow(LEVEL_SPEED_INCREASE, level - 1);
        }
    }
}

function playerDrop() {
    if (gameOver || isPaused || !gameStarted) return;

    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    if (gameOver || isPaused || !gameStarted) return;

    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    const pieces = Object.keys(PIECES);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    player.matrix = createPiece(randomPiece);
    player.pos.y = 0;
    player.pos.x = Math.floor(arena[0].length / 2 - player.matrix[0].length / 2);

    if (collide(arena, player)) {
        gameOver = true;
        showGameOver();
    }
}

function showGameOver() {
    startScreen.style.display = 'flex';
    startScreen.innerHTML = `
          <h2>GAME OVER</h2>
          <p>Score: ${score}</p>
          <p>Press ENTER to Play Again</p>
        `;
    gameStarted = false;
}

function playerRotate(dir) {
    if (gameOver || isPaused || !gameStarted) return;

    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);

    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));

        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function resetGame() {
    arena = createMatrix(GRID_WIDTH, GRID_HEIGHT);
    score = 0;
    level = 1;
    dropInterval = BASE_DROP_INTERVAL;
    scoreDisplay.textContent = score;
    gameOver = false;
    playerReset();
}

function togglePause() {
    if (!gameStarted) return;

    isPaused = !isPaused;
    if (!isPaused && !gameOver) {
        lastTime = performance.now();
        update();
    }
}

function update(time = 0) {
    if (isPaused || gameOver || !gameStarted) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    animationFrameId = requestAnimationFrame(update);
}

function addEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            if (!gameStarted || gameOver) {
                resetGame();
                startGame();
            }
            return;
        }

        if (!gameStarted || gameOver) return;

        switch (event.key) {
            case 'ArrowLeft':
                playerMove(-1);
                break;
            case 'ArrowRight':
                playerMove(1);
                break;
            case 'ArrowDown':
                playerDrop();
                break;
            case 'q':
                playerRotate(-1);
                break;
            case 'w':
                playerRotate(1);
                break;
            case 'p':
                togglePause();
                break;
            case ' ':
                // Hard drop
                while (!collide(arena, player)) {
                    player.pos.y++;
                }
                player.pos.y--;
                playerDrop();
                break;
        }
    });

    // Touch controls for mobile
    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener('touchstart', (e) => {
        if (!gameStarted || gameOver || isPaused) return;
        e.preventDefault();
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!gameStarted || gameOver || isPaused) return;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!gameStarted || gameOver || isPaused) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        const diffX = touch.clientX - touchStartX;
        const diffY = touch.clientY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            playerMove(diffX > 0 ? 1 : -1);
        } else if (diffY > 30) {
            // Down swipe
            playerDrop();
        } else if (diffY < -30) {
            // Up swipe - rotate
            playerRotate(1);
        }
    }, { passive: false });
}