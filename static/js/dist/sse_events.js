"use strict";
// Connect to the Django SSE endpoint and handle events
class SSEClient {
    constructor(url) {
        this.eventSource = null;
        if (!!window.EventSource) {
            this.eventSource = new EventSource(url);
            // Listen for custom events
            this.eventSource.addEventListener('newBoard', (event) => {
                console.log('New board created:', event.data);
            });
            this.eventSource.addEventListener('boardUpdated', (event) => {
                console.log('Board updated:', event.data);
            });
            this.eventSource.addEventListener('heartbeat', (event) => {
                // Optionally log or ignore heartbeats
                // console.log('Heartbeat:', event.data);
            });
            // Fallback for generic messages (should rarely be used now)
            this.eventSource.onmessage = (event) => {
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
    // Only connect if user is authenticated
    // @ts-ignore
    if (window.USER_IS_AUTHENTICATED) {
        new SSEClient('/events/');
    }
});
//# sourceMappingURL=sse_events.js.map