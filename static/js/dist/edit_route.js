"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const routeMap = document.getElementById('route-map');
    if (routeMap) {
        routeMap.addEventListener('click', (e) => {
            var _a;
            const rect = routeMap.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const csrfToken = (_a = document.querySelector('[name=csrfmiddlewaretoken]')) === null || _a === void 0 ? void 0 : _a.value;
            const formData = new FormData();
            formData.append('csrfmiddlewaretoken', csrfToken);
            formData.append('x', x.toString());
            formData.append('y', y.toString());
            fetch('', {
                method: 'POST',
                body: formData
            })
                .then(response => {
                if (response.ok) {
                    location.reload();
                }
            })
                .catch(error => console.error('Error:', error));
        });
    }
});
//# sourceMappingURL=edit_route.js.map