// Define interfaces for type safety
interface RoutePoint {
    id: string;
    x: number;
    y: number;
}

class RouteEditor {
    // DOM elements
    private mapContainer: HTMLElement;
    private routeMap: HTMLImageElement;
    private routePath: SVGPathElement;
    private routeSvg: SVGSVGElement;
    private pointsTableBody: HTMLElement;
    private manualForm: HTMLFormElement;
    private manualX: HTMLInputElement;
    private manualY: HTMLInputElement;
    private form: HTMLFormElement;
    private csrf: string;
    
    // Data
    private points: RoutePoint[] = [];
    
    constructor() {
        // Initialize DOM elements with proper null checks and type casting
        const mapContainer = document.getElementById('map-container');
        const routeMap = document.getElementById('route-map');
        const routePath = document.querySelector('#route-path');
        const routeSvg = document.querySelector('#route-svg');
        const pointsTableBody = document.getElementById('points-table-body');
        const manualForm = document.getElementById('manual-coordinates-form');
        const manualX = document.getElementById('manual-x');
        const manualY = document.getElementById('manual-y');
        const form = document.getElementById('point-form');
        const csrfElement = document.querySelector('[name=csrfmiddlewaretoken]');
        
        // Validate that all required elements exist
        if (!mapContainer || !routeMap || !routePath || !routeSvg || 
            !pointsTableBody || !manualForm || !manualX || !manualY || 
            !form || !csrfElement) {
            console.error('Required DOM elements not found');
            throw new Error('Required DOM elements not found');
        }
        
        // Type assertions with validation
        this.mapContainer = mapContainer;
        this.routeMap = routeMap as HTMLImageElement;
        
        // Ensure elements are of correct SVG type
        if (!(routePath instanceof SVGPathElement)) {
            console.error('route-path is not an SVGPathElement');
            throw new Error('route-path is not an SVGPathElement');
        }
        this.routePath = routePath;
        
        if (!(routeSvg instanceof SVGSVGElement)) {
            console.error('route-svg is not an SVGSVGElement');
            throw new Error('route-svg is not an SVGSVGElement');
        }
        this.routeSvg = routeSvg;
        
        this.pointsTableBody = pointsTableBody;
        this.manualForm = manualForm as HTMLFormElement;
        this.manualX = manualX as HTMLInputElement;
        this.manualY = manualY as HTMLInputElement;
        this.form = form as HTMLFormElement;
        this.csrf = (csrfElement as HTMLInputElement).value;
        
        // Load existing points
        this.loadExistingPoints();
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Initialize map
        this.initializeMap();
    }
    
