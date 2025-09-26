// Simple grid test - Clean version
let canvas, ctx;
let currentLevel = null;
let gridData = null;
let currentStep = 0;

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
        
        // Parse the first solution step
        currentStep = 0;
        parseGridState(currentLevel.solution_path[currentStep]);
        
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
    
    // Draw title and step info
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${gridWidth}x${gridHeight}`, canvas.width / 2, 30);
    
    ctx.font = '16px Arial';
    ctx.fillText(`Step: ${currentStep + 1} / ${currentLevel.solution_path.length}`, canvas.width / 2, 55);
    ctx.fillText(`Target: ${currentLevel.puzzle_info.steps_to_solve} steps`, canvas.width / 2, 75);
    
    // Draw grid cells
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const x = startX + col * cellSize;
            const y = startY + row * cellSize;
            const value = gridData[row][col];
            
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

// Draw navigation buttons
function drawNavigationButtons() {
    const buttonY = canvas.height - 50;
    const buttonWidth = 80;
    const buttonHeight = 30;
    
    // Previous button
    ctx.fillStyle = currentStep > 0 ? '#4CAF50' : '#ccc';
    ctx.fillRect(50, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Previous', 90, buttonY + buttonHeight/2);
    
    // Next button
    ctx.fillStyle = currentStep < currentLevel.solution_path.length - 1 ? '#2196F3' : '#ccc';
    ctx.fillRect(220, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#fff';
    ctx.fillText('Next', 260, buttonY + buttonHeight/2);
}

// Setup click navigation
function setupGridNavigation() {
    canvas.addEventListener('click', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const buttonY = canvas.height - 50;
        const buttonHeight = 30;
        
        // Check Previous button
        if (x >= 50 && x <= 130 && y >= buttonY && y <= buttonY + buttonHeight && currentStep > 0) {
            currentStep--;
            parseGridState(currentLevel.solution_path[currentStep]);
            drawJSONGrid();
        }
        
        // Check Next button
        if (x >= 220 && x <= 300 && y >= buttonY && y <= buttonY + buttonHeight && 
            currentStep < currentLevel.solution_path.length - 1) {
            currentStep++;
            parseGridState(currentLevel.solution_path[currentStep]);
            drawJSONGrid();
        }
    });
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