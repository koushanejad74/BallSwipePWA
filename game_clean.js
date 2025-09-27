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
let helpPopupActive = false; // Track if help popup is shown
let bonusHintPopupActive = false; // Track if bonus hint popup is shown
let noHintsPopupActive = false; // Track if no hints popup is shown
let pendingBonusHint = false; // Track if bonus hint popup should show after level completion
let completionMoves = 0; // Store moves taken when level completed

// Level selector pagination
let currentLevelPage = 0; // Current page (0-based)
let levelSelectorNavigating = false; // Prevent rapid navigation clicks
let challengeModeActive = false; // Track if we're in challenge mode

// Hint system
let hintPopupActive = false; // Track if hint popup is shown
let currentHintStep = 0; // Current step in the hint sequence
let hintModeActive = false; // Track if we're in hint mode
let originalGameState = null; // Store original state to restore
let availableHints = 3; // Number of hints available to user
let puzzlesSolved = 0; // Track completed puzzles for hint rewards

// Animation variables
let animatingBall = null; // Currently animating ball
let animationStartTime = 0;
let animationDuration = 300; // Animation duration in milliseconds

// Initialize game
// Calculate current grid layout - used by both drawing and interaction
function getCurrentGridLayout() {
    if (!currentLevel) return null;
    
    const width = currentLevel.puzzle_info.grid_width;
    const height = currentLevel.puzzle_info.grid_height;
    
    // Use same calculation as drawGame() for consistency
    const availableWidth = canvas.width - 40; // 20px padding on each side
    const availableHeight = canvas.height - 160; // Leave space for title and buttons
    const maxCellSize = 90; // Maximum cell size for good visibility
    const cellSize = Math.min(maxCellSize, availableWidth / width, availableHeight / height);
    const startX = (canvas.width - width * cellSize) / 2;
    const startY = 75;
    
    return { width, height, cellSize, startX, startY };
}

function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set responsive canvas size
    resizeCanvas();
    
    console.log('Canvas initialized');
    
    // Add resize listener
    window.addEventListener('resize', () => {
        resizeCanvas();
        // Redraw current state
        if (currentLevel && gridData) {
            drawGame();
        }
    });
    
    // Add orientation change listener for mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            resizeCanvas();
            if (currentLevel && gridData) {
                drawGame();
            }
        }, 100);
    });
    
    // Load first level
    loadLevel(currentLevelNumber);
}

function resizeCanvas() {
    // Calculate responsive canvas size
    const container = document.getElementById('app');
    const containerWidth = container.clientWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate optimal dimensions with some padding
    const maxWidth = Math.min(400, containerWidth - 40); // Max 400px width, 40px padding
    const maxHeight = Math.min(600, windowHeight - 200); // Leave room for UI elements
    
    // Maintain aspect ratio of 7:10 (width:height)
    const aspectRatio = 0.7;
    let canvasWidth = maxWidth;
    let canvasHeight = maxWidth / aspectRatio;
    
    // If height exceeds maximum, adjust based on height
    if (canvasHeight > maxHeight) {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
    }
    
    // Ensure minimum size for playability
    canvasWidth = Math.max(280, canvasWidth);
    canvasHeight = Math.max(400, canvasHeight);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    console.log(`Canvas resized to: ${canvasWidth}x${canvasHeight}`);
}

// Load a random challenging level
function loadRandomChallengingLevel() {
    const randomLevelNumber = Math.floor(Math.random() * 100) + 1;
    const paddedNumber = randomLevelNumber.toString().padStart(3, '0');
    const levelPath = `RandomLevels/Level${paddedNumber}.json`;
    
    console.log(`Loading random challenging level: ${levelPath}`);
    
    fetch(levelPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load level: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            currentLevel = data;
            currentLevelNumber = randomLevelNumber; // For display purposes
            challengeModeActive = true; // Enable challenge mode
            
            // Reset game state
            moveCount = 0;
            levelStartPopupActive = true;
            levelCompletePopupActive = false;
            helpPopupActive = false;
            hintPopupActive = false;
            bonusHintPopupActive = false;
            noHintsPopupActive = false;
            pendingBonusHint = false;
            animatingBall = null;
            
            // Clear hint mode if active
            if (hintModeActive) {
                exitHintMode();
            }
            
            // Parse the initial state
            if (currentLevel.solution_path && currentLevel.solution_path.length > 0) {
                parseGridState(currentLevel.solution_path[0]);
            }
            
            // Parse target state from the last step
            if (currentLevel.solution_path && currentLevel.solution_path.length > 1) {
                parseTargetState(currentLevel.solution_path[currentLevel.solution_path.length - 1]);
            }
            
            drawGame();
        })
        .catch(error => {
            console.error('Error loading random challenging level:', error);
            // Fallback to a regular level if random level fails
            challengeModeActive = false;
            loadLevel(1);
        });
}