    private loadExistingPoints(): void {
        const rows = this.pointsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.dataset.pointId && row.dataset.x && row.dataset.y) {
                this.points.push({
                    id: row.dataset.pointId,
                    x: parseFloat(row.dataset.x),
                    y: parseFloat(row.dataset.y)
                });
            }
        });
    }
    
    private setupEventHandlers(): void {
        // Map click handler
        this.routeMap.addEventListener('click', this.handleMapClick.bind(this));
        
        // Manual form submission
        this.manualForm.addEventListener('submit', this.handleManualFormSubmit.bind(this));
        
        // Delete point handler
        document.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('delete-point')) {
                const pointId = target.dataset.pointId;
                if (pointId) {
                    this.deletePoint(pointId);
                }
            }
        });
        
        // Clear all points handler
        const clearButton = document.getElementById('clear-points');
        if (clearButton) {
            clearButton.addEventListener('click', this.handleClearPoints.bind(this));
        }
        
        // Point highlighting on hover
        this.pointsTableBody.addEventListener('mouseover', this.handlePointHover.bind(this));
        this.pointsTableBody.addEventListener('mouseout', this.handlePointMouseOut.bind(this));
        
        // Window resize handler
        window.addEventListener('resize', () => {
            this.updateSvgSize();
            this.renderPointMarkers();
            this.updatePathLine();
        });
    }
    
    private initializeMap(): void {
        // Wait for image to load before initializing points and SVG
        if (this.routeMap.complete) {
            this.updateSvgSize();
            this.renderPointMarkers();
            this.updatePathLine();
        } else {
            this.routeMap.onload = () => {
                this.updateSvgSize();
                this.renderPointMarkers();
                this.updatePathLine();
            };
        }
    }
    
    private updateSvgSize(): void {
        const rect = this.routeMap.getBoundingClientRect();
        this.routeSvg.setAttribute('width', rect.width.toString());
        this.routeSvg.setAttribute('height', rect.height.toString());
        this.routeSvg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    }
    
    private handleMapClick(e: MouseEvent): void {
        e.preventDefault();
        
        // Get the exact position where the user clicked
        const rect = this.routeMap.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        // Add temporary visual feedback
        this.showClickFeedback(e.clientX - rect.left, e.clientY - rect.top);
        
        // Add the point
        this.addPoint(x, y);
    }
    
    private showClickFeedback(x: number, y: number): void {
        // Create a temporary element to show where user clicked
        const feedback = document.createElement('div');
        feedback.className = 'point-marker click-feedback';
        feedback.style.left = `${x}px`;
        feedback.style.top = `${y}px`;
        feedback.style.backgroundColor = 'green';
        feedback.style.opacity = '0.8';
        feedback.style.transition = 'transform 0.3s, opacity 0.3s';
        
        this.mapContainer.appendChild(feedback);
        
        // Animate and remove after animation
        setTimeout(() => {
            feedback.style.transform = 'scale(1.5)';
            feedback.style.opacity = '0';
            
            setTimeout(() => {
                feedback.remove();
            }, 300);
        }, 10);
    }
    
    private handleManualFormSubmit(e: Event): void {
        e.preventDefault();
        
        const x = parseFloat(this.manualX.value);
        const y = parseFloat(this.manualY.value);
        
        // Validate the input
        if (isNaN(x) || isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) {
            alert('Please enter valid coordinates (values from 0 to 1)');
            return;
        }
        
        // Add the point
        this.addPoint(x, y);
        
        // Clear the form
        this.manualForm.reset();
    }
    
    private handleClearPoints(e: Event): void {
        e.preventDefault();
        
        if (confirm('Are you sure you want to delete all points?')) {
            this.clearAllPoints();
        }
    }
    
    private handlePointHover(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        const row = target.closest('tr');
        
        if (row && row.dataset.x && row.dataset.y) {
            const x = parseFloat(row.dataset.x);
            const y = parseFloat(row.dataset.y);
            
            // Create or update highlight
            if (row.dataset.pointId) {
                this.highlightPoint(x, y, row.dataset.pointId);
            }
        }
    }
    
    private handlePointMouseOut(): void {
        // Remove highlight
        const highlights = document.querySelectorAll('.point-highlight');
        highlights.forEach(highlight => highlight.remove());
    }
    
    private highlightPoint(x: number, y: number, pointId: string): void {
        // Remove any existing highlights
        const highlights = document.querySelectorAll('.point-highlight');
        highlights.forEach(highlight => highlight.remove());
        
        // Get map dimensions
        const rect = this.routeMap.getBoundingClientRect();
        const pixelX = x * rect.width;
        const pixelY = y * rect.height;
        
        // Create highlight element
        const highlight = document.createElement('div');
        highlight.className = 'point-marker point-highlight';
        highlight.style.left = `${pixelX}px`;
        highlight.style.top = `${pixelY}px`;
        highlight.style.backgroundColor = 'yellow';
        highlight.style.width = '15px';
        highlight.style.height = '15px';
        highlight.style.zIndex = '20';
        highlight.style.border = '2px solid black';
        
        this.mapContainer.appendChild(highlight);
        
        // Add pulsating animation
        const animation = highlight.animate(
            [
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0.7 },
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
            ],
            {
                duration: 1000,
                iterations: Infinity
            }
        );
    }
    
    private addPoint(x: number, y: number): void {
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', this.csrf);
        formData.append('x', x.toString());
        formData.append('y', y.toString());
        
        fetch('', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(html => {
            // Reload the page to show the updated points
            location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    
    private deletePoint(pointId: string): void {
        if (confirm('Are you sure you want to delete this point?')) {
            // Find the delete button that has the URL
            const deleteButton = document.querySelector(`button.delete-point[data-point-id="${pointId}"]`) as HTMLElement;
            if (!deleteButton || !deleteButton.dataset.url) {
                console.error('Could not find delete URL for point:', pointId);
                return;
            }
            
            const deleteUrl = deleteButton.dataset.url;
            
            fetch(deleteUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(() => {
                // Reload the page after deletion
                location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }
    }
    
    private clearAllPoints(): void {
        const promises = this.points.map(point => {
            const deleteButton = document.querySelector(`button.delete-point[data-point-id="${point.id}"]`) as HTMLElement;
            if (!deleteButton || !deleteButton.dataset.url) {
                console.error('Could not find delete URL for point:', point.id);
                return Promise.reject(`Could not find delete URL for point: ${point.id}`);
            }
            
            const deleteUrl = deleteButton.dataset.url;
            
            return fetch(deleteUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
        });
        
        Promise.all(promises)
            .then(() => {
                location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
    
    private renderPointMarkers(): void {
        // Remove existing markers
        document.querySelectorAll('.point-marker:not(.point-highlight)').forEach(marker => marker.remove());
        
        const rect = this.routeMap.getBoundingClientRect();
        
        // Add markers for each point
        this.points.forEach((point, index) => {
            const marker = document.createElement('div');
            marker.className = 'point-marker';
            
            // Calculate exact pixel position
            const exactX = point.x * rect.width;
            const exactY = point.y * rect.height;
            
            marker.style.left = `${exactX}px`;
            marker.style.top = `${exactY}px`;
            marker.title = `Point ${index + 1}`;
            marker.dataset.pointId = point.id;
            
            this.mapContainer.appendChild(marker);
        });
    }
    
    private updatePathLine(): void {
        if (this.points.length < 2) {
            this.routePath.setAttribute('d', '');
            return;
        }
        
        // Get the dimensions of the image
        const rect = this.routeMap.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        // Create the path
        const pathData = this.points.map((point, i) => {
            // Calculate exact pixel positions for the SVG path
            const x = point.x * width;
            const y = point.y * height;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        
        this.routePath.setAttribute('d', pathData);
    }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        new RouteEditor();
    } catch (error) {
        console.error('Failed to initialize RouteEditor:', error);
    }
});
