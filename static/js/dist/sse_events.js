"use strict";
// Toast notification utility
function showToast(message, duration = 3000) {
    let toast = document.createElement('div');
    toast.className = 'simple-toast';
    // Allow HTML for links
    toast.innerHTML = message;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#333',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '6px',
        zIndex: '2147483647', // Increased z-index to ensure toast is always on top
        fontSize: '16px',
        opacity: '0.95',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        pointerEvents: 'auto',
        transition: 'opacity 0.3s'
    });
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
// Helper to escape HTML
function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}
// Connect to the Django SSE endpoint and handle events
class SSEClient {
    constructor(url) {
        this.eventSource = null;
        if (!!window.EventSource) {
            this.eventSource = new EventSource(url);
            // Helper to extract board URL
            function boardUrl(boardId) {
                return `/play/${boardId}/`;
            }
            this.eventSource.addEventListener('newBoard', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const boardTitle = escapeHtml(data.title);
                    const user = escapeHtml(data.user);
                    const boardId = data.board_id;
                    const link = `<a href="${boardUrl(boardId)}" style="color:#4fc3f7;text-decoration:underline;">${boardTitle}</a>`;
                    showToast(`New board ${link} created by ${user}`);
                }
                catch (_a) {
                    showToast('New board created');
                }
            });
            this.eventSource.addEventListener('boardUpdated', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const boardTitle = escapeHtml(data.title);
                    const user = escapeHtml(data.user);
                    const boardId = data.board_id;
                    const link = `<a href="${boardUrl(boardId)}" style="color:#4fc3f7;text-decoration:underline;">${boardTitle}</a>`;
                    showToast(`Board ${link} updated by ${user}`);
                }
                catch (_a) {
                    showToast('Board updated');
                }
            });
            this.eventSource.addEventListener('newPaths', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const user = escapeHtml(data.user);
                    const boardId = data.board_id;
                    const boardTitle = escapeHtml(data.title);
                    const link = `<a href="${boardUrl(boardId)}" style="color:#4fc3f7;text-decoration:underline;">${boardTitle}</a>`;
                    showToast(`New paths created on ${link} by ${user}`);
                }
                catch (_a) {
                    showToast('New paths created');
                }
            });
            this.eventSource.addEventListener('pathsUpdated', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const user = escapeHtml(data.user);
                    const boardId = data.board_id;
                    const boardTitle = escapeHtml(data.title);
                    const link = `<a href="${boardUrl(boardId)}" style="color:#4fc3f7;text-decoration:underline;">${boardTitle}</a>`;
                    showToast(`Paths updated on ${link} by ${user}`);
                }
                catch (_a) {
                    showToast('Paths updated');
                }
            });
            this.eventSource.addEventListener('heartbeat', (event) => {
                // Optionally show heartbeat
                // showToast('Heartbeat: ' + event.data, 1500);
            });
            // Fallback for generic messages (should rarely be used now)
            this.eventSource.onmessage = (event) => {
                showToast('SSE message: ' + event.data);
            };
            this.eventSource.onerror = (event) => {
                showToast('SSE connection error', 4000);
            };
            // You can add more event listeners here if you emit custom events
            // this.eventSource.addEventListener('custom', (event) => { ... });
        }
        else {
            showToast('EventSource not supported in this browser.', 4000);
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