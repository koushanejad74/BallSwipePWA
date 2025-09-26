// Game variables
let canvas, ctx;
let gameRunning = false;
let gamePaused = false;
let score = 0;
let animationId;

// Game objects
let ball, paddle;
let particles = [];

// Level/Grid system
let currentLevel = null;
let gridData = null;
let gridWidth = 0;
let gridHeight = 0;
let cellSize = 0;
let currentStep = 0;

// Initialize game
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 350;
    canvas.height = 500;
    
    // Event listeners
    setupEventListeners();
    
    // Test: Just draw a simple grid first
    drawSimpleTestGrid();
}

// Simple test grid to make sure drawing works
function drawSimpleTestGrid() {
    console.log('Drawing simple test grid...');
    
    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw a simple 3x3 grid
    const gridSize = 3;
    const cellSize = 80;
    const startX = 50;
    const startY = 100;
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const x = startX + j * cellSize;
            const y = startY + i * cellSize;
            
            // Draw cell
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
            
            // Draw border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellSize - 2, cellSize - 2);
            
            // Draw cell number
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${i * 3 + j + 1}`, x + cellSize/2, y + cellSize/2);
        }
    }
    
    // Add title
    ctx.fillStyle = '#333';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Test Grid', canvas.width / 2, 50);
}

// Load level from JSON file
async function loadLevel(levelName) {
    try {
        const response = await fetch(`levels/${levelName}.json`);
        currentLevel = await response.json();
        
        gridWidth = currentLevel.puzzle_info.grid_width;
        gridHeight = currentLevel.puzzle_info.grid_height;
        currentStep = 0;
        
        // Calculate cell size based on canvas dimensions
        const padding = 20;
        const availableWidth = canvas.width - (padding * 2);
        const availableHeight = canvas.height - (padding * 2) - 100; // Leave space for UI
        
        cellSize = Math.min(
            availableWidth / gridWidth,
            availableHeight / gridHeight
        );
        
        console.log(`Loaded level: ${levelName}`);
        console.log(`Grid: ${gridWidth}x${gridHeight}, Steps: ${currentLevel.puzzle_info.steps_to_solve}`);
        
        parseGridState(currentLevel.solution_path[currentStep]);
        
        // Start grid-based game loop
        gameLoop();
        
    } catch (error) {
        console.error('Error loading level:', error);
        // Fallback to original ball game if level loading fails
        initBallGame();
    }
}

// Parse grid state string (e.g., "023000100")
function parseGridState(stateString) {
    gridData = [];
    for (let i = 0; i < gridHeight; i++) {
        gridData[i] = [];
        for (let j = 0; j < gridWidth; j++) {
            const index = i * gridWidth + j;
            gridData[i][j] = parseInt(stateString[index]) || 0;
        }
    }
}

// Initialize original ball game as fallback
function initBallGame() {
    // Initialize game objects
    resetGame();
    
    // Start ball game loop
    gameLoop();
}

function resetGame() {
    ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 12,
        dx: 3,
        dy: -4,
        color: '#FF6B6B'
    };
    
    paddle = {
        x: canvas.width / 2 - 50,
        y: canvas.height - 30,
        width: 100,
        height: 15,
        color: '#4ECDC4'
    };
    
    particles = [];
    score = 0;
    updateScore();
}

function setupEventListeners() {
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', restartGame);
    
    // Mouse events
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleCanvasClick);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Prevent context menu on canvas
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Handle grid navigation clicks
    if (currentLevel && gridData) {
        handleGridClick(clickX, clickY);
    }
}

function handleMouseMove(e) {
    if (!gameRunning || gamePaused) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, mouseX - paddle.width / 2));
}

function handleTouchStart(e) {
    e.preventDefault();
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!gameRunning || gamePaused) return;
    
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, touchX - paddle.width / 2));
}

function handleTouchEnd(e) {
    e.preventDefault();
}

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('game-over').classList.add('hidden');
    }
}

function togglePause() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn.textContent = gamePaused ? 'Resume' : 'Pause';
    }
}

function restartGame() {
    resetGame();
    gameRunning = false;
    gamePaused = false;
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('pause-btn').textContent = 'Pause';
    document.getElementById('game-over').classList.add('hidden');
}

function gameOver() {
    gameRunning = false;
    gamePaused = false;
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('pause-btn').textContent = 'Pause';
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
    
    // Save high score to localStorage
    const highScore = localStorage.getItem('ballSwipeHighScore') || 0;
    if (score > highScore) {
        localStorage.setItem('ballSwipeHighScore', score);
        createParticleExplosion(canvas.width / 2, canvas.height / 2, '#FFD700');
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
}

function createParticleExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            life: 60,
            maxLife: 60,
            color: color
        });
    }
}

function updateBall() {
    if (!gameRunning || gamePaused) return;
    
    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Wall collision (left and right)
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
        ball.dx = -ball.dx;
        createParticleExplosion(ball.x, ball.y, '#4ECDC4');
    }
    
    // Top wall collision
    if (ball.y - ball.radius <= 0) {
        ball.dy = -ball.dy;
        createParticleExplosion(ball.x, ball.y, '#4ECDC4');
    }
    
    // Paddle collision
    if (ball.y + ball.radius >= paddle.y &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width &&
        ball.dy > 0) {
        
        ball.dy = -ball.dy;
        
        // Add some horizontal influence based on where ball hits paddle
        const hitPos = (ball.x - paddle.x) / paddle.width;
        ball.dx = (hitPos - 0.5) * 6;
        
        score += 10;
        updateScore();
        createParticleExplosion(ball.x, ball.y, '#4ECDC4');
        
        // Gradually increase ball speed
        if (score % 100 === 0) {
            ball.dx *= 1.05;
            ball.dy *= 1.05;
        }
    }
    
    // Game over condition
    if (ball.y > canvas.height) {
        gameOver();
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        
        // Add gravity to particles
        particle.dy += 0.1;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Check if we're in grid mode or ball mode
    if (currentLevel && gridData) {
        drawGrid();
    } else {
        drawBallGame();
    }
    
    // Draw pause overlay if game is paused
    drawPauseOverlay();
}

// Draw the grid-based puzzle
function drawGrid() {
    const startX = (canvas.width - (gridWidth * cellSize)) / 2;
    const startY = 60; // Leave space at top for UI
    
    // Draw grid cells
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            const x = startX + j * cellSize;
            const y = startY + i * cellSize;
            const value = gridData[i][j];
            
            // Draw cell background
            ctx.fillStyle = getCellColor(value);
            ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
            
            // Draw cell border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellSize - 2, cellSize - 2);
            
            // Draw cell value
            if (value > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = `${cellSize * 0.4}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    value.toString(),
                    x + cellSize / 2,
                    y + cellSize / 2
                );
            }
        }
    }
    
    // Draw step info
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Step: ${currentStep + 1}/${currentLevel.puzzle_info.steps_to_solve}`, 10, 30);
    ctx.fillText(`Target Steps: ${currentLevel.puzzle_info.steps_to_solve}`, 10, 50);
    
    // Draw navigation buttons
    drawGridControls();
}

// Get color for grid cell based on value
function getCellColor(value) {
    const colors = {
        0: '#f0f0f0',  // Empty
        1: '#ff6b6b',  // Red
        2: '#4ecdc4',  // Teal
        3: '#45b7d1',  // Blue
        4: '#96ceb4',  // Green
        5: '#feca57',  // Yellow
        6: '#ff9ff3',  // Pink
        7: '#54a0ff',  // Light Blue
        8: '#5f27cd',  // Purple
        9: '#00d2d3'   // Cyan
    };
    return colors[value] || '#ddd';
}

// Draw controls for grid navigation
function drawGridControls() {
    const buttonY = canvas.height - 60;
    const buttonWidth = 80;
    const buttonHeight = 30;
    
    // Previous button
    if (currentStep > 0) {
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(50, buttonY, buttonWidth, buttonHeight);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Previous', 90, buttonY + 20);
    }
    
    // Next button
    if (currentStep < currentLevel.solution_path.length - 1) {
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(150, buttonY, buttonWidth, buttonHeight);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Next', 190, buttonY + 20);
    }
}

// Draw the original ball game
function drawBallGame() {
    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    
    // Ball gradient
    const ballGradient = ctx.createRadialGradient(
        ball.x - 4, ball.y - 4, 0,
        ball.x, ball.y, ball.radius
    );
    ballGradient.addColorStop(0, '#FFB6C1');
    ballGradient.addColorStop(1, ball.color);
    
    ctx.fillStyle = ballGradient;
    ctx.fill();
    ctx.strokeStyle = '#FF1493';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw paddle
    ctx.fillStyle = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    
    // Paddle highlight
    ctx.fillStyle = '#7FDBDA';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, 3);
    
    // Draw particles
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Add click handlers for grid navigation
function handleGridClick(x, y) {
    if (!currentLevel || !gridData) return;
    
    const buttonY = canvas.height - 60;
    const buttonWidth = 80;
    const buttonHeight = 30;
    
    // Check Previous button
    if (currentStep > 0 && x >= 50 && x <= 130 && y >= buttonY && y <= buttonY + buttonHeight) {
        currentStep--;
        parseGridState(currentLevel.solution_path[currentStep]);
        return;
    }
    
    // Check Next button
    if (currentStep < currentLevel.solution_path.length - 1 && 
        x >= 150 && x <= 230 && y >= buttonY && y <= buttonY + buttonHeight) {
        currentStep++;
        parseGridState(currentLevel.solution_path[currentStep]);
        return;
    }
}

// Continue with pause overlay and other drawing
function drawPauseOverlay() {
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    // Only update ball physics if we're in ball mode
    if (!currentLevel || !gridData) {
        updateBall();
        updateParticles();
    }
    
    draw();
    
    if (gameRunning && !gamePaused) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);