// Load level (modified to handle both regular and challenge modes) from JSON
async function loadLevel(levelNumber) {
    challengeModeActive = false; // Exit challenge mode when loading regular level
    try {
        const levelFileName = `Level${levelNumber.toString().padStart(3, '0')}.json`;
        console.log(`Loading ${levelFileName}...`);
        console.log('Window location:', window.location.href);
        
        // Use absolute path from root to ensure it works on mobile
        const response = await fetch(`./levels/${levelFileName}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Fetch response status:', response.status);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
        currentLevel = await response.json();
        currentLevelNumber = levelNumber;
        
        // Parse starting state and target
        parseGridState(currentLevel.solution_path[0]);
        parseTargetState(currentLevel.solution_path[currentLevel.solution_path.length - 1]);
        
        // Reset move counter
        moveCount = 0;
        updateScoreDisplay();
        
        // Reset hint system
        currentHintStep = 0;
        hintPopupActive = false;
        hintModeActive = false;
        originalGameState = null;
        
        // Load hint progress from localStorage
        loadHintProgress();
        hintPopupActive = false;
        
        // Show level start popup
        levelStartPopupActive = true;
        bonusHintPopupActive = false;
        noHintsPopupActive = false;
        pendingBonusHint = false;
        
        console.log('Level loaded successfully');
        
        // Setup events and draw
        setupEvents();
        drawGame();
        
    } catch (error) {
        console.error('Failed to load level:', error);
        console.error('Level file path:', `./levels/${levelFileName}`);
        console.error('Current URL:', window.location.href);
        
        // Show an error message instead of test grid
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading Level...', canvas.width / 2, canvas.height / 2);
        ctx.font = '14px Arial';
        ctx.fillText('Please wait or refresh if stuck', canvas.width / 2, canvas.height / 2 + 30);
        
        // Retry after a short delay
        setTimeout(() => {
            console.log('Retrying level load...');
            loadLevel(levelNumber);
        }, 2000);
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
    
    const layout = getCurrentGridLayout();
    if (!layout) return;
    
    // Title - responsive font size
    ctx.fillStyle = '#333';
    const titleFontSize = Math.max(16, Math.min(24, canvas.width / 15));
    const subtitleFontSize = Math.max(12, Math.min(16, canvas.width / 22));
    
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${currentLevelNumber}`, canvas.width / 2, 35);
    
    ctx.font = `${subtitleFontSize}px Arial`;
    ctx.fillText('Drag balls to move them!', canvas.width / 2, 60);
    
    // Draw grid lines
    drawGridLines(layout.startX, layout.startY, layout.width, layout.height, layout.cellSize);
    
    // Draw grid content (balls, walls, targets)
    for (let row = 0; row < layout.height; row++) {
        for (let col = 0; col < layout.width; col++) {
            const x = layout.startX + col * layout.cellSize;
            const y = layout.startY + row * layout.cellSize;
            const value = gridData[row][col];
            const targetValue = targetData ? targetData[row][col] : 0;
            
            // Draw cell content
            drawCellContent(x, y, layout.cellSize, value, targetValue, row, col);
        }
    }
    
    // Draw icon buttons
    drawIconButtons(layout.startX, layout.startY + layout.height * layout.cellSize + 20, layout.width * layout.cellSize);
    
    // Draw level start popup if active
    if (levelStartPopupActive) {
        drawLevelStartPopup();
    }
    
    // Draw level complete popup if active
    if (levelCompletePopupActive) {
        drawLevelCompletePopup();
    }
    
    // Draw bonus hint popup if active
    if (bonusHintPopupActive) {
        drawBonusHintPopup();
    }
    
    // Draw no hints popup if active
    if (noHintsPopupActive) {
        drawNoHintsPopup();
    }
    
    // Draw help popup if active
    if (helpPopupActive) {
        drawHelpPopup();
    }
    
    // Draw hint popup if active
    if (hintPopupActive) {
        drawHintPopup();
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
    
    if (currentLevelNumber === 100) {
        ctx.fillText('� GAME COMPLETE! 🏆', popupX + popupWidth/2, popupY + 20);
    } else {
        ctx.fillText('�🎉 Congratulations! 🎉', popupX + popupWidth/2, popupY + 20);
    }
    
    // Level completed text
    ctx.fillStyle = '#2c3e50';
    ctx.font = '18px Arial';
    
    if (currentLevelNumber === 100) {
        ctx.fillText('You completed ALL 100 levels!', popupX + popupWidth/2, popupY + 55);
        ctx.fillText('🎮 Master Puzzle Solver! 🎮', popupX + popupWidth/2, popupY + 78);
    } else {
        ctx.fillText(`Level ${currentLevelNumber} Complete!`, popupX + popupWidth/2, popupY + 55);
    }
    
    // Moves taken text
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '16px Arial';
    const minMoves = currentLevel.solution_path.length - 1;
    const movesText = completionMoves === minMoves ? 
        `Perfect! Solved in ${completionMoves} moves! ⭐` : 
        `You solved it in ${completionMoves} moves`;
    
    const movesY = currentLevelNumber === 100 ? popupY + 105 : popupY + 80;
    ctx.fillText(movesText, popupX + popupWidth/2, movesY);
    
    // Buttons
    const buttonWidth = 100;
    const buttonHeight = 35;
    const buttonsY = popupY + popupHeight - 50;
    
    // Next Level button (if not last level or in challenge mode)
    if (currentLevelNumber < 100 || challengeModeActive) {
        const nextButtonX = popupX + popupWidth/2 - buttonWidth - 5;
        ctx.fillStyle = '#3498db';
        drawRoundedRect(nextButtonX, buttonsY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textBaseline = 'middle';
        const buttonText = challengeModeActive ? 'Next Challenge' : 'Next Level';
        ctx.fillText(buttonText, nextButtonX + buttonWidth/2, buttonsY + buttonHeight/2);
    }
    
    // Replay button
    const replayButtonX = (currentLevelNumber < 100 || challengeModeActive) ? 
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

// Draw bonus hint popup
function drawBonusHintPopup() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Popup box
    const popupWidth = 300;
    const popupHeight = 180;
    const popupX = (canvas.width - popupWidth) / 2;
    const popupY = (canvas.height - popupHeight) / 2;
    const cornerRadius = 12;
    
    // Background
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 3;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.stroke();
    
    // Celebration icon and title
    ctx.fillStyle = '#27ae60';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉', popupX + popupWidth/2, popupY + 40);
    
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#2c3e50';
    ctx.fillText('Bonus Hint Earned!', popupX + popupWidth/2, popupY + 75);
    
    // Progress info
    ctx.font = '16px Arial';
    ctx.fillStyle = '#7f8c8d';
    ctx.fillText(`Puzzles solved: ${puzzlesSolved}`, popupX + popupWidth/2, popupY + 100);
    ctx.fillText(`Total hints: ${availableHints}`, popupX + popupWidth/2, popupY + 120);
    
    // Continue button
    const buttonWidth = 120;
    const buttonHeight = 35;
    const buttonX = popupX + (popupWidth - buttonWidth) / 2;
    const buttonY = popupY + popupHeight - 50;
    
    ctx.fillStyle = '#27ae60';
    drawRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Awesome!', buttonX + buttonWidth/2, buttonY + buttonHeight/2);
}

// Draw no hints popup
function drawNoHintsPopup() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Popup box
    const popupWidth = 320;
    const popupHeight = 200;
    const popupX = (canvas.width - popupWidth) / 2;
    const popupY = (canvas.height - popupHeight) / 2;
    const cornerRadius = 12;
    
    // Background
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.stroke();
    
    // Icon and title
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚫', popupX + popupWidth/2, popupY + 45);
    
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#2c3e50';
    ctx.fillText('No Hints Available!', popupX + popupWidth/2, popupY + 80);
    
    // Progress info
    const hintsNeeded = 5 - (puzzlesSolved % 5);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#7f8c8d';
    ctx.fillText(`Puzzles solved: ${puzzlesSolved}`, popupX + popupWidth/2, popupY + 110);
    ctx.fillText(`Solve ${hintsNeeded} more to earn a hint`, popupX + popupWidth/2, popupY + 130);
    
    // Continue button
    const buttonWidth = 120;
    const buttonHeight = 35;
    const buttonX = popupX + (popupWidth - buttonWidth) / 2;
    const buttonY = popupY + popupHeight - 50;
    
    ctx.fillStyle = '#95a5a6';
    drawRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OK', buttonX + buttonWidth/2, buttonY + buttonHeight/2);
}

// Draw icon buttons (Restart, Levels, Hint, Help) - responsive
function drawIconButtons(startX, buttonY, gridWidth) {
    const buttonSize = Math.max(45, Math.min(55, canvas.height / 12)); // Responsive size
    const buttonYPos = buttonY + 15; // Move buttons down a bit more
    
    // Calculate positions for 4 buttons evenly distributed
    const spacing = (gridWidth - 4 * buttonSize) / 3; // Space between buttons
    const restartX = startX;
    const levelsX = startX + buttonSize + spacing;
    const hintX = startX + 2 * (buttonSize + spacing);
    const helpX = startX + 3 * (buttonSize + spacing);
    
    // Button colors
    const restartColor = '#FF9800';
    const levelsColor = '#2196F3';
    const hintColor = '#F39C12';
    const helpColor = '#9C27B0';
    
    // Restart Level button (🔄)
    ctx.fillStyle = restartColor;
    drawRoundedRect(restartX, buttonYPos, buttonSize, buttonSize, 12);
    ctx.fill();
    
    // Restart icon
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(buttonSize * 0.5)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄', restartX + buttonSize/2, buttonYPos + buttonSize/2);
    
    // Levels button (📋)
    ctx.fillStyle = levelsColor;
    drawRoundedRect(levelsX, buttonYPos, buttonSize, buttonSize, 12);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.fillText('📋', levelsX + buttonSize/2, buttonYPos + buttonSize/2);
    
    // Hint button (💡 or ▶️) with hint count
    ctx.fillStyle = hintColor;
    drawRoundedRect(hintX, buttonYPos, buttonSize, buttonSize, 12);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    const hintIcon = hintModeActive ? '▶️' : '💡';
    const iconSize = Math.floor(buttonSize * 0.4);
    ctx.font = `${iconSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hintIcon, hintX + buttonSize/2, buttonYPos + buttonSize/2);
    
    // Show hint count in a circular badge on top-right corner
    if (!hintModeActive && availableHints >= 0) {
        const badgeRadius = 10;
        const badgeX = hintX + buttonSize - badgeRadius + 3; // Move right
        const badgeY = buttonYPos + badgeRadius - 3; // Move up
        
        // Draw white circle with black border
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Black border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Hint count text
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(availableHints.toString(), badgeX, badgeY);
    }
    
    // Help button (❓)
    ctx.fillStyle = helpColor;
    drawRoundedRect(helpX, buttonYPos, buttonSize, buttonSize, 12);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.fillText('❓', helpX + buttonSize/2, buttonYPos + buttonSize/2);
}

// Draw help popup
function drawHelpPopup() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Popup dimensions
    const popupWidth = Math.min(320, canvas.width - 40);
    const popupHeight = Math.min(280, canvas.height - 80);
    const popupX = (canvas.width - popupWidth) / 2;
    const popupY = (canvas.height - popupHeight) / 2;
    
    // Popup background
    ctx.fillStyle = '#8e44ad'; // Purple background
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, 15);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#732d91';
    ctx.lineWidth = 3;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, 15);
    ctx.stroke();
    
    // Title
    ctx.fillStyle = '#ffffff';
    const titleFontSize = Math.max(18, Math.min(26, canvas.width / 15)); // Bigger title
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('❓ How to Play', popupX + popupWidth/2, popupY + 20);
    
    // Instructions
    const bodyFontSize = Math.max(13, Math.min(17, canvas.width / 22)); // Bigger body text
    ctx.font = `${bodyFontSize}px Arial`;
    ctx.fillStyle = '#f8f9fa';
    const lineSpacing = bodyFontSize + 6; // Adjust spacing for larger text
    let currentY = popupY + 65; // More space after larger title
    
    const instructions = [
        '🎯 Drag colored balls to move them',
        '🔄 Balls slide until they hit an obstacle',
        '⭕ Get each ball to its target circle',
        '🏆 Complete all targets to win!',
        '🎮 Use buttons below to navigate'
    ];
    
    instructions.forEach((instruction, index) => {
        ctx.fillText(instruction, popupX + popupWidth/2, currentY + (index * lineSpacing));
    });
    
    // Close button
    const buttonWidth = 120;
    const buttonHeight = 35;
    const buttonX = popupX + (popupWidth - buttonWidth) / 2;
    const buttonY = popupY + popupHeight - 55;
    
    ctx.fillStyle = '#e74c3c';
    drawRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 14px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // Center vertically in button
    ctx.fillText('Close', buttonX + buttonWidth/2, buttonY + buttonHeight/2);
}

// Draw instructions below buttons - responsive with expanded content
function drawInstructions(startX, instructionsY, gridWidth) {
    // Make box wider than the grid - 110% of grid width and center it
    const boxWidth = gridWidth * 1.1;
    const boxStartX = startX - (boxWidth - gridWidth) / 2; // Center the wider box
    const boxHeight = Math.max(120, Math.min(160, canvas.height / 5)); // Expanded height
    const cornerRadius = 8;
    
    // Responsive font sizes
    const titleFontSize = Math.max(14, Math.min(20, canvas.width / 20));
    const bodyFontSize = Math.max(10, Math.min(14, canvas.width / 28));
    
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
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('How to Play:', boxStartX + boxWidth/2, instructionsY + 12);
    
    // Multi-line instruction text
    ctx.font = `${bodyFontSize}px Arial`;
    ctx.fillStyle = '#f8f9fa'; // Light color for body text
    const lineSpacing = bodyFontSize + 3;
    let currentY = instructionsY + 32 + titleFontSize;
    
    const instructions = [
        '🎯 Drag colored balls to move them',
        '🔄 Balls slide until they hit an obstacle',
        '⭕ Get each ball to its target circle',
        '🏆 Complete all targets to win!',
        '🎮 Use "Restart Level" or "Levels" buttons'
    ];
    
    instructions.forEach((instruction, index) => {
        ctx.fillText(instruction, boxStartX + boxWidth/2, currentY + (index * lineSpacing));
    });
}

// Draw hint popup
function drawHintPopup() {
    const popupWidth = Math.min(350, canvas.width - 40);
    const popupHeight = Math.min(400, canvas.height - 80);
    const popupX = (canvas.width - popupWidth) / 2;
    const popupY = (canvas.height - popupHeight) / 2;
    const cornerRadius = 12;
    
    // Background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Popup background
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.fill();
    
    // Popup border
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.stroke();
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Level ${currentLevelNumber} - Hints`, popupX + popupWidth/2, popupY + 20);
    
    if (currentLevel && currentLevel.solution_path) {
        const steps = generateSolutionSteps();
        const totalSteps = steps.length;
        
        // Step counter
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '16px Arial';
        ctx.fillText(`Step ${currentHintStep + 1} of ${totalSteps}`, popupX + popupWidth/2, popupY + 55);
        
        // Current step instruction
        if (steps[currentHintStep]) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            
            const instruction = steps[currentHintStep];
            const words = instruction.split(' ');
            let line = '';
            let y = popupY + 100;
            const lineHeight = 25;
            const maxWidth = popupWidth - 40;
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line, popupX + popupWidth/2, y);
                    line = words[i] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, popupX + popupWidth/2, y);
        }
        
        // Navigation buttons
        const buttonWidth = 80;
        const buttonHeight = 35;
        const buttonY = popupY + popupHeight - 100;
        
        // Previous step button
        if (currentHintStep > 0) {
            ctx.fillStyle = '#95a5a6';
            const prevX = popupX + 30;
            drawRoundedRect(prevX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('◀ Previous', prevX + buttonWidth/2, buttonY + buttonHeight/2);
        }
        
        // Next step button
        if (currentHintStep < totalSteps - 1) {
            ctx.fillStyle = '#3498db';
            const nextX = popupX + popupWidth - buttonWidth - 30;
            drawRoundedRect(nextX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Next ▶', nextX + buttonWidth/2, buttonY + buttonHeight/2);
        }
        
        // Show all steps button
        ctx.fillStyle = '#27ae60';
        const showAllX = popupX + (popupWidth - buttonWidth) / 2;
        const showAllY = buttonY + 45;
        drawRoundedRect(showAllX, showAllY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('Show All', showAllX + buttonWidth/2, showAllY + buttonHeight/2);
    }
    
    // Close button - top right corner
    const closeButtonSize = 30;
    const closeButtonX = popupX + popupWidth - closeButtonSize - 15;
    const closeButtonY = popupY + 15;
    
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(closeButtonX + closeButtonSize/2, closeButtonY + closeButtonSize/2, closeButtonSize/2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw X inside
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const crossSize = closeButtonSize * 0.4;
    const centerX = closeButtonX + closeButtonSize/2;
    const centerY = closeButtonY + closeButtonSize/2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize/2, centerY - crossSize/2);
    ctx.lineTo(centerX + crossSize/2, centerY + crossSize/2);
    ctx.moveTo(centerX + crossSize/2, centerY - crossSize/2);
    ctx.lineTo(centerX - crossSize/2, centerY + crossSize/2);
    ctx.stroke();
}

// Generate solution steps by comparing consecutive states
function generateSolutionSteps() {
    if (!currentLevel || !currentLevel.solution_path) return [];
    
    const steps = [];
    const states = currentLevel.solution_path;
    
    for (let i = 1; i < states.length; i++) {
        const prevState = states[i - 1];
        const currentState = states[i];
        const instruction = compareStatesForInstruction(prevState, currentState);
        if (instruction) {
            steps.push(instruction);
        }
    }
    
    return steps;
}

// Compare two game states to generate move instruction
function compareStatesForInstruction(prevState, currentState) {
    const gridWidth = currentLevel.puzzle_info.grid_width;
    
    // Find what changed between states
    for (let i = 0; i < prevState.length; i++) {
        const prevValue = parseInt(prevState[i]);
        const currentValue = parseInt(currentState[i]);
        
        // Ball disappeared from this position
        if (prevValue >= 2 && prevValue <= 4 && currentValue !== prevValue) {
            const fromRow = Math.floor(i / gridWidth);
            const fromCol = i % gridWidth;
            
            // Find where this ball went
            for (let j = 0; j < currentState.length; j++) {
                const newValue = parseInt(currentState[j]);
                const oldValue = parseInt(prevState[j]);
                
                if (newValue === prevValue && oldValue !== newValue) {
                    const toRow = Math.floor(j / gridWidth);
                    const toCol = j % gridWidth;
                    
                    const ballColor = getBallColorName(prevValue);
                    const direction = getDirection(fromRow, fromCol, toRow, toCol);
                    
                    return `Move ${ballColor} ball ${direction}`;
                }
            }
        }
    }
    
    return 'Make a move';
}

// Get ball color name from value
function getBallColorName(value) {
    switch (value) {
        case 2: return 'red';
        case 3: return 'green';
        case 4: return 'blue';
        default: return 'ball';
    }
}

// Get direction from movement
function getDirection(fromRow, fromCol, toRow, toCol) {
    if (toRow < fromRow) return 'up';
    if (toRow > fromRow) return 'down';
    if (toCol < fromCol) return 'left';
    if (toCol > fromCol) return 'right';
    return 'to new position';
}

// Show all hints in alert dialog
function showAllHints() {
    if (!currentLevel || !currentLevel.solution_path) return;
    
    const steps = generateSolutionSteps();
    let message = `Complete Solution for Level ${currentLevelNumber}:\n\n`;
    
    steps.forEach((step, index) => {
        message += `${index + 1}. ${step}\n`;
    });
    
    message += `\nTotal steps: ${steps.length}`;
    
    alert(message);
}

// Start hint mode - reset to initial state
function startHintMode() {
    if (!currentLevel || !currentLevel.solution_path) return;
    
    // Check if user has hints available
    if (availableHints <= 0) {
        noHintsPopupActive = true;
        drawGame();
        return;
    }
    
    console.log('Starting hint mode...');
    
    // Consume one hint
    availableHints--;
    saveHintProgress();
    console.log(`Hint used. Remaining hints: ${availableHints}`);
    
    // Clear any active popups or animations
    levelStartPopupActive = false;
    levelCompletePopupActive = false;
    helpPopupActive = false;
    hintPopupActive = false;
    bonusHintPopupActive = false;
    noHintsPopupActive = false;
    pendingBonusHint = false;
    animatingBall = null;
    
    // Store current game state (make a deep copy)
    originalGameState = [];
    if (gridData) {
        for (let i = 0; i < gridData.length; i++) {
            originalGameState[i] = [...gridData[i]];
        }
    }
    
    // Enter hint mode
    hintModeActive = true;
    currentHintStep = 0;
    
    // Reset to initial state - force parse
    const initialState = currentLevel.solution_path[0];
    console.log('Resetting to initial state:', initialState);
    parseGridState(initialState);
    
    // Force redraw
    drawGame();
}

// Play next hint step
function playNextHintStep() {
    if (!currentLevel || !currentLevel.solution_path || !hintModeActive) return;
    
    const totalSteps = currentLevel.solution_path.length - 1;
    console.log(`Playing hint step ${currentHintStep + 1} of ${totalSteps}`);
    
    if (currentHintStep < totalSteps) {
        currentHintStep++;
        // Apply the next state
        const nextState = currentLevel.solution_path[currentHintStep];
        console.log('Applying state:', nextState);
        parseGridState(nextState);
        drawGame();
        
        // Check if we've reached the end
        if (currentHintStep >= totalSteps) {
            console.log('Solution complete, will exit hint mode');
            // Solution complete - exit hint mode after a delay
            setTimeout(() => {
                exitHintMode();
            }, 1500);
        }
    }
}

// Exit hint mode and restore original state
function exitHintMode() {
    if (!hintModeActive) return;
    
    console.log('Exiting hint mode...');
    
    hintModeActive = false;
    currentHintStep = 0;
    
    // Restore original game state if available
    if (originalGameState && originalGameState.length > 0) {
        console.log('Restoring original state');
        gridData = [];
        for (let i = 0; i < originalGameState.length; i++) {
            gridData[i] = [...originalGameState[i]];
        }
        originalGameState = null;
    } else {
        // Fallback: reload the level to initial state
        console.log('Fallback: reloading level to initial state');
        parseGridState(currentLevel.solution_path[0]);
    }
    
    drawGame();
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
        const radius = Math.min(size * 0.42, 26); // Increased from 0.35 to 0.42 for white border
        
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
        
        // Use consistent grid layout calculation
        const layout = getCurrentGridLayout();
        if (!layout) return;
        
        const fromX = layout.startX + animatingBall.startCol * layout.cellSize + layout.cellSize / 2;
        const fromY = layout.startY + animatingBall.startRow * layout.cellSize + layout.cellSize / 2;
        const toX = layout.startX + animatingBall.endCol * layout.cellSize + layout.cellSize / 2;
        const toY = layout.startY + animatingBall.endRow * layout.cellSize + layout.cellSize / 2;
        
        const currentX = fromX + (toX - fromX) * easeProgress;
        const currentY = fromY + (toY - fromY) * easeProgress;
        
        // Draw animating ball
        const radius = Math.min(layout.cellSize * 0.3, 20);
        
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

// Show level selector with pagination
function showLevelSelector() {
    // Create a simple level selector overlay with solid background
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Select Level', canvas.width / 2, 40);
    
    // Close button - top right corner with close icon
    const closeButtonSize = 30;
    const closeButtonX = canvas.width - closeButtonSize - 15;
    const closeButtonY = 15;
    
    // Draw circle background
    ctx.fillStyle = '#f44336';
    ctx.beginPath();
    ctx.arc(closeButtonX + closeButtonSize/2, closeButtonY + closeButtonSize/2, closeButtonSize/2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw X (cross) inside
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const crossSize = closeButtonSize * 0.4;
    const centerX = closeButtonX + closeButtonSize/2;
    const centerY = closeButtonY + closeButtonSize/2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize/2, centerY - crossSize/2);
    ctx.lineTo(centerX + crossSize/2, centerY + crossSize/2);
    ctx.moveTo(centerX + crossSize/2, centerY - crossSize/2);
    ctx.lineTo(centerX - crossSize/2, centerY + crossSize/2);
    ctx.stroke();
    
    // Calculate pagination
    const levelsPerPage = 25;
    const totalPages = Math.ceil(100 / levelsPerPage); // 4 pages total
    const startLevel = currentLevelPage * levelsPerPage + 1;
    const endLevel = Math.min((currentLevelPage + 1) * levelsPerPage, 100);
    
    // Show page info
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.fillText(`Page ${currentLevelPage + 1} of ${totalPages} (Levels ${startLevel}-${endLevel})`, canvas.width / 2, 65);
    
    // Draw level buttons for current page
    const levelsPerRow = 5; // Show 5 levels per row
    const buttonSize = Math.min(50, (canvas.width - 80) / levelsPerRow); // Responsive button size
    const spacing = 8;
    const totalWidth = levelsPerRow * buttonSize + (levelsPerRow - 1) * spacing;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = 90;
    
    for (let i = startLevel; i <= endLevel; i++) {
        const levelIndex = i - startLevel; // 0-24 for current page
        const row = Math.floor(levelIndex / levelsPerRow);
        const col = levelIndex % levelsPerRow;
        
        const x = startX + col * (buttonSize + spacing);
        const y = startY + row * (buttonSize + spacing);
        
        // Button background
        ctx.fillStyle = i === currentLevelNumber ? '#4CAF50' : '#2196F3';
        drawRoundedRect(x, y, buttonSize, buttonSize, 8);
        ctx.fill();
        
        // Level number
        ctx.fillStyle = '#fff';
        const fontSize = Math.max(12, Math.min(16, buttonSize / 3.5));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i.toString(), x + buttonSize/2, y + buttonSize/2);
    }
    
        // Navigation buttons - moved up for better positioning
    const navButtonWidth = 80;
    const navButtonHeight = 35;
    const navButtonY = startY + 5 * (buttonSize + spacing) + 20;
    const buttonSpacing = 5;
    const totalButtonsWidth = navButtonWidth * 3 + buttonSpacing * 2; // 3 buttons with spacing
    const startButtonX = (canvas.width - totalButtonsWidth) / 2;
    
    // Previous button
    if (currentLevelPage > 0) {
        ctx.fillStyle = '#9E9E9E';
        const prevX = startButtonX;
        drawRoundedRect(prevX, navButtonY, navButtonWidth, navButtonHeight, 8);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u25c0 Prev', prevX + navButtonWidth/2, navButtonY + navButtonHeight/2);
    }
    
    // Challenge button (always visible in the middle)
    const challengeX = startButtonX + navButtonWidth + buttonSpacing;
    ctx.fillStyle = '#FF5722'; // Orange color to stand out
    drawRoundedRect(challengeX, navButtonY, navButtonWidth, navButtonHeight, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Challenge', challengeX + navButtonWidth/2, navButtonY + navButtonHeight/2);
    
    // Next button
    if (currentLevelPage < totalPages - 1) {
        ctx.fillStyle = '#9E9E9E';
        const nextX = startButtonX + navButtonWidth * 2 + buttonSpacing * 2;
        drawRoundedRect(nextX, navButtonY, navButtonWidth, navButtonHeight, 8);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Next \u25b6', nextX + navButtonWidth/2, navButtonY + navButtonHeight/2);
    }
    
    // Set flag for level selector mode
    window.levelSelectorActive = true;
}

// Draw hint popup
function drawHintPopup() {
    const popupWidth = Math.min(350, canvas.width - 40);
    const popupHeight = Math.min(400, canvas.height - 80);
    const popupX = (canvas.width - popupWidth) / 2;
    const popupY = (canvas.height - popupHeight) / 2;
    const cornerRadius = 12;
    
    // Background overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Popup background
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.fill();
    
    // Popup border
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    drawRoundedRect(popupX, popupY, popupWidth, popupHeight, cornerRadius);
    ctx.stroke();
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Level ${currentLevelNumber} - Solution Steps`, popupX + popupWidth/2, popupY + 20);
    
    if (currentLevel && currentLevel.solution_path) {
        const steps = generateSolutionSteps();
        const totalSteps = steps.length;
        
        // Step counter
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '16px Arial';
        ctx.fillText(`Step ${currentHintStep + 1} of ${totalSteps}`, popupX + popupWidth/2, popupY + 55);
        
        // Current step instruction
        if (steps[currentHintStep]) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            
            const instruction = steps[currentHintStep];
            const words = instruction.split(' ');
            let line = '';
            let y = popupY + 100;
            const lineHeight = 25;
            const maxWidth = popupWidth - 40;
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && i > 0) {
                    ctx.fillText(line, popupX + popupWidth/2, y);
                    line = words[i] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, popupX + popupWidth/2, y);
        }
        
        // Navigation buttons
        const buttonWidth = 80;
        const buttonHeight = 35;
        const buttonY = popupY + popupHeight - 100;
        
        // Previous step button
        if (currentHintStep > 0) {
            ctx.fillStyle = '#95a5a6';
            const prevX = popupX + 30;
            drawRoundedRect(prevX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('◀ Previous', prevX + buttonWidth/2, buttonY + buttonHeight/2);
        }
        
        // Next step button
        if (currentHintStep < totalSteps - 1) {
            ctx.fillStyle = '#3498db';
            const nextX = popupX + popupWidth - buttonWidth - 30;
            drawRoundedRect(nextX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Next ▶', nextX + buttonWidth/2, buttonY + buttonHeight/2);
        }
        
        // Show all steps button
        ctx.fillStyle = '#27ae60';
        const showAllX = popupX + (popupWidth - buttonWidth) / 2;
        const showAllY = buttonY + 45;
        drawRoundedRect(showAllX, showAllY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('Show All', showAllX + buttonWidth/2, showAllY + buttonHeight/2);
    }
    
    // Close button - top right corner
    const closeButtonSize = 30;
    const closeButtonX = popupX + popupWidth - closeButtonSize - 15;
    const closeButtonY = popupY + 15;
    
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(closeButtonX + closeButtonSize/2, closeButtonY + closeButtonSize/2, closeButtonSize/2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw X inside
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const crossSize = closeButtonSize * 0.4;
    const centerX = closeButtonX + closeButtonSize/2;
    const centerY = closeButtonY + closeButtonSize/2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - crossSize/2, centerY - crossSize/2);
    ctx.lineTo(centerX + crossSize/2, centerY + crossSize/2);
    ctx.moveTo(centerX + crossSize/2, centerY - crossSize/2);
    ctx.lineTo(centerX - crossSize/2, centerY + crossSize/2);
    ctx.stroke();
}

// Generate solution steps by comparing consecutive states
function generateSolutionSteps() {
    if (!currentLevel || !currentLevel.solution_path) return [];
    
    const steps = [];
    const states = currentLevel.solution_path;
    
    for (let i = 1; i < states.length; i++) {
        const prevState = states[i - 1];
        const currentState = states[i];
        const instruction = compareStatesForInstruction(prevState, currentState);
        if (instruction) {
            steps.push(instruction);
        }
    }
    
    return steps;
}

// Compare two game states to generate move instruction
function compareStatesForInstruction(prevState, currentState) {
    const gridWidth = currentLevel.puzzle_info.grid_width;
    const gridHeight = currentLevel.puzzle_info.grid_height;
    
    // Find what changed between states
    for (let i = 0; i < prevState.length; i++) {
        const prevValue = parseInt(prevState[i]);
        const currentValue = parseInt(currentState[i]);
        
        // Ball disappeared from this position
        if (prevValue >= 2 && prevValue <= 4 && currentValue !== prevValue) {
            const fromRow = Math.floor(i / gridWidth);
            const fromCol = i % gridWidth;
            
            // Find where this ball went
            for (let j = 0; j < currentState.length; j++) {
                const newValue = parseInt(currentState[j]);
                const oldValue = parseInt(prevState[j]);
                
                if (newValue === prevValue && oldValue !== newValue) {
                    const toRow = Math.floor(j / gridWidth);
                    const toCol = j % gridWidth;
                    
                    const ballColor = getBallColorName(prevValue);
                    const direction = getDirection(fromRow, fromCol, toRow, toCol);
                    
                    return `Move ${ballColor} ball ${direction}`;
                }
            }
        }
    }
    
    return 'Make a move';
}

// Get ball color name from value
function getBallColorName(value) {
    switch (value) {
        case 2: return 'red';
        case 3: return 'green';
        case 4: return 'blue';
        default: return 'ball';
    }
}

// Get direction from movement
function getDirection(fromRow, fromCol, toRow, toCol) {
    if (toRow < fromRow) return 'up';
    if (toRow > fromRow) return 'down';
    if (toCol < fromCol) return 'left';
    if (toCol > fromCol) return 'right';
    return 'to new position';
}

// Handle level selector clicks with pagination
function handleLevelSelectorClick(x, y) {
    const levelsPerPage = 25;
    const levelsPerRow = 5;
    const buttonSize = Math.min(50, (canvas.width - 80) / levelsPerRow);
    const spacing = 8;
    const totalWidth = levelsPerRow * buttonSize + (levelsPerRow - 1) * spacing;
    const startX = (canvas.width - totalWidth) / 2;
    const startY = 90;
    
    const startLevel = currentLevelPage * levelsPerPage + 1;
    const endLevel = Math.min((currentLevelPage + 1) * levelsPerPage, 100);
    
    // Check level buttons
    for (let i = startLevel; i <= endLevel; i++) {
        const levelIndex = i - startLevel;
        const row = Math.floor(levelIndex / levelsPerRow);
        const col = levelIndex % levelsPerRow;
        
        const btnX = startX + col * (buttonSize + spacing);
        const btnY = startY + row * (buttonSize + spacing);
        
        if (x >= btnX && x <= btnX + buttonSize && 
            y >= btnY && y <= btnY + buttonSize) {
            currentLevelNumber = i;
            loadLevel(currentLevelNumber);
            window.levelSelectorActive = false;
            levelSelectorNavigating = false;
            return;
        }
    }
    
    // Navigation buttons - updated positions
    const navButtonWidth = 80;
    const navButtonHeight = 35;
    const navButtonY = startY + 5 * (buttonSize + spacing) + 20;
    const buttonSpacing = 5;
    const totalButtonsWidth = navButtonWidth * 3 + buttonSpacing * 2;
    const startButtonX = (canvas.width - totalButtonsWidth) / 2;
    const totalPages = Math.ceil(100 / levelsPerPage);
    
    // Previous button
    if (currentLevelPage > 0) {
        const prevX = startButtonX;
        if (x >= prevX && x <= prevX + navButtonWidth && 
            y >= navButtonY && y <= navButtonY + navButtonHeight) {
            if (!levelSelectorNavigating) {
                levelSelectorNavigating = true;
                currentLevelPage = Math.max(0, currentLevelPage - 1);
                console.log('Previous button clicked - going to page:', currentLevelPage);
                showLevelSelector();
                setTimeout(() => {
                    levelSelectorNavigating = false;
                }, 200);
            }
            return;
        }
    }
    
    // Challenge button (always check, positioned in the middle)
    const challengeX = startButtonX + navButtonWidth + buttonSpacing;
    if (x >= challengeX && x <= challengeX + navButtonWidth && 
        y >= navButtonY && y <= navButtonY + navButtonHeight) {
        console.log('Challenge button clicked');
        window.levelSelectorActive = false;
        levelSelectorNavigating = false;
        loadRandomChallengingLevel();
        return;
    }
    
    // Next button
    if (currentLevelPage < totalPages - 1) {
        const nextX = startButtonX + navButtonWidth * 2 + buttonSpacing * 2;
        if (x >= nextX && x <= nextX + navButtonWidth && 
            y >= navButtonY && y <= navButtonY + navButtonHeight) {
            if (!levelSelectorNavigating) {
                levelSelectorNavigating = true;
                currentLevelPage = Math.min(totalPages - 1, currentLevelPage + 1);
                console.log('Next button clicked - going to page:', currentLevelPage);
                showLevelSelector();
                setTimeout(() => {
                    levelSelectorNavigating = false;
                }, 200);
            }
            return;
        }
    }
    
    // Check close button - top right corner
    const closeButtonSize = 30;
    const closeButtonX = canvas.width - closeButtonSize - 15;
    const closeButtonY = 15;
    
    if (x >= closeButtonX && x <= closeButtonX + closeButtonSize && 
        y >= closeButtonY && y <= closeButtonY + closeButtonSize) {
        window.levelSelectorActive = false;
        levelSelectorNavigating = false;
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

// Enhanced event setup with proper touch support
function setupEvents() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleButtonClick);
    
    // Enhanced mobile touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        // Get coordinates accounting for canvas scaling
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        handleMouseDown({
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        });
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        // Handle touch move for better drag detection if needed
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        
        // Use the same coordinates for both mouseup and button click
        const fakeEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        };
        
        handleMouseUp(fakeEvent);
        
        // Only handle button clicks if not dragging
        if (!isDragging) {
            handleButtonClick(fakeEvent);
        }
    }, { passive: false });
}

function handleButtonClick(e) {
    if (isDragging) return; // Don't handle button clicks during drag
    
    const rect = canvas.getBoundingClientRect();
    
    // Account for canvas scaling when CSS resizes the canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
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
        
        // Check if click is inside popup
        if (x >= popupX && x <= popupX + popupWidth && 
            y >= popupY && y <= popupY + popupHeight) {
            
            // Next Level button (if not last level or in challenge mode)
            if (currentLevelNumber < 100 || challengeModeActive) {
                const nextButtonX = popupX + popupWidth/2 - buttonWidth - 5;
                if (x >= nextButtonX && x <= nextButtonX + buttonWidth && 
                    y >= buttonsY && y <= buttonsY + buttonHeight) {
                    levelCompletePopupActive = false;
                    if (challengeModeActive) {
                        // Load another random challenging level
                        loadRandomChallengingLevel();
                    } else {
                        // Regular progression to next level
                        currentLevelNumber++;
                        loadLevel(currentLevelNumber);
                    }
                    // Reset pending bonus hint when moving to next level
                    pendingBonusHint = false;
                    return;
                }
            }
            
            // Replay button
            const replayButtonX = currentLevelNumber < 100 ? 
                popupX + popupWidth/2 + 5 : 
                popupX + (popupWidth - buttonWidth) / 2;
            
            if (x >= replayButtonX && x <= replayButtonX + buttonWidth && 
                y >= buttonsY && y <= buttonsY + buttonHeight) {
                levelCompletePopupActive = false;
                if (challengeModeActive) {
                    // Replay the same random level
                    loadRandomChallengingLevel();
                } else {
                    // Replay the regular level
                    loadLevel(currentLevelNumber);
                }
                // Reset pending bonus hint when replaying level
                pendingBonusHint = false;
                return;
            }
        } else {
            // Clicked outside popup - dismiss and check for pending bonus hint
            levelCompletePopupActive = false;
            if (pendingBonusHint) {
                bonusHintPopupActive = true;
                pendingBonusHint = false;
                drawGame();
            }
            return;
        }
        return;
    }
    
    // Check if bonus hint popup is active
    if (bonusHintPopupActive) {
        const popupWidth = 300;
        const popupHeight = 180;
        const popupX = (canvas.width - popupWidth) / 2;
        const popupY = (canvas.height - popupHeight) / 2;
        
        const buttonWidth = 120;
        const buttonHeight = 35;
        const buttonX = popupX + (popupWidth - buttonWidth) / 2;
        const buttonY = popupY + popupHeight - 50;
        
        if (x >= buttonX && x <= buttonX + buttonWidth && 
            y >= buttonY && y <= buttonY + buttonHeight) {
            bonusHintPopupActive = false;
            drawGame();
        }
        return;
    }
    
    // Check if no hints popup is active
    if (noHintsPopupActive) {
        const popupWidth = 320;
        const popupHeight = 200;
        const popupX = (canvas.width - popupWidth) / 2;
        const popupY = (canvas.height - popupHeight) / 2;
        
        const buttonWidth = 120;
        const buttonHeight = 35;
        const buttonX = popupX + (popupWidth - buttonWidth) / 2;
        const buttonY = popupY + popupHeight - 50;
        
        if (x >= buttonX && x <= buttonX + buttonWidth && 
            y >= buttonY && y <= buttonY + buttonHeight) {
            noHintsPopupActive = false;
            drawGame();
        }
        return;
    }
    
    // Check if level selector is active
    if (window.levelSelectorActive) {
        handleLevelSelectorClick(x, y);
        return;
    }
    
    if (!currentLevel || !gridData) return;
    
    // Check help popup close button first
    if (helpPopupActive) {
        const popupWidth = Math.min(320, canvas.width - 40);
        const popupHeight = Math.min(280, canvas.height - 80);
        const popupX = (canvas.width - popupWidth) / 2;
        const popupY = (canvas.height - popupHeight) / 2;
        
        const buttonWidth = 120;
        const buttonHeight = 35;
        const buttonX = popupX + (popupWidth - buttonWidth) / 2;
        const buttonY = popupY + popupHeight - 55;
        
        if (x >= buttonX && x <= buttonX + buttonWidth && 
            y >= buttonY && y <= buttonY + buttonHeight) {
            helpPopupActive = false;
            drawGame();
            return;
        }
        return; // Don't process other clicks when help popup is open
    }
    
    // Check hint popup
    if (hintPopupActive) {
        const popupWidth = Math.min(350, canvas.width - 40);
        const popupHeight = Math.min(400, canvas.height - 80);
        const popupX = (canvas.width - popupWidth) / 2;
        const popupY = (canvas.height - popupHeight) / 2;
        
        // Close button
        const closeButtonSize = 30;
        const closeButtonX = popupX + popupWidth - closeButtonSize - 15;
        const closeButtonY = popupY + 15;
        
        if (x >= closeButtonX && x <= closeButtonX + closeButtonSize && 
            y >= closeButtonY && y <= closeButtonY + closeButtonSize) {
            hintPopupActive = false;
            drawGame();
            return;
        }
        
        if (currentLevel && currentLevel.solution_path) {
            const steps = generateSolutionSteps();
            const buttonWidth = 80;
            const buttonHeight = 35;
            const buttonY = popupY + popupHeight - 100;
            
            // Previous step button
            if (currentHintStep > 0) {
                const prevX = popupX + 30;
                if (x >= prevX && x <= prevX + buttonWidth && 
                    y >= buttonY && y <= buttonY + buttonHeight) {
                    currentHintStep--;
                    drawGame();
                    return;
                }
            }
            
            // Next step button
            if (currentHintStep < steps.length - 1) {
                const nextX = popupX + popupWidth - buttonWidth - 30;
                if (x >= nextX && x <= nextX + buttonWidth && 
                    y >= buttonY && y <= buttonY + buttonHeight) {
                    currentHintStep++;
                    drawGame();
                    return;
                }
            }
            
            // Show all steps button
            const showAllX = popupX + (popupWidth - buttonWidth) / 2;
            const showAllY = buttonY + 45;
            if (x >= showAllX && x <= showAllX + buttonWidth && 
                y >= showAllY && y <= showAllY + buttonHeight) {
                showAllHints();
                return;
            }
        }
        
        return; // Don't process other clicks when hint popup is open
    }
    
    // Check icon buttons using consistent grid layout
    const layout = getCurrentGridLayout();
    if (!layout) return;
    
    const buttonY = layout.startY + layout.height * layout.cellSize + 20;
    const buttonYPos = buttonY + 15; // Match the moved down position
    const buttonSize = Math.max(45, Math.min(55, canvas.height / 12));
    const gridWidth = layout.width * layout.cellSize;
    
    // Calculate positions for 4 buttons evenly distributed (matching drawIconButtons)
    const spacing = (gridWidth - 4 * buttonSize) / 3; // Space between buttons
    const restartX = layout.startX;
    const levelsX = layout.startX + buttonSize + spacing;
    const hintX = layout.startX + 2 * (buttonSize + spacing);
    const helpX = layout.startX + 3 * (buttonSize + spacing);
    
    // Restart button
    if (x >= restartX && x <= restartX + buttonSize && 
        y >= buttonYPos && y <= buttonYPos + buttonSize) {
        console.log('Restart button clicked');
        if (hintModeActive) {
            exitHintMode();
        }
        loadLevel(currentLevelNumber);
        return;
    }
    
    // Levels button
    if (x >= levelsX && x <= levelsX + buttonSize && 
        y >= buttonYPos && y <= buttonYPos + buttonSize) {
        console.log('Levels button clicked');
        showLevelSelector();
        return;
    }
    
    // Hint button
    if (x >= hintX && x <= hintX + buttonSize && 
        y >= buttonYPos && y <= buttonYPos + buttonSize) {
        console.log('Hint button clicked');
        
        if (!hintModeActive) {
            // Enter hint mode - go to initial state
            startHintMode();
        } else {
            // Play next step
            playNextHintStep();
        }
        return;
    }
    
    // Help button
    if (x >= helpX && x <= helpX + buttonSize && 
        y >= buttonYPos && y <= buttonYPos + buttonSize) {
        console.log('Help button clicked');
        helpPopupActive = true;
        drawGame();
        return;
    }
}

function handleMouseDown(e) {
    if (!currentLevel || hintModeActive) return; // Disable dragging in hint mode
    
    const rect = canvas.getBoundingClientRect();
    
    // Account for canvas scaling when CSS resizes the canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const cell = getCellFromPosition(x, y);
    if (cell && gridData[cell.row][cell.col] >= 2 && gridData[cell.row][cell.col] <= 4) {
        isDragging = true;
        dragStartX = x;
        dragStartY = y;
        dragStartCell = cell;
        if (e.preventDefault) e.preventDefault();
    }
}

function handleMouseMove(e) {
    // Just for drag detection
}

function handleMouseUp(e) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Account for canvas scaling when CSS resizes the canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;
    
    const direction = getDragDirection(dragStartX, dragStartY, endX, endY);
    if (direction && dragStartCell) {
        moveBall(dragStartCell.row, dragStartCell.col, direction);
    }
    
    isDragging = false;
    dragStartCell = null;
}

function getCellFromPosition(x, y) {
    const layout = getCurrentGridLayout();
    if (!layout) return null;
    
    const col = Math.floor((x - layout.startX) / layout.cellSize);
    const row = Math.floor((y - layout.startY) / layout.cellSize);
    
    if (row >= 0 && row < layout.height && col >= 0 && col < layout.width) {
        return { row, col };
    }
    return null;
}

function getDragDirection(startX, startY, endX, endY) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // Make minimum distance responsive to canvas size
    const minDistance = Math.max(20, Math.min(50, canvas.width / 15));
    
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
    
    // Award hint for every 5 puzzles solved
    puzzlesSolved++;
    if (puzzlesSolved % 5 === 0) {
        availableHints++;
        saveHintProgress();
        console.log(`Bonus hint awarded! Puzzles solved: ${puzzlesSolved}, Available hints: ${availableHints}`);
        // Mark bonus hint as pending to show after level completion popup
        pendingBonusHint = true;
    } else {
        saveHintProgress();
    }
    
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

// Save hint progress to localStorage
function saveHintProgress() {
    try {
        localStorage.setItem('ballSwipeHints', availableHints.toString());
        localStorage.setItem('ballSwipePuzzlesSolved', puzzlesSolved.toString());
    } catch (e) {
        console.log('Could not save hint progress:', e);
    }
}

// Load hint progress from localStorage
function loadHintProgress() {
    try {
        const savedHints = localStorage.getItem('ballSwipeHints');
        const savedPuzzles = localStorage.getItem('ballSwipePuzzlesSolved');
        
        if (savedHints !== null) {
            availableHints = parseInt(savedHints) || 3;
        }
        
        if (savedPuzzles !== null) {
            puzzlesSolved = parseInt(savedPuzzles) || 0;
        }
        
        console.log(`Loaded hint progress - Hints: ${availableHints}, Puzzles solved: ${puzzlesSolved}`);
    } catch (e) {
        console.log('Could not load hint progress:', e);
        // Use defaults
        availableHints = 3;
        puzzlesSolved = 0;
    }
}

// Initialize when loaded
document.addEventListener('DOMContentLoaded', initGame);