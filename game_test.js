// Simple grid test - Clean version
let canvas, ctx;
let currentLevel = null;
let gridData = null;
let targetData = null;
let currentStep = 0;

// Game interaction variables
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartCell = null;

// Initialize game
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 350;
    canvas.height = 500;
    
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
    
    // Try to load JSON level, fallback to test grid
    loadLevel();
}

// Load level from JSON
async function loadLevel() {
    try {
        console.log('Attempting to load Level001.json...');
        const response = await fetch('levels/Level001.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        currentLevel = await response.json();
        console.log('Level loaded:', currentLevel);
        
        // Parse the first solution step (starting state)
        currentStep = 0;
        parseGridState(currentLevel.solution_path[currentStep]);
        
        // Parse the target state (last solution step)
        parseTargetState(currentLevel.solution_path[currentLevel.solution_path.length - 1]);
        
        // Draw the JSON-based grid
        drawJSONGrid();
        
        // Add navigation event listeners
        setupGridNavigation();
        
    } catch (error) {
        console.error('Failed to load level:', error);
        console.log('Falling back to test grid...');
        drawTestGrid();
    }
}

// Parse grid state string (e.g., "023000100")
function parseGridState(stateString) {
    const gridWidth = currentLevel.puzzle_info.grid_width;
    const gridHeight = currentLevel.puzzle_info.grid_height;
    
    gridData = [];
    for (let i = 0; i < gridHeight; i++) {
        gridData[i] = [];
        for (let j = 0; j < gridWidth; j++) {
            const index = i * gridWidth + j;
            gridData[i][j] = parseInt(stateString[index]) || 0;
        }
    }
    console.log('Grid data parsed:', gridData);
}

// Parse target state (winning configuration)
function parseTargetState(targetString) {
    const gridWidth = currentLevel.puzzle_info.grid_width;
    const gridHeight = currentLevel.puzzle_info.grid_height;
    
    targetData = [];
    for (let i = 0; i < gridHeight; i++) {
        targetData[i] = [];
        for (let j = 0; j < gridWidth; j++) {
            const index = i * gridWidth + j;
            targetData[i][j] = parseInt(targetString[index]) || 0;
        }
    }
    console.log('Target data parsed:', targetData);
}

// Draw grid based on JSON data
function drawJSONGrid() {
    console.log('Drawing JSON-based grid...');
    
    // Clear canvas with light background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const gridWidth = currentLevel.puzzle_info.grid_width;
    const gridHeight = currentLevel.puzzle_info.grid_height;
    
    // Calculate cell size
    const maxCellSize = 80;
    const availableWidth = canvas.width - 60; // padding
    const availableHeight = canvas.height - 200; // space for UI
    const cellSize = Math.min(
        maxCellSize,
        availableWidth / gridWidth,
        availableHeight / gridHeight
    );
    
    const startX = (canvas.width - (gridWidth * cellSize)) / 2;
    const startY = 100;
    
    // Draw title and info
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${gridWidth}x${gridHeight}`, canvas.width / 2, 30);
    
    ctx.font = '16px Arial';
    ctx.fillText('🎮 Drag balls to move them!', canvas.width / 2, 55);
    ctx.font = '14px Arial';
    ctx.fillText('Balls slide until they hit walls or other balls', canvas.width / 2, 75);
    
    // Draw grid cells
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const x = startX + col * cellSize;
            const y = startY + row * cellSize;
            const value = gridData[row][col];
            const targetValue = targetData ? targetData[row][col] : 0;
            
            if (value === 0) {
                // Empty cell - light background with border
                ctx.fillStyle = '#f8f8f8';
                ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                
            } else if (value === 1) {
                // Filled cell/wall - completely solid, no border
                ctx.fillStyle = '#333333';
                ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                
            } else if (value >= 2 && value <= 4) {
                // Ball - empty cell background with ball drawn on top
                ctx.fillStyle = '#f8f8f8';
                ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                
                // Draw the ball as a circle
                const centerX = x + cellSize / 2;
                const centerY = y + cellSize / 2;
                const ballRadius = Math.min(cellSize * 0.3, 20);
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, ballRadius, 0, Math.PI * 2);
                ctx.fillStyle = getBallColor(value);
                ctx.fill();
                
                // Ball highlight for 3D effect
                ctx.beginPath();
                ctx.arc(centerX - ballRadius * 0.3, centerY - ballRadius * 0.3, ballRadius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
            }
            
            // Draw target circles for winning positions (only for ball colors 2, 3, 4)
            if (targetValue >= 2 && targetValue <= 4) {
                const centerX = x + cellSize / 2;
                const centerY = y + cellSize / 2;
                const targetRadius = Math.min(cellSize * 0.35, 22);
                
                // Draw empty circle outline
                ctx.beginPath();
                ctx.arc(centerX, centerY, targetRadius, 0, Math.PI * 2);
                ctx.strokeStyle = getBallColor(targetValue);
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Add a subtle inner circle for better visibility
                ctx.beginPath();
                ctx.arc(centerX, centerY, targetRadius - 2, 0, Math.PI * 2);
                ctx.strokeStyle = getBallColor(targetValue);
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.3;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }
    }
    
    // Draw legend
    drawLegend();
    
    // Draw navigation buttons
    drawNavigationButtons();
}

// Draw legend explaining the symbols
function drawLegend() {
    const legendY = canvas.height - 120;
    const legendItems = [
        { value: 0, label: 'Empty' },
        { value: 1, label: 'Wall' },
        { value: 2, label: 'Red Ball' },
        { value: 3, label: 'Green Ball' },
        { value: 4, label: 'Blue Ball' }
    ];
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Legend:', 10, legendY - 10);
    
    legendItems.forEach((item, index) => {
        const x = 10 + (index % 2) * 170;
        const y = legendY + Math.floor(index / 2) * 20;
        
        if (item.value === 0) {
            // Empty cell - light background with border
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(x, y, 12, 12);
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 12, 12);
            
        } else if (item.value === 1) {
            // Filled cell - completely solid
            ctx.fillStyle = '#333333';
            ctx.fillRect(x, y, 12, 12);
            
        } else if (item.value >= 2 && item.value <= 4) {
            // Ball - empty background with small ball
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(x, y, 12, 12);
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 12, 12);
            
            // Draw small ball
            ctx.beginPath();
            ctx.arc(x + 6, y + 6, 4, 0, Math.PI * 2);
            ctx.fillStyle = getBallColor(item.value);
            ctx.fill();
        }
        
        // Label text
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, x + 18, y + 6);
    });
}

// Draw navigation buttons - removed, no longer needed
function drawNavigationButtons() {
    // No buttons needed - pure gameplay mode
}

// Setup drag gameplay only
function setupGridNavigation() {
    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
}

// Mouse event handlers
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cell = getCellFromPosition(x, y);
    if (cell && isBall(gridData[cell.row][cell.col])) {
        isDragging = true;
        dragStartX = x;
        dragStartY = y;
        dragStartCell = cell;
        e.preventDefault();
    }
}

function handleMouseMove(e) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Show drag preview (optional visual feedback)
    drawDragPreview(currentX, currentY);
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
    drawJSONGrid(); // Redraw without preview
}

// Touch event handlers (similar to mouse)
function handleTouchStart(e) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const cell = getCellFromPosition(x, y);
    if (cell && isBall(gridData[cell.row][cell.col])) {
        isDragging = true;
        dragStartX = x;
        dragStartY = y;
        dragStartCell = cell;
        e.preventDefault();
    }
}

function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
}

function handleTouchEnd(e) {
    if (!isDragging) return;
    
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const endX = touch.clientX - rect.left;
    const endY = touch.clientY - rect.top;
    
    const direction = getDragDirection(dragStartX, dragStartY, endX, endY);
    if (direction && dragStartCell) {
        moveBall(dragStartCell.row, dragStartCell.col, direction);
    }
    
    isDragging = false;
    dragStartCell = null;
    drawJSONGrid(); // Redraw without preview
    e.preventDefault();
}

// Helper functions
function getCellFromPosition(x, y) {
    if (!currentLevel) return null;
    
    const gridWidth = currentLevel.puzzle_info.grid_width;
    const gridHeight = currentLevel.puzzle_info.grid_height;
    const cellSize = Math.min(80, (canvas.width - 60) / gridWidth, (canvas.height - 200) / gridHeight);
    const startX = (canvas.width - (gridWidth * cellSize)) / 2;
    const startY = 100;
    
    const col = Math.floor((x - startX) / cellSize);
    const row = Math.floor((y - startY) / cellSize);
    
    if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth) {
        return { row, col };
    }
    return null;
}

function isBall(value) {
    return value >= 2 && value <= 4;
}

function getDragDirection(startX, startY, endX, endY) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const minDistance = 30; // Minimum drag distance
    
    if (Math.abs(deltaX) < minDistance && Math.abs(deltaY) < minDistance) {
        return null; // Not enough movement
    }
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'right' : 'left';
    } else {
        return deltaY > 0 ? 'down' : 'up';
    }
}

function moveBall(row, col, direction) {
    const ballValue = gridData[row][col];
    if (!isBall(ballValue)) return;
    
    const gridWidth = currentLevel.puzzle_info.grid_width;
    const gridHeight = currentLevel.puzzle_info.grid_height;
    
    let newRow = row;
    let newCol = col;
    
    // Calculate direction deltas
    const deltas = {
        'up': [-1, 0],
        'down': [1, 0],
        'left': [0, -1],
        'right': [0, 1]
    };
    
    const [deltaRow, deltaCol] = deltas[direction];
    
    // Clear the starting position
    gridData[row][col] = 0;
    
    // Move the ball until it hits something
    while (true) {
        const nextRow = newRow + deltaRow;
        const nextCol = newCol + deltaCol;
        
        // Check boundaries
        if (nextRow < 0 || nextRow >= gridHeight || nextCol < 0 || nextCol >= gridWidth) {
            break;
        }
        
        // Check for obstacles (walls or other balls)
        if (gridData[nextRow][nextCol] !== 0) {
            break;
        }
        
        // Move to next position
        newRow = nextRow;
        newCol = nextCol;
    }
    
    // Place the ball in its final position
    gridData[newRow][newCol] = ballValue;
    
    // Check for win condition
    checkWinCondition();
    
    // Redraw the grid
    drawJSONGrid();
    
    console.log(`Moved ball from (${row},${col}) to (${newRow},${newCol}) direction: ${direction}`);
}

function drawDragPreview(currentX, currentY) {
    // Optional: Add visual feedback during drag
    // For now, we'll just redraw normally
    drawJSONGrid();
}

// Check if player has achieved the winning configuration
function checkWinCondition() {
    if (!targetData || !gridData) return;
    
    const gridWidth = currentLevel.puzzle_info.grid_width;
    const gridHeight = currentLevel.puzzle_info.grid_height;
    
    // Compare current grid state with target state
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            if (gridData[row][col] !== targetData[row][col]) {
                return; // Not yet solved
            }
        }
    }
    
    // Player won!
    setTimeout(() => {
        alert('🎉 Congratulations! You solved the puzzle! 🎉');
        console.log('Player won the level!');
    }, 100);
}

// Draw a simple test grid
function drawTestGrid() {
    console.log('Drawing test grid...');
    
    // Clear canvas with light background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid parameters
    const gridSize = 3;
    const cellSize = 80;
    const startX = (canvas.width - (gridSize * cellSize)) / 2;
    const startY = 100;
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Test Grid 3x3', canvas.width / 2, 50);
    
    // Draw grid cells
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const x = startX + col * cellSize;
            const y = startY + row * cellSize;
            const cellNumber = row * gridSize + col + 1;
            
            // Cell background
            ctx.fillStyle = getCellColor(cellNumber);
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            
            // Cell border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            
            // Cell number
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cellNumber.toString(), x + cellSize/2, y + cellSize/2);
        }
    }
    
    // Instructions
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Grid drawing test successful!', canvas.width / 2, canvas.height - 30);
}

// Color function for puzzle elements (for legend background)
function getCellColor(value) {
    switch(value) {
        case 0: return '#f8f8f8';  // Empty cell - very light gray
        case 1: return '#333333';  // Filled cell/wall - dark gray
        case 2: return '#f8f8f8';  // Red ball cell - same as empty (ball drawn separately)
        case 3: return '#f8f8f8';  // Green ball cell - same as empty
        case 4: return '#f8f8f8';  // Blue ball cell - same as empty
        default: return '#dddddd'; // Unknown - medium gray
    }
}

// Ball colors (for actual ball drawing)
function getBallColor(value) {
    switch(value) {
        case 2: return '#ff4444';  // Red ball - bright red
        case 3: return '#44ff44';  // Green ball - bright green  
        case 4: return '#4444ff';  // Blue ball - bright blue
        default: return '#888888'; // Unknown ball - gray
    }
}

// Get display character/symbol for each cell type (for legend)
function getCellSymbol(value) {
    switch(value) {
        case 0: return '';         // Empty - no symbol
        case 1: return '■';        // Filled cell - solid block
        case 2: return '●';        // Red ball - circle
        case 3: return '●';        // Green ball - circle  
        case 4: return '●';        // Blue ball - circle
        default: return '?';       // Unknown
    }
}

// Get text color for each cell type (for legend)
function getTextColor(value) {
    switch(value) {
        case 0: return '#333';     // Dark text for empty
        case 1: return '#fff';     // White text for filled
        case 2: return '#ff4444';  // Red for red ball
        case 3: return '#44ff44';  // Green for green ball
        case 4: return '#4444ff';  // Blue for blue ball
        default: return '#333';    // Dark text for unknown
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);