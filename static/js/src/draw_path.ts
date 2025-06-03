interface Dot {
    row: number;
    col: number;
    color: string;
}

interface PathPoint {
    row: number;
    col: number;
}

interface BoardData {
    id: number;
    title: string;
    rows: number;
    cols: number;
    dots: Dot[];
}

interface PathsData {
    [color: string]: PathPoint[];
}

class PathDrawer {
    private boardData: BoardData;
    private pathsData: PathsData = {};
    
    private gridContainer: HTMLDivElement;
    private boardGrid: HTMLDivElement;
    private saveButton: HTMLButtonElement;
    private clearButton: HTMLButtonElement;
    private statusElement: HTMLDivElement;
    private csrf: string;
    
    // Path drawing state
    private isDrawing: boolean = false;
    private currentColor: string | null = null;
    private currentPath: PathPoint[] = [];
    private startDot: Dot | null = null;
    private endDot: Dot | null = null;
    private lastCell: HTMLElement | null = null;
    
    // Track cells that already have paths
    private occupiedCells: Set<string> = new Set();
    
    constructor(boardData: BoardData, initialPaths: PathsData = {}) {
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
        
        this.gridContainer = gridContainer as HTMLDivElement;
        this.boardGrid = boardGrid as HTMLDivElement;
        this.saveButton = saveButton as HTMLButtonElement;
        this.clearButton = clearButton as HTMLButtonElement;
        this.statusElement = statusElement as HTMLDivElement;
        this.csrf = (csrfElement as HTMLInputElement).value;
        
        // Initialize the board
        this.initializeBoard();
        
        // Mark cells with existing paths as occupied
        this.updateOccupiedCells();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Check if all dots are connected
        this.checkAllConnected();
    }
    
    private updateOccupiedCells(): void {
        this.occupiedCells.clear();
        
        // Mark all cells with paths as occupied
        Object.values(this.pathsData).forEach((path: PathPoint[]) => {
            path.forEach((point: PathPoint) => {
                this.occupiedCells.add(`${point.row},${point.col}`);
            });
        });
    }
    
    private initializeBoard(): void {
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
    
    private setupEventListeners(): void {
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
    
    private handleDotClick(event: MouseEvent): void {
        let target = event.target as HTMLElement;
        
        // If clicked directly on a dot, use its parent cell
        if (target.classList.contains('dot')) {
            target = target.parentElement as HTMLElement;
        }
        
        // Make sure the target is a grid cell
        if (!target.classList.contains('grid-cell')) return;
        
        const row = parseInt(target.dataset.row || '-1');
        const col = parseInt(target.dataset.col || '-1');
        
        if (row === -1 || col === -1) return;
        
        // Find the dot that was clicked
        const clickedDot = this.boardData.dots.find(dot => dot.row === row && dot.col === col);
        if (!clickedDot) return;
        
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
        this.currentPath = [{row, col}];
        
        console.log(`Started new path with color ${this.currentColor}`);
    }
    
    private handleMouseMove(event: MouseEvent): void {
        if (!this.isDrawing || !this.currentColor) return;
        
        let target = event.target as HTMLElement;
        
        // If hovering over a dot, use its parent cell
        if (target.classList.contains('dot')) {
            target = target.parentElement as HTMLElement;
        }
        
        if (!target.classList.contains('grid-cell')) return;
        
        // Don't process the same cell multiple times in a row
        if (this.lastCell === target) return;
        this.lastCell = target;
        
        const row = parseInt(target.dataset.row || '-1');
        const col = parseInt(target.dataset.col || '-1');
        
        if (row === -1 || col === -1) return;
        
        // Check if this is a dot cell
        const isDotCell = this.boardData.dots.some(dot => dot.row === row && dot.col === col);
        
        // If it's a dot, only allow if it's the second dot of the same color
        if (isDotCell) {
            const targetDot = this.boardData.dots.find(dot => dot.row === row && dot.col === col);
            if (targetDot && targetDot.color === this.currentColor && !this.isSameDot(targetDot, this.startDot!)) {
                // Valid end dot found!
                this.endDot = targetDot;
                
                // Add this point to the path
                if (this.isValidNextPoint(row, col)) {
                    this.currentPath.push({row, col});
                    this.renderPreviewPath();
                    this.completePath();
                }
            }
            return;
        }
        
        // Check if this is a valid next point (not occupied, adjacent to last point)
        if (this.isValidNextPoint(row, col)) {
            // Add this point to the path
            this.currentPath.push({row, col});
            
            // Update the preview
            this.renderPreviewPath();
        }
    }
    
    private handleMouseUp(): void {
        // If we're drawing but haven't completed the path, cancel it
        if (this.isDrawing) {
            this.cancelPath();
        }
    }
    
    private isValidNextPoint(row: number, col: number): boolean {
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
        const isAdjacent = (
            (Math.abs(row - lastPoint.row) === 1 && col === lastPoint.col) ||
            (Math.abs(col - lastPoint.col) === 1 && row === lastPoint.row)
        );
        
        return isAdjacent;
    }
    
    private isSameDot(dot1: Dot, dot2: Dot): boolean {
        return dot1.row === dot2.row && dot1.col === dot2.col;
    }
    
    private completePath(): void {
        if (!this.currentColor || !this.startDot || !this.endDot) return;
        
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
    
    private cancelPath(): void {
        console.log('Cancelling current path');
        
        // Remove preview path
        document.querySelectorAll('.path-preview').forEach(el => el.remove());
        
        // Reset the path state
        this.resetPathState();
    }
    
    private resetPathState(): void {
        this.isDrawing = false;
        this.currentColor = null;
        this.currentPath = [];
        this.startDot = null;
        this.endDot = null;
        this.lastCell = null;
    }
    
    private renderDots(): void {
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
    
    private renderPath(color: string, path: PathPoint[]): void {
        if (path.length < 2) return;
        
        // Draw each segment as a line connecting points
        for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];
            
            // Get the cells for current and next points
            const currentCell = this.getCellElement(current.row, current.col);
            const nextCell = this.getCellElement(next.row, next.col);
            
            if (!currentCell || !nextCell) continue;
            
            // Determine the direction of the line
            const direction = this.getDirection(current, next);
            
            // Create line segment in the current cell pointing to the next cell
            this.createLineSegment(currentCell, direction, color);
            
            // Create line segment in the next cell pointing back to the current cell
            this.createLineSegment(nextCell, this.getReverseDirection(direction), color);
        }
    }
    
    private createLineSegment(cell: HTMLElement, direction: string, color: string): void {
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
    
    private getDirection(from: PathPoint, to: PathPoint): string {
        if (from.row === to.row) {
            return from.col < to.col ? 'right' : 'left';
        } else {
            return from.row < to.row ? 'down' : 'up';
        }
    }
    
    private getReverseDirection(direction: string): string {
        switch (direction) {
            case 'right': return 'left';
            case 'left': return 'right';
            case 'down': return 'up';
            case 'up': return 'down';
            default: return direction;
        }
    }
    
    private renderPreviewPath(): void {
        // Remove any existing preview
        document.querySelectorAll('.path-preview').forEach(el => el.remove());
        
        if (!this.currentColor || this.currentPath.length < 2) return;
        
        // Draw preview lines between points
        for (let i = 0; i < this.currentPath.length - 1; i++) {
            const current = this.currentPath[i];
            const next = this.currentPath[i + 1];
            
            // Get the cells for current and next points
            const currentCell = this.getCellElement(current.row, current.col);
            const nextCell = this.getCellElement(next.row, next.col);
            
            if (!currentCell || !nextCell) continue;
            
            // Determine the direction of the line
            const direction = this.getDirection(current, next);
            
            // Create preview line segment in the current cell pointing to the next cell
            this.createPreviewLineSegment(currentCell, direction, this.currentColor);
            
            // Create preview line segment in the next cell pointing back to the current cell
            this.createPreviewLineSegment(nextCell, this.getReverseDirection(direction), this.currentColor);
        }
    }
    
    private createPreviewLineSegment(cell: HTMLElement, direction: string, color: string): void {
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
    
    private renderAllPaths(): void {
        // Clear existing paths
        document.querySelectorAll('.path-segment').forEach(el => el.remove());
        
        // Render each saved path
        Object.entries(this.pathsData).forEach(([color, path]: [string, PathPoint[]]) => {
            this.renderPath(color, path);
        });
    }
    
    private checkAllConnected(): void {
        // Get all unique colors of dots
        const dotColors = new Set(this.boardData.dots.map(dot => dot.color));
        
        // Check if all colors have paths
        const allConnected = Array.from(dotColors).every((color: string) => 
            this.pathsData[color] && this.pathsData[color].length >= 2
        );
        
        if (allConnected) {
            this.statusElement.innerHTML = `
                <div class="alert alert-success mt-3">
                    <h4 class="alert-heading">Well done!</h4>
                    <p>You successfully connected all dots!</p>
                </div>
            `;
        } else {
            this.statusElement.innerHTML = '';
        }
    }
    
    private getCellElement(row: number, col: number): HTMLElement | null {
        return document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    }
    
    private handleSavePaths(): void {
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
            } else {
                alert(`Error: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while saving the paths. Check console for details.');
        });
    }
    
    private handleClearPaths(): void {
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
    } catch (error) {
        console.error('Failed to initialize PathDrawer:', error);
    }
});
