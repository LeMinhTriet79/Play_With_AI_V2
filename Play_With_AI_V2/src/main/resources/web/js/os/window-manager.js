(function() {
    let topZ = 40;
    let activeWindow = null;

    function getWindowLayer() {
        return document.getElementById('window-layer');
    }

    function getTaskbar() {
        return document.getElementById('taskbarWindows');
    }

    function getWindowByName(name) {
        return document.querySelector('.app-window[data-window="' + name + '"]');
    }

    function bringToFront(winEl) {
        if (!winEl) {
            return;
        }
        topZ += 1;
        winEl.style.zIndex = String(topZ);
        setActiveWindow(winEl);
    }

    function setActiveWindow(winEl) {
        if (activeWindow && activeWindow !== winEl) {
            const prevTitle = activeWindow.querySelector('.title-bar');
            if (prevTitle) {
                prevTitle.classList.add('inactive');
            }
            activeWindow.classList.remove('active');
        }
        activeWindow = winEl;
        if (activeWindow) {
            const title = activeWindow.querySelector('.title-bar');
            if (title) {
                title.classList.remove('inactive');
            }
            activeWindow.classList.add('active');
        }
        updateTaskbarState();
    }

    function updateTaskbarState() {
        const taskbar = getTaskbar();
        if (!taskbar) {
            return;
        }
        const buttons = taskbar.querySelectorAll('.taskbar-button');
        buttons.forEach(function(button) {
            const name = button.getAttribute('data-task-for');
            const winEl = getWindowByName(name);
            const isActive = winEl && winEl === activeWindow && !winEl.hidden;
            button.classList.toggle('active', Boolean(isActive));
        });
    }

    function ensureTaskButton(winEl) {
        const taskbar = getTaskbar();
        if (!taskbar || !winEl) {
            return null;
        }
        const name = winEl.getAttribute('data-window');
        let button = taskbar.querySelector('[data-task-for="' + name + '"]');
        if (!button) {
            button = document.createElement('button');
            button.className = 'taskbar-button';
            button.setAttribute('data-task-for', name);
            const title = winEl.querySelector('.title-bar-text');
            button.textContent = title ? title.textContent : name;
            button.addEventListener('click', function() {
                if (winEl.hidden || winEl.dataset.state === 'minimized') {
                    openWindow(name);
                } else {
                    minimizeWindow(winEl);
                }
            });
            taskbar.appendChild(button);
        }
        return button;
    }

    function storeBounds(winEl) {
        winEl.dataset.restoreLeft = String(winEl.offsetLeft);
        winEl.dataset.restoreTop = String(winEl.offsetTop);
        winEl.dataset.restoreWidth = String(winEl.offsetWidth);
        winEl.dataset.restoreHeight = String(winEl.offsetHeight);
    }

    function restoreBounds(winEl) {
        if (!winEl.dataset.restoreLeft) {
            return;
        }
        winEl.style.left = winEl.dataset.restoreLeft + 'px';
        winEl.style.top = winEl.dataset.restoreTop + 'px';
        winEl.style.width = winEl.dataset.restoreWidth + 'px';
        winEl.style.height = winEl.dataset.restoreHeight + 'px';
    }

    function maximizeWindow(winEl) {
        if (!winEl || winEl.classList.contains('is-maximized')) {
            return;
        }
        storeBounds(winEl);
        winEl.classList.add('is-maximized');
        winEl.style.left = '0px';
        winEl.style.top = '0px';
        winEl.style.width = '100%';
        winEl.style.height = '100%';
        winEl.style.right = '0px';
        winEl.style.bottom = '0px';
        winEl.style.maxWidth = 'none';
        winEl.style.maxHeight = 'none';
        bringToFront(winEl);
    }

    function restoreWindow(winEl) {
        if (!winEl || !winEl.classList.contains('is-maximized')) {
            return;
        }
        winEl.classList.remove('is-maximized');
        restoreBounds(winEl);
        winEl.style.right = '';
        winEl.style.bottom = '';
        winEl.style.maxWidth = '';
        winEl.style.maxHeight = '';
        bringToFront(winEl);
    }

    function minimizeWindow(winEl) {
        if (!winEl) {
            return;
        }
        winEl.dataset.state = 'minimized';
        winEl.hidden = true;
        updateTaskbarState();
    }

    function closeWindow(winEl) {
        if (!winEl) {
            return;
        }
        winEl.dataset.state = 'closed';
        winEl.hidden = true;
        updateTaskbarState();
    }

    function openWindow(name) {
        const winEl = getWindowByName(name);
        if (!winEl) {
            return;
        }
        winEl.hidden = false;
        winEl.dataset.state = 'open';
        ensureTaskButton(winEl);
        bringToFront(winEl);
    }

    function initDrag(winEl) {
        const titleBar = winEl.querySelector('.title-bar');
        const layer = getWindowLayer();
        if (!titleBar || !layer) {
            return;
        }

        let dragState = null;

        function onMove(event) {
            if (!dragState) {
                return;
            }
            const rect = layer.getBoundingClientRect();
            const left = event.clientX - rect.left - dragState.offsetX;
            const top = event.clientY - rect.top - dragState.offsetY;
            const maxLeft = rect.width - winEl.offsetWidth;
            const maxTop = rect.height - winEl.offsetHeight;

            const nextLeft = Math.max(0, Math.min(maxLeft, left));
            const nextTop = Math.max(0, Math.min(maxTop, top));

            winEl.style.left = nextLeft + 'px';
            winEl.style.top = nextTop + 'px';
        }

        function stopDrag() {
            if (!dragState) {
                return;
            }
            dragState = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', stopDrag);
        }

        titleBar.addEventListener('mousedown', function(event) {
            if (event.button !== 0) {
                return;
            }
            if (event.target.closest('[data-window-control]')) {
                return;
            }
            if (winEl.classList.contains('is-maximized')) {
                return;
            }
            bringToFront(winEl);
            const rect = winEl.getBoundingClientRect();
            dragState = {
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', stopDrag);
        });
    }

    function initWindow(winEl) {
        if (!winEl) {
            return;
        }
        winEl.style.zIndex = String(++topZ);
        winEl.addEventListener('mousedown', function() {
            bringToFront(winEl);
        });
        initDrag(winEl);
    }

    function initControls() {
        const layer = getWindowLayer();
        if (!layer) {
            return;
        }
        layer.addEventListener('click', function(event) {
            const button = event.target.closest('[data-window-control]');
            if (!button) {
                return;
            }
            const winEl = button.closest('.app-window');
            if (!winEl) {
                return;
            }
            const action = button.getAttribute('data-window-control');
            if (action === 'minimize') {
                minimizeWindow(winEl);
            } else if (action === 'maximize') {
                if (winEl.classList.contains('is-maximized')) {
                    restoreWindow(winEl);
                } else {
                    maximizeWindow(winEl);
                }
            } else if (action === 'close') {
                closeWindow(winEl);
            }
        });
    }

    function initAll() {
        const layer = getWindowLayer();
        if (!layer) {
            return;
        }
        const windows = layer.querySelectorAll('.app-window');
        windows.forEach(function(winEl) {
            initWindow(winEl);
        });
        initControls();
    }

    window.osWindowManager = {
        open: openWindow,
        close: closeWindow,
        minimize: minimizeWindow,
        maximize: maximizeWindow,
        restore: restoreWindow,
        bringToFront: bringToFront,
        init: initAll
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
