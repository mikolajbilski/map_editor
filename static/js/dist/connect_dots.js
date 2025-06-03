"use strict";
class ConnectDotsEditor {
    constructor(initialBoard) {
        this.colors = [
            '#FF0000', // Red
            '#00FF00', // Green
            '#0000FF', // Blue
            '#FFFF00', // Yellow
            '#FF00FF', // Magenta
            '#00FFFF', // Cyan
            '#FFA500', // Orange
            '#800080', // Purple
            '#008000', // Dark Green
            '#000080', // Navy
        ];
        this.selectedColor = null;
        this.pendingDot = null;
        // Initialize the state
        this.boardState = initialBoard || {
            title: 'New Board',
            rows: 5,
            cols: 5,
            dots: []
        };
        // Get DOM elements
        const boardForm = document.getElementById('board-form');
        const titleInput = document.getElementById('board-title');
        const rowsInput = document.getElementById('board-rows');
        const colsInput = document.getElementById('board-cols');
        const generateButton = document.getElementById('generate-grid');
        const saveButton = document.getElementById('save-board');
        const clearButton = document.getElementById('clear-dots');
        const colorPicker = document.getElementById('color-picker');
        const colorStatus = document.getElementById('color-status');
        const gridContainer = document.getElementById('grid-container');
        const boardGrid = document.getElementById('board-grid');
        const csrfElement = document.querySelector('[name=csrfmiddlewaretoken]');
        // Validate that all required elements exist
        if (!boardForm || !titleInput || !rowsInput || !colsInput || !generateButton ||
            !saveButton || !clearButton || !colorPicker || !colorStatus ||
            !gridContainer || !boardGrid || !csrfElement) {
            console.error('Required DOM elements not found');
            throw new Error('Required DOM elements not found');
        }
        this.boardForm = boardForm;
        this.titleInput = titleInput;
        this.rowsInput = rowsInput;
        this.colsInput = colsInput;
        this.generateButton = generateButton;
        this.saveButton = saveButton;
        this.clearButton = clearButton;
        this.colorPicker = colorPicker;
        this.colorStatus = colorStatus;
        this.gridContainer = gridContainer;
        this.boardGrid = boardGrid;
        this.csrf = csrfElement.value;
        // Set up event listeners
        this.setupEventListeners();
        // Initialize the UI
        this.initializeUI();
    }
    setupEventListeners() {
        // Generate grid button
        this.generateButton.addEventListener('click', this.handleGenerateGrid.bind(this));
        // Save board button
        this.saveButton.addEventListener('click', this.handleSaveBoard.bind(this));
        // Clear dots button
        this.clearButton.addEventListener('click', this.handleClearDots.bind(this));
    }
    initializeUI() {
        // Create color picker
        this.createColorPicker();
        // Generate initial grid
        this.generateGrid();
        // Update color status
        this.updateColorStatus();
    }
    createColorPicker() {
        this.colorPicker.innerHTML = '';
        this.colors.forEach(color => {
            const colorElement = document.createElement('div');
            colorElement.className = 'color-option';
            colorElement.style.backgroundColor = color;
            colorElement.setAttribute('data-color', color);
            colorElement.addEventListener('click', () => {
                this.handleColorSelect(color);
            });
            this.colorPicker.appendChild(colorElement);
        });
    }
    handleColorSelect(color) {
        this.selectedColor = color;
        this.pendingDot = null;
        // Update UI to reflect selected color
        document.querySelectorAll('.color-option').forEach(element => {
            element.classList.remove('active');
        });
        const activeColorElement = document.querySelector(`[data-color="${color}"]`);
        if (activeColorElement) {
            activeColorElement.classList.add('active');
        }
        this.updateColorStatus();
    }
    updateColorStatus() {
        const colorCounts = new Map();
        // Count dots by color
        this.boardState.dots.forEach(dot => {
            const count = colorCounts.get(dot.color) || 0;
            colorCounts.set(dot.color, count + 1);
        });
        // Update status HTML
        this.colorStatus.innerHTML = '';
        if (this.selectedColor) {
            const dotsOfSelectedColor = colorCounts.get(this.selectedColor) || 0;
            if (dotsOfSelectedColor >= 2) {
                this.colorStatus.innerHTML = `<div class="alert alert-warning">You already placed 2 dots with this color.</div>`;
            }
            else if (this.pendingDot) {
                this.colorStatus.innerHTML = `<div class="alert alert-info">Please place the second ${this.selectedColor} dot.</div>`;
            }
            else {
                this.colorStatus.innerHTML = `<div class="alert alert-info">Please place the first ${this.selectedColor} dot.</div>`;
            }
        }
        else {
            this.colorStatus.innerHTML = `<div class="alert alert-secondary">Select a color to place dots.</div>`;
        }
    }
    handleGenerateGrid() {
        const rows = parseInt(this.rowsInput.value, 10);
        const cols = parseInt(this.colsInput.value, 10);
        if (isNaN(rows) || isNaN(cols) || rows < 2 || cols < 2 || rows > 15 || cols > 15) {
            alert('Please enter valid dimensions (2-15 for both rows and columns).');
            return;
        }
        // Update board state
        this.boardState.rows = rows;
        this.boardState.cols = cols;
        // Generate the grid
        this.generateGrid();
    }
    generateGrid() {
        // Clear the grid
        this.boardGrid.innerHTML = '';
        // Set up grid with the specified number of rows and columns
        this.boardGrid.style.gridTemplateColumns = `repeat(${this.boardState.cols}, 40px)`;
        this.boardGrid.style.gridTemplateRows = `repeat(${this.boardState.rows}, 40px)`;
        // Create cells
        for (let row = 0; row < this.boardState.rows; row++) {
            for (let col = 0; col < this.boardState.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.setAttribute('data-row', row.toString());
                cell.setAttribute('data-col', col.toString());
                // Add click event
                cell.addEventListener('click', () => {
                    this.handleCellClick(row, col);
                });
                this.boardGrid.appendChild(cell);
            }
        }
        // Render existing dots
        this.renderDots();
    }
    renderDots() {
        // Clear existing dots from the grid
        document.querySelectorAll('.dot').forEach(dot => dot.remove());
        // Add dots from the state
        this.boardState.dots.forEach(dot => {
            const cell = this.getCellElement(dot.row, dot.col);
            if (cell) {
                const dotElement = document.createElement('div');
                dotElement.className = 'dot';
                dotElement.style.backgroundColor = dot.color;
                cell.appendChild(dotElement);
            }
        });
    }
    getCellElement(row, col) {
        return document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    }
    handleCellClick(row, col) {
        // Check if a color is selected
        if (!this.selectedColor) {
            alert('Please select a color first!');
            return;
        }
        // Check if the cell is already occupied
        const isOccupied = this.boardState.dots.some(dot => dot.row === row && dot.col === col);
        if (isOccupied) {
            alert('This cell is already occupied. Please choose another one.');
            return;
        }
        // Count dots of the selected color
        const dotsOfSelectedColor = this.boardState.dots.filter(dot => dot.color === this.selectedColor).length;
        // If we already have two dots of this color, prevent adding more
        if (dotsOfSelectedColor >= 2) {
            alert(`You already have 2 dots with the color ${this.selectedColor}. Please select another color.`);
            return;
        }
        // If there's a pending dot (first of a pair), add the second dot
        if (this.pendingDot) {
            // Make sure it's not the same position as the pending dot
            if (this.pendingDot.row === row && this.pendingDot.col === col) {
                alert('You cannot place both dots in the same cell.');
                return;
            }
            // Add the second dot
            const newDot = { row, col, color: this.selectedColor };
            this.boardState.dots.push(newDot);
            // Clear pending dot
            this.pendingDot = null;
            // Reset selected color (optional, can keep it selected if you prefer)
            this.selectedColor = null;
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('active'));
        }
        else {
            // Add the first dot
            const newDot = { row, col, color: this.selectedColor };
            this.boardState.dots.push(newDot);
            // Set as pending dot
            this.pendingDot = newDot;
        }
        // Update the UI
        this.renderDots();
        this.updateColorStatus();
    }
    handleClearDots() {
        if (confirm('Are you sure you want to clear all dots?')) {
            this.boardState.dots = [];
            this.pendingDot = null;
            this.renderDots();
            this.updateColorStatus();
        }
    }
    handleSaveBoard() {
        // Get the title from the input
        this.boardState.title = this.titleInput.value.trim();
        if (!this.boardState.title) {
            alert('Please enter a title for your board.');
            return;
        }
        // Validate that we don't have any pending dots
        if (this.pendingDot) {
            alert('You have a pending dot. Please complete the pair or select a different color.');
            return;
        }
        // Determine if we're creating a new board or updating an existing one
        const isNewBoard = !this.boardState.id;
        // Use the correct URLs - Django expects a root-relative URL
        const url = isNewBoard ? '/connect_dots/create/' : `/connect_dots/edit/${this.boardState.id}/`;
        console.log('Saving board to URL:', url);
        console.log('Board data:', JSON.stringify(this.boardState));
        // Send the data to the server
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrf,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(this.boardState)
        })
            .then(response => {
            if (!response.ok) {
                // Log the error response for debugging
                return response.text().then(text => {
                    console.error('Error response:', text);
                    throw new Error(`HTTP error! Status: ${response.status}`);
                });
            }
            return response.json();
        })
            .then(data => {
            if (data.success) {
                if (isNewBoard) {
                    // If it's a new board, redirect to the edit page
                    window.location.href = `/connect_dots/edit/${data.id}/`;
                }
                else {
                    // If updating an existing board, show success message
                    alert('Board saved successfully!');
                }
            }
            else {
                alert(`Error: ${data.error || 'Unknown error'}`);
            }
        })
            .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while saving the board. Check console for details.');
        });
    }
}
// Initialize the editor when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Check if initialBoard is defined in the global scope
        // @ts-ignore
        const boardData = typeof initialBoard !== 'undefined' ? initialBoard : null;
        new ConnectDotsEditor(boardData);
    }
    catch (error) {
        console.error('Failed to initialize ConnectDotsEditor:', error);
    }
});
//# sourceMappingURL=connect_dots.js.map