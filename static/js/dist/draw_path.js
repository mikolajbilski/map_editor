"use strict";
class PathDrawer {
    constructor(boardData, initialPaths = {}) {
        this.pathsData = {};
        // Path drawing state
        this.isDrawing = false;
        this.currentColor = null;
        this.currentPath = [];
        this.startDot = null;
        this.endDot = null;
        this.lastCell = null;
        // Track cells that already have paths
        this.occupiedCells = new Set();
        // Store board data and paths
        this.boardData = boardData;
        this.pathsData = initialPaths || {};
        // Get DOM elements
        const gridContainer = document.getElementById('grid-container');
        const boardGrid = document.getElementById('board-grid');
        const saveButton = document.getElementById('save-path');
        const clearButton = document.getElementById('clear-path');
        const statusElement = document.getElementById('status-message');
        const csrfElement = document.querySelector('[name=csrfmiddlewaretoken]');
        // Validate DOM elements
        if (!gridContainer || !boardGrid || !saveButton || !clearButton || !csrfElement || !statusElement) {
            console.error('Required DOM elements not found');
            throw new Error('Required DOM elements not found');
        }
        this.gridContainer = gridContainer;
        this.boardGrid = boardGrid;
        this.saveButton = saveButton;
        this.clearButton = clearButton;
        this.statusElement = statusElement;
        this.csrf = csrfElement.value;
        // Initialize the board
        this.initializeBoard();
        // Mark cells with existing paths as occupied
        this.updateOccupiedCells();
        // Set up event listeners
        this.setupEventListeners();
        // Check if all dots are connected
        this.checkAllConnected();
    }
    updateOccupiedCells() {
        this.occupiedCells.clear();
        // Mark all cells with paths as occupied
        Object.values(this.pathsData).forEach((path) => {
            path.forEach((point) => {
                this.occupiedCells.add(`${point.row},${point.col}`);
            });
        });
    }
    initializeBoard() {
        // Clear the grid
        this.boardGrid.innerHTML = '';
        // Set up grid dimensions
        this.boardGrid.style.gridTemplateColumns = `repeat(${this.boardData.cols}, 40px)`;
        this.boardGrid.style.gridTemplateRows = `repeat(${this.boardData.rows}, 40px)`;
        // Create cells
        for (let row = 0; row < this.boardData.rows; row++) {
            for (let col = 0; col < this.boardData.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row.toString();
                cell.dataset.col = col.toString();
                this.boardGrid.appendChild(cell);
            }
        }
        // Render dots
        this.renderDots();
        // Render existing paths if any
        this.renderAllPaths();
    }
    setupEventListeners() {
        // Dot click event to start/end paths
        this.boardGrid.addEventListener('mousedown', this.handleDotClick.bind(this));
        // Mouse movement for drawing the path
        this.boardGrid.addEventListener('mousemove', this.handleMouseMove.bind(this));
        // Mouse up to cancel the path if not completed
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        // Save button
        this.saveButton.addEventListener('click', this.handleSavePaths.bind(this));
        // Clear button
        this.clearButton.addEventListener('click', this.handleClearPaths.bind(this));
    }
    handleDotClick(event) {
        let target = event.target;
        // If clicked directly on a dot, use its parent cell
        if (target.classList.contains('dot')) {
            target = target.parentElement;
        }
        // Make sure the target is a grid cell
        if (!target.classList.contains('grid-cell'))
            return;
        const row = parseInt(target.dataset.row || '-1');
        const col = parseInt(target.dataset.col || '-1');
        if (row === -1 || col === -1)
            return;
        // Find the dot that was clicked
        const clickedDot = this.boardData.dots.find(dot => dot.row === row && dot.col === col);
        if (!clickedDot)
            return;
        // Check if we're already drawing
        if (this.isDrawing) {
            // Only allow ending on a dot of the same color as the start
            if (clickedDot.color === this.currentColor) {
                // Complete the path
                this.endDot = clickedDot;
                this.completePath();
            }
            return;
        }
        // Don't start a new path if this color already has a completed path
        if (this.pathsData[clickedDot.color]) {
            console.log('This color already has a completed path');
            return;
        }
        // Start a new path
        this.isDrawing = true;
        this.currentColor = clickedDot.color;
        this.startDot = clickedDot;
        this.currentPath = [{ row, col }];
        console.log(`Started new path with color ${this.currentColor}`);
    }
    handleMouseMove(event) {
        if (!this.isDrawing || !this.currentColor)
            return;
        let target = event.target;
        // If hovering over a dot, use its parent cell
        if (target.classList.contains('dot')) {
            target = target.parentElement;
        }
        if (!target.classList.contains('grid-cell'))
            return;
        // Don't process the same cell multiple times in a row
        if (this.lastCell === target)
            return;
        this.lastCell = target;
        const row = parseInt(target.dataset.row || '-1');
        const col = parseInt(target.dataset.col || '-1');
        if (row === -1 || col === -1)
            return;
        // Check if this is a dot cell
        const isDotCell = this.boardData.dots.some(dot => dot.row === row && dot.col === col);
        // If it's a dot, only allow if it's the second dot of the same color
        if (isDotCell) {
            const targetDot = this.boardData.dots.find(dot => dot.row === row && dot.col === col);
            if (targetDot && targetDot.color === this.currentColor && !this.isSameDot(targetDot, this.startDot)) {
                // Valid end dot found!
                this.endDot = targetDot;
                // Add this point to the path
                if (this.isValidNextPoint(row, col)) {
                    this.currentPath.push({ row, col });
                    this.renderPreviewPath();
                    this.completePath();
                }
            }
            return;
        }
        // Check if this is a valid next point (not occupied, adjacent to last point)
        if (this.isValidNextPoint(row, col)) {
            // Add this point to the path
            this.currentPath.push({ row, col });
            // Update the preview
            this.renderPreviewPath();
        }
    }
    handleMouseUp() {
        // If we're drawing but haven't completed the path, cancel it
        if (this.isDrawing) {
            this.cancelPath();
        }
    }
    isValidNextPoint(row, col) {
        // Check if the cell is already occupied by another path
        if (this.occupiedCells.has(`${row},${col}`)) {
            return false;
        }
        // If this is the first point in the path, it's valid
        if (this.currentPath.length === 0) {
            return true;
        }
        // Get the last point in the path
        const lastPoint = this.currentPath[this.currentPath.length - 1];
        // Check if the new point is adjacent (horizontally or vertically) to the last point
        const isAdjacent = ((Math.abs(row - lastPoint.row) === 1 && col === lastPoint.col) ||
            (Math.abs(col - lastPoint.col) === 1 && row === lastPoint.row));
        return isAdjacent;
    }
    isSameDot(dot1, dot2) {
        return dot1.row === dot2.row && dot1.col === dot2.col;
    }
    completePath() {
        if (!this.currentColor || !this.startDot || !this.endDot)
            return;
        console.log(`Completing path for color ${this.currentColor}`);
        // Store the completed path
        this.pathsData[this.currentColor] = [...this.currentPath];
        // Update occupied cells
        this.updateOccupiedCells();
        // Clear the current path state
        this.resetPathState();
        // Render all paths to update the UI
        this.renderAllPaths();
        // Check if all dots are connected
        this.checkAllConnected();
    }
    cancelPath() {
        console.log('Cancelling current path');
        // Remove preview path
        document.querySelectorAll('.path-preview').forEach(el => el.remove());
        // Reset the path state
        this.resetPathState();
    }
    resetPathState() {
        this.isDrawing = false;
        this.currentColor = null;
        this.currentPath = [];
        this.startDot = null;
        this.endDot = null;
        this.lastCell = null;
    }
    renderDots() {
        // Add dots from the board data
        this.boardData.dots.forEach(dot => {
            const cell = this.getCellElement(dot.row, dot.col);
            if (cell) {
                const dotElement = document.createElement('div');
                dotElement.className = 'dot';
                dotElement.style.backgroundColor = dot.color;
                cell.appendChild(dotElement);
            }
        });
    }
    renderPath(color, path) {
        if (path.length < 2)
            return;
        // Draw each segment as a line connecting points
        for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];
            // Get the cells for current and next points
            const currentCell = this.getCellElement(current.row, current.col);
            const nextCell = this.getCellElement(next.row, next.col);
            if (!currentCell || !nextCell)
                continue;
            // Determine the direction of the line
            const direction = this.getDirection(current, next);
            // Create line segment in the current cell pointing to the next cell
            this.createLineSegment(currentCell, direction, color);
            // Create line segment in the next cell pointing back to the current cell
            this.createLineSegment(nextCell, this.getReverseDirection(direction), color);
        }
    }
    createLineSegment(cell, direction, color) {
        const line = document.createElement('div');
        line.className = 'path-segment';
        line.style.backgroundColor = color;
        line.style.position = 'absolute';
        line.dataset.direction = direction;
        // Size and position the line based on direction
        switch (direction) {
            case 'right':
                line.style.width = '50%';
                line.style.height = '30%';
                line.style.left = '50%';
                line.style.top = '35%';
                break;
            case 'left':
                line.style.width = '50%';
                line.style.height = '30%';
                line.style.left = '0';
                line.style.top = '35%';
                break;
            case 'down':
                line.style.width = '30%';
                line.style.height = '50%';
                line.style.left = '35%';
                line.style.top = '50%';
                break;
            case 'up':
                line.style.width = '30%';
                line.style.height = '50%';
                line.style.left = '35%';
                line.style.top = '0';
                break;
        }
        cell.appendChild(line);
    }
    getDirection(from, to) {
        if (from.row === to.row) {
            return from.col < to.col ? 'right' : 'left';
        }
        else {
            return from.row < to.row ? 'down' : 'up';
        }
    }
    getReverseDirection(direction) {
        switch (direction) {
            case 'right': return 'left';
            case 'left': return 'right';
            case 'down': return 'up';
            case 'up': return 'down';
            default: return direction;
        }
    }
    renderPreviewPath() {
        // Remove any existing preview
        document.querySelectorAll('.path-preview').forEach(el => el.remove());
        if (!this.currentColor || this.currentPath.length < 2)
            return;
        // Draw preview lines between points
        for (let i = 0; i < this.currentPath.length - 1; i++) {
            const current = this.currentPath[i];
            const next = this.currentPath[i + 1];
            // Get the cells for current and next points
            const currentCell = this.getCellElement(current.row, current.col);
            const nextCell = this.getCellElement(next.row, next.col);
            if (!currentCell || !nextCell)
                continue;
            // Determine the direction of the line
            const direction = this.getDirection(current, next);
            // Create preview line segment in the current cell pointing to the next cell
            this.createPreviewLineSegment(currentCell, direction, this.currentColor);
            // Create preview line segment in the next cell pointing back to the current cell
            this.createPreviewLineSegment(nextCell, this.getReverseDirection(direction), this.currentColor);
        }
    }
    createPreviewLineSegment(cell, direction, color) {
        const line = document.createElement('div');
        line.className = 'path-preview';
        line.style.backgroundColor = color;
        line.style.position = 'absolute';
        line.style.opacity = '0.5';
        line.style.zIndex = '6';
        // Size and position the line based on direction
        switch (direction) {
            case 'right':
                line.style.width = '50%';
                line.style.height = '30%';
                line.style.left = '50%';
                line.style.top = '35%';
                break;
            case 'left':
                line.style.width = '50%';
                line.style.height = '30%';
                line.style.left = '0';
                line.style.top = '35%';
                break;
            case 'down':
                line.style.width = '30%';
                line.style.height = '50%';
                line.style.left = '35%';
                line.style.top = '50%';
                break;
            case 'up':
                line.style.width = '30%';
                line.style.height = '50%';
                line.style.left = '35%';
                line.style.top = '0';
                break;
        }
        cell.appendChild(line);
    }
    renderAllPaths() {
        // Clear existing paths
        document.querySelectorAll('.path-segment').forEach(el => el.remove());
        // Render each saved path
        Object.entries(this.pathsData).forEach(([color, path]) => {
            this.renderPath(color, path);
        });
    }
    checkAllConnected() {
        // Get all unique colors of dots
        const dotColors = new Set(this.boardData.dots.map(dot => dot.color));
        // Check if all colors have paths
        const allConnected = Array.from(dotColors).every((color) => this.pathsData[color] && this.pathsData[color].length >= 2);
        if (allConnected) {
            this.statusElement.innerHTML = `
                <div class="alert alert-success mt-3">
                    <h4 class="alert-heading">Well done!</h4>
                    <p>You successfully connected all dots!</p>
                </div>
            `;
        }
        else {
            this.statusElement.innerHTML = '';
        }
    }
    getCellElement(row, col) {
        return document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    }
    handleSavePaths() {
        // Send the paths data to the server
        fetch(`/play/${this.boardData.id}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrf,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                paths_data: this.pathsData
            })
        })
            .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Error response:', text);
                    throw new Error(`HTTP error! Status: ${response.status}`);
                });
            }
            return response.json();
        })
            .then(data => {
            if (data.success) {
                alert('Paths saved successfully!');
            }
            else {
                alert(`Error: ${data.error || 'Unknown error'}`);
            }
        })
            .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while saving the paths. Check console for details.');
        });
    }
    handleClearPaths() {
        if (confirm('Are you sure you want to clear all paths?')) {
            // Reset path data
            this.pathsData = {};
            // Reset state variables
            this.isDrawing = false;
            this.currentColor = null;
            this.currentPath = [];
            this.startDot = null;
            this.endDot = null;
            this.lastCell = null;
            // Clear the occupied cells set
            this.occupiedCells.clear();
            // More thorough DOM cleanup - remove all path segments and previews
            document.querySelectorAll('.path-segment, .path-preview').forEach(el => el.remove());
            // Update UI
            this.checkAllConnected();
        }
    }
}
// Initialize the path drawer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Global variables defined in the template
        // @ts-ignore
        new PathDrawer(boardData, initialPaths);
    }
    catch (error) {
        console.error('Failed to initialize PathDrawer:', error);
    }
});
//# sourceMappingURL=draw_path.js.map