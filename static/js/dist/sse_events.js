"use strict";
// Connect to the Django SSE endpoint and handle events
class SSEClient {
    constructor(url) {
        this.eventSource = null;
        if (!!window.EventSource) {
            this.eventSource = new EventSource(url);
            this.eventSource.onmessage = (event) => {
                // Handle generic messages (if any)
                console.log('SSE message:', event.data);
            };
            this.eventSource.onerror = (event) => {
                console.error('SSE connection error:', event);
            };
            // You can add more event listeners here if you emit custom events
            // this.eventSource.addEventListener('custom', (event) => { ... });
        }
        else {
            console.warn('EventSource not supported in this browser.');
        }
    }
    close() {
        if (this.eventSource) {
            this.eventSource.close();
        }
    }
}
// Initialize SSE client on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Only connect if on a page where SSE is needed, or always if you want
    new SSEClient('/events/');
});
//# sourceMappingURL=sse_events.js.map