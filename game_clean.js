// Clean grid-based puzzle game
let canvas, ctx;
let currentLevel = null;
let gridData = null;
let targetData = null;
let currentLevelNumber = 1;
let isDragging = false;
let dragStartX = 0, dragStartY = 0, dragStartCell = null;
let moveCount = 0; // Track number of moves made
let levelStartPopupActive = false; // Track if level start popup is shown
let levelCompletePopupActive = false; // Track if level complete popup is shown
let completionMoves = 0; // Store moves taken when level completed

// Animation variables
let animatingBall = null; // Currently animating ball
let animationStartTime = 0;
let animationDuration = 300; // Animation duration in milliseconds

// Initialize game
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 350;
    canvas.height = 500;
    
    console.log('Canvas initialized');
    
    // Load first level
    loadLevel(currentLevelNumber);
}

// Load level from JSON
async function loadLevel(levelNumber) {
    try {
        const levelFileName = `Level${levelNumber.toString().padStart(3, '0')}.json`;
        console.log(`Loading ${levelFileName}...`);
        
        const response = await fetch(`levels/${levelFileName}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        currentLevel = await response.json();
        currentLevelNumber = levelNumber;
        
        // Parse starting state and target
        parseGridState(currentLevel.solution_path[0]);
        parseTargetState(currentLevel.solution_path[currentLevel.solution_path.length - 1]);
        
        // Reset move counter
        moveCount = 0;
        updateScoreDisplay();
        
        // Show level start popup
        levelStartPopupActive = true;
        
        console.log('Level loaded successfully');
        
        // Setup events and draw
        setupEvents();
        drawGame();
        
    } catch (error) {
        console.error('Failed to load level:', error);
        // Show test grid as fallback
        drawTestGrid();
    }
}

// Parse grid state from string
function parseGridState(stateString) {
    const width = currentLevel.puzzle_info.grid_width;
    const height = currentLevel.puzzle_info.grid_height;
    
    gridData = [];
    for (let i = 0; i < height; i++) {
        gridData[i] = [];
        for (let j = 0; j < width; j++) {
            const index = i * width + j;
            gridData[i][j] = parseInt(stateString[index]) || 0;
        }
    }
}

// Parse target state
function parseTargetState(stateString) {
    const width = currentLevel.puzzle_info.grid_width;
    const height = currentLevel.puzzle_info.grid_height;
    
    targetData = [];
    for (let i = 0; i < height; i++) {
        targetData[i] = [];
        for (let j = 0; j < width; j++) {
            const index = i * width + j;
            targetData[i][j] = parseInt(stateString[index]) || 0;
        }
    }
}

// Draw the game
function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!currentLevel || !gridData) {
        drawTestGrid();
        return;
    }
    
    const width = currentLevel.puzzle_info.grid_width;
    const height = currentLevel.puzzle_info.grid_height;
    
    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${currentLevelNumber}`, canvas.width / 2, 30);
    
    ctx.font = '14px Arial';
    ctx.fillText('Drag balls to move them!', canvas.width / 2, 55);
    
    // Calculate grid layout
    const cellSize = Math.min(80, (canvas.width - 40) / width, (canvas.height - 180) / height);
    const startX = (canvas.width - width * cellSize) / 2;
    const startY = 80;
    
    // Draw grid lines
    drawGridLines(startX, startY, width, height, cellSize);
    
    // Draw grid content (balls, walls, targets)
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const x = startX + col * cellSize;
            const y = startY + row * cellSize;
            const value = gridData[row][col];
            const targetValue = targetData ? targetData[row][col] : 0;
            
            // Draw cell content
            drawCellContent(x, y, cellSize, value, targetValue, row, col);
        }
    }
    
    // Draw game buttons
    drawGameButtons(startX, startY + height * cellSize + 20, width * cellSize);
    
    // Draw instructions
    drawInstructions(startX, startY + height * cellSize + 70, width * cellSize);
    
    // Draw level start popup if active
    if (levelStartPopupActive) {
        drawLevelStartPopup();
    }
    
    // Draw level complete popup if active
    if (levelCompletePopupActive) {
        drawLevelCompletePopup();
    }
}

// Draw level start popup
function drawLevelStartPopup() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Popup box
    const popupWidth = 280;
    const popupHeight = 140;
    const popupX = (canvas.width - popupWidth) / 2;
    const popupY = (canvas.height - popupHeight) / 2;
    const cornerRadius = 12;
    
    // Popup background
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.fill();
    
    // Popup border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.stroke();
    
    // Level title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Level ${currentLevelNumber}`, popupX + popupWidth/2, popupY + 20);
    
    // Calculate minimum moves (length of solution path - 1)
    const minMoves = currentLevel.solution_path.length - 1;
    
    // Minimum moves text
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '18px Arial';
    ctx.fillText(`Solve in ${minMoves} moves`, popupX + popupWidth/2, popupY + 55);
    
    // Continue button
    const buttonWidth = 120;
    const buttonHeight = 35;
    const buttonX = popupX + (popupWidth - buttonWidth) / 2;
    const buttonY = popupY + popupHeight - 50;
    
    ctx.fillStyle = '#3498db';
    drawRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText('Continue', buttonX + buttonWidth/2, buttonY + buttonHeight/2);
}

// Draw level complete popup
function drawLevelCompletePopup() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Popup box
    const popupWidth = 300;
    const popupHeight = 180;
    const popupX = (canvas.width - popupWidth) / 2;
    const popupY = (canvas.height - popupHeight) / 2;
    const cornerRadius = 12;
    
    // Popup background
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.fill();
    
    // Popup border
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 3;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.stroke();
    
    // Congratulations title
    ctx.fillStyle = '#27ae60';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('🎉 Congratulations! 🎉', popupX + popupWidth/2, popupY + 20);
    
    // Level completed text
    ctx.fillStyle = '#2c3e50';
    ctx.font = '18px Arial';
    ctx.fillText(`Level ${currentLevelNumber} Complete!`, popupX + popupWidth/2, popupY + 55);
    
    // Moves taken text
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '16px Arial';
    const minMoves = currentLevel.solution_path.length - 1;
    const movesText = completionMoves === minMoves ? 
        `Perfect! Solved in ${completionMoves} moves! ⭐` : 
        `You solved it in ${completionMoves} moves`;
    ctx.fillText(movesText, popupX + popupWidth/2, popupY + 80);
    
    // Buttons
    const buttonWidth = 100;
    const buttonHeight = 35;
    const buttonsY = popupY + popupHeight - 50;
    
    // Next Level button (if not last level)
    if (currentLevelNumber < 20) {
        const nextButtonX = popupX + popupWidth/2 - buttonWidth - 5;
        ctx.fillStyle = '#3498db';
        drawRoundedRect(nextButtonX, buttonsY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textBaseline = 'middle';
        ctx.fillText('Next Level', nextButtonX + buttonWidth/2, buttonsY + buttonHeight/2);
    }
    
    // Replay button
    const replayButtonX = currentLevelNumber < 20 ? 
        popupX + popupWidth/2 + 5 : 
        popupX + (popupWidth - buttonWidth) / 2;
    
    ctx.fillStyle = '#e74c3c';
    drawRoundedRect(replayButtonX, buttonsY, buttonWidth, buttonHeight, 8);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Replay', replayButtonX + buttonWidth/2, buttonsY + buttonHeight/2);
}

// Helper function to draw rounded rectangle
function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Draw game buttons (Restart and Levels)
function drawGameButtons(startX, buttonY, gridWidth) {
    const buttonWidth = (gridWidth - 10) / 2; // Split width between two buttons with gap
    const buttonHeight = 35;
    const cornerRadius = 8;
    
    // Restart Level button
    ctx.fillStyle = '#FF9800';
    drawRoundedRect(startX, buttonY, buttonWidth, buttonHeight, cornerRadius);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Restart Level', startX + buttonWidth/2, buttonY + buttonHeight/2);
    
    // Levels button
    ctx.fillStyle = '#2196F3';
    drawRoundedRect(startX + buttonWidth + 10, buttonY, buttonWidth, buttonHeight, cornerRadius);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Levels', startX + buttonWidth + 10 + buttonWidth/2, buttonY + buttonHeight/2);
}

// Draw instructions below buttons
function drawInstructions(startX, instructionsY, gridWidth) {
    // Make box wider than the grid - 110% of grid width and center it
    const boxWidth = gridWidth * 1.1;
    const boxStartX = startX - (boxWidth - gridWidth) / 2; // Center the wider box
    const boxHeight = 80; // Increased height to prevent text cutoff
    const cornerRadius = 8;
    
    ctx.fillStyle = '#8e44ad'; // Purple background
    drawRoundedRect(boxStartX, instructionsY, boxWidth, boxHeight, cornerRadius);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#732d91';
    ctx.lineWidth = 1;
    drawRoundedRect(boxStartX, instructionsY, boxWidth, boxHeight, cornerRadius);
    ctx.stroke();
    
    // Instructions text
    ctx.fillStyle = '#ffffff'; // White text for contrast
    ctx.font = 'bold 18px Arial'; // Bigger font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('How to Play:', boxStartX + boxWidth/2, instructionsY + 12);
    
    // Multi-line instruction text
    ctx.font = '15px Arial'; // Bigger font for body text
    ctx.fillStyle = '#f8f9fa'; // Light color for body text
    ctx.fillText('Drag the colored balls to move them', boxStartX + boxWidth/2, instructionsY + 36);
    ctx.fillText('until they reach their target circles!', boxStartX + boxWidth/2, instructionsY + 54);
}

// Draw simple grid lines
function drawGridLines(startX, startY, width, height, cellSize) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Draw vertical lines
    for (let col = 0; col <= width; col++) {
        const x = startX + col * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + height * cellSize);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let row = 0; row <= height; row++) {
        const y = startY + row * cellSize;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + width * cellSize, y);
        ctx.stroke();
    }
}

// Draw individual cell
function drawCellContent(x, y, size, value, targetValue, row, col) {
    // Draw target circle first (behind content)
    if (targetValue >= 2 && targetValue <= 4) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const radius = Math.min(size * 0.35, 22);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = getBallColor(targetValue);
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    if (value === 1) {
        // Wall - fill the entire cell
        ctx.fillStyle = '#333333';
        ctx.fillRect(x, y, size, size);
        
    } else if (value >= 2 && value <= 4) {
        // Ball
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const radius = Math.min(size * 0.3, 20);
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = getBallColor(value);
        ctx.fill();
        
        // Highlight
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
    }
    
    // Draw animating ball if it affects this position
    if (animatingBall && row !== undefined && col !== undefined) {
        const currentTime = Date.now();
        const elapsed = currentTime - animationStartTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Calculate current position
        const width = currentLevel.puzzle_info.grid_width;
        const height = currentLevel.puzzle_info.grid_height;
        const cellSize = Math.min(80, (canvas.width - 40) / width, (canvas.height - 180) / height);
        const startX = (canvas.width - width * cellSize) / 2;
        const startY = 80;
        
        const fromX = startX + animatingBall.startCol * cellSize + cellSize / 2;
        const fromY = startY + animatingBall.startRow * cellSize + cellSize / 2;
        const toX = startX + animatingBall.endCol * cellSize + cellSize / 2;
        const toY = startY + animatingBall.endRow * cellSize + cellSize / 2;
        
        const currentX = fromX + (toX - fromX) * easeProgress;
        const currentY = fromY + (toY - fromY) * easeProgress;
        
        // Draw animating ball
        const radius = Math.min(size * 0.3, 20);
        
        ctx.beginPath();
        ctx.arc(currentX, currentY, radius, 0, Math.PI * 2);
        ctx.fillStyle = getBallColor(animatingBall.value);
        ctx.fill();
        
        // Highlight
        ctx.beginPath();
        ctx.arc(currentX - radius * 0.3, currentY - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
    }
}

// Show level selector
function showLevelSelector() {
    // Create a simple level selector overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Select Level', canvas.width / 2, 50);
    
    // Draw level buttons
    const levelsPerRow = 5; // Show 5 levels per row
    const totalLevels = 20;
    const buttonSize = 50; // Smaller buttons to fit more
    const cornerRadius = 8;
    const startX = (canvas.width - levelsPerRow * (buttonSize + 8)) / 2;
    const startY = 80; // Start higher up
    
    for (let i = 1; i <= totalLevels; i++) {
        const row = Math.floor((i - 1) / levelsPerRow);
        const col = (i - 1) % levelsPerRow;
        const x = startX + col * (buttonSize + 8);
        const y = startY + row * (buttonSize + 8);
        
        // Button background
        ctx.fillStyle = i === currentLevelNumber ? '#4CAF50' : '#2196F3';
        drawRoundedRect(x, y, buttonSize, buttonSize, cornerRadius);
        ctx.fill();
        
        // Level number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial'; // Smaller font for more levels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i.toString(), x + buttonSize/2, y + buttonSize/2);
    }
    
    // Close button - positioned at the bottom
    const closeButtonY = startY + 4 * (buttonSize + 8) + 15;
    ctx.fillStyle = '#f44336';
    drawRoundedRect(canvas.width/2 - 40, closeButtonY, 80, 35, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText('Close', canvas.width/2, closeButtonY + 17);
    
    // Set flag for level selector mode
    window.levelSelectorActive = true;
}

// Handle level selector clicks
function handleLevelSelectorClick(x, y) {
    const levelsPerRow = 5;
    const totalLevels = 20;
    const buttonSize = 50;
    const startX = (canvas.width - levelsPerRow * (buttonSize + 8)) / 2;
    const startY = 80; // Match the updated startY
    
    // Check level buttons
    for (let i = 1; i <= totalLevels; i++) {
        const row = Math.floor((i - 1) / levelsPerRow);
        const col = (i - 1) % levelsPerRow;
        const btnX = startX + col * (buttonSize + 8);
        const btnY = startY + row * (buttonSize + 8);
        
        if (x >= btnX && x <= btnX + buttonSize && 
            y >= btnY && y <= btnY + buttonSize) {
            currentLevelNumber = i;
            loadLevel(currentLevelNumber);
            window.levelSelectorActive = false;
            return;
        }
    }
    
    // Check close button
    const closeButtonY = startY + 4 * (buttonSize + 8) + 15;
    if (x >= canvas.width/2 - 40 && x <= canvas.width/2 + 40 && 
        y >= closeButtonY && y <= closeButtonY + 35) {
        window.levelSelectorActive = false;
        drawGame();
    }
}

// Get ball color
function getBallColor(value) {
    switch(value) {
        case 2: return '#ff4444'; // Red
        case 3: return '#44ff44'; // Green
        case 4: return '#4444ff'; // Blue
        default: return '#888888';
    }
}

// Draw test grid as fallback
function drawTestGrid() {
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Test Grid (Level JSON not found)', canvas.width / 2, 50);
    
    // Simple 3x3 test grid
    const cellSize = 80;
    const startX = (canvas.width - 3 * cellSize) / 2;
    const startY = 100;
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const x = startX + j * cellSize;
            const y = startY + i * cellSize;
            
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${i * 3 + j + 1}`, x + cellSize/2, y + cellSize/2 + 7);
        }
    }
}

// Basic event setup
function setupEvents() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleButtonClick);
    
    // Simple mobile touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        handleMouseDown({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        handleMouseUp({});
        // Handle button clicks
        handleButtonClick({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }, { passive: false });
}

function handleButtonClick(e) {
    if (isDragging) return; // Don't handle button clicks during drag
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if level start popup is active
    if (levelStartPopupActive) {
        // Handle level start popup continue button
        const popupWidth = 280;
        const popupHeight = 140;
        const popupX = (canvas.width - popupWidth) / 2;
        const popupY = (canvas.height - popupHeight) / 2;
        
        const buttonWidth = 120;
        const buttonHeight = 35;
        const buttonX = popupX + (popupWidth - buttonWidth) / 2;
        const buttonY = popupY + popupHeight - 50;
        
        if (x >= buttonX && x <= buttonX + buttonWidth && 
            y >= buttonY && y <= buttonY + buttonHeight) {
            levelStartPopupActive = false;
            drawGame();
        }
        return;
    }
    
    // Check if level complete popup is active
    if (levelCompletePopupActive) {
        const popupWidth = 300;
        const popupHeight = 180;
        const popupX = (canvas.width - popupWidth) / 2;
        const popupY = (canvas.height - popupHeight) / 2;
        
        const buttonWidth = 100;
        const buttonHeight = 35;
        const buttonsY = popupY + popupHeight - 50;
        
        // Next Level button (if not last level)
        if (currentLevelNumber < 20) {
            const nextButtonX = popupX + popupWidth/2 - buttonWidth - 5;
            if (x >= nextButtonX && x <= nextButtonX + buttonWidth && 
                y >= buttonsY && y <= buttonsY + buttonHeight) {
                levelCompletePopupActive = false;
                currentLevelNumber++;
                loadLevel(currentLevelNumber);
                return;
            }
        }
        
        // Replay button
        const replayButtonX = currentLevelNumber < 20 ? 
            popupX + popupWidth/2 + 5 : 
            popupX + (popupWidth - buttonWidth) / 2;
        
        if (x >= replayButtonX && x <= replayButtonX + buttonWidth && 
            y >= buttonsY && y <= buttonsY + buttonHeight) {
            levelCompletePopupActive = false;
            loadLevel(currentLevelNumber);
            return;
        }
        return;
    }
    
    // Check if level selector is active
    if (window.levelSelectorActive) {
        handleLevelSelectorClick(x, y);
        return;
    }
    
    if (!currentLevel || !gridData) return;
    
    const width = currentLevel.puzzle_info.grid_width;
    const height = currentLevel.puzzle_info.grid_height;
    const cellSize = Math.min(80, (canvas.width - 40) / width, (canvas.height - 180) / height);
    const startX = (canvas.width - width * cellSize) / 2;
    const startY = 80;
    
    // Check button clicks
    const buttonY = startY + height * cellSize + 20;
    const buttonWidth = (width * cellSize - 10) / 2;
    const buttonHeight = 35;
    
    // Restart button
    if (x >= startX && x <= startX + buttonWidth && 
        y >= buttonY && y <= buttonY + buttonHeight) {
        loadLevel(currentLevelNumber);
        return;
    }
    
    // Levels button
    if (x >= startX + buttonWidth + 10 && x <= startX + width * cellSize && 
        y >= buttonY && y <= buttonY + buttonHeight) {
        showLevelSelector();
        return;
    }
}

function handleMouseDown(e) {
    if (!currentLevel) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cell = getCellFromPosition(x, y);
    if (cell && gridData[cell.row][cell.col] >= 2 && gridData[cell.row][cell.col] <= 4) {
        isDragging = true;
        dragStartX = x;
        dragStartY = y;
        dragStartCell = cell;
        e.preventDefault();
    }
}

function handleMouseMove(e) {
    // Just for drag detection
}

function handleMouseUp(e) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    const direction = getDragDirection(dragStartX, dragStartY, endX, endY);
    if (direction && dragStartCell) {
        moveBall(dragStartCell.row, dragStartCell.col, direction);
    }
    
    isDragging = false;
    dragStartCell = null;
}

function getCellFromPosition(x, y) {
    if (!currentLevel) return null;
    
    const width = currentLevel.puzzle_info.grid_width;
    const height = currentLevel.puzzle_info.grid_height;
    const cellSize = Math.min(80, (canvas.width - 40) / width, (canvas.height - 180) / height);
    const startX = (canvas.width - width * cellSize) / 2;
    const startY = 80;
    
    const col = Math.floor((x - startX) / cellSize);
    const row = Math.floor((y - startY) / cellSize);
    
    if (row >= 0 && row < height && col >= 0 && col < width) {
        return { row, col };
    }
    return null;
}

function getDragDirection(startX, startY, endX, endY) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const minDistance = 30;
    
    if (Math.abs(deltaX) < minDistance && Math.abs(deltaY) < minDistance) {
        return null;
    }
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'right' : 'left';
    } else {
        return deltaY > 0 ? 'down' : 'up';
    }
}

function moveBall(row, col, direction) {
    const ballValue = gridData[row][col];
    const width = currentLevel.puzzle_info.grid_width;
    const height = currentLevel.puzzle_info.grid_height;
    
    const deltas = {
        'up': [-1, 0], 'down': [1, 0],
        'left': [0, -1], 'right': [0, 1]
    };
    
    const [deltaRow, deltaCol] = deltas[direction];
    let newRow = row, newCol = col;
    
    // Clear starting position
    gridData[row][col] = 0;
    
    // Move until hitting obstacle
    while (true) {
        const nextRow = newRow + deltaRow;
        const nextCol = newCol + deltaCol;
        
        if (nextRow < 0 || nextRow >= height || nextCol < 0 || nextCol >= width) {
            break; // Hit boundary
        }
        
        if (gridData[nextRow][nextCol] !== 0) {
            break; // Hit obstacle
        }
        
        newRow = nextRow;
        newCol = nextCol;
    }
    
    // Start animation instead of instant placement
    animatingBall = {
        value: ballValue,
        startRow: row,
        startCol: col,
        endRow: newRow,
        endCol: newCol
    };
    
    animationStartTime = Date.now();
    animateBallMovement();
}

function checkWin() {
    if (!targetData || !gridData) return;
    
    const width = currentLevel.puzzle_info.grid_width;
    const height = currentLevel.puzzle_info.grid_height;
    
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (gridData[row][col] !== targetData[row][col]) {
                return;
            }
        }
    }
    
    // Level completed!
    completionMoves = moveCount;
    levelCompletePopupActive = true;
    drawGame();
}

// Animate ball movement
function animateBallMovement() {
    if (!animatingBall) return;
    
    const currentTime = Date.now();
    const elapsed = currentTime - animationStartTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    
    // Easing function for smooth animation
    const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    
    if (progress >= 1) {
        // Animation complete - place ball at final position
        gridData[animatingBall.endRow][animatingBall.endCol] = animatingBall.value;
        animatingBall = null;
        
        // Increment move counter and update display
        moveCount++;
        updateScoreDisplay();
        
        // Check win condition
        checkWin();
    }
    
    // Redraw game with current animation state
    drawGame();
    
    // Continue animation if not complete
    if (progress < 1) {
        requestAnimationFrame(animateBallMovement);
    }
}

// Update score display to show moves
function updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = moveCount;
    }
}

// Initialize when loaded
document.addEventListener('DOMContentLoaded', initGame);