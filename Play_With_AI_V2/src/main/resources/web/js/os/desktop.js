(function() {
    function updateClock() {
        const clock = document.getElementById('taskbarClock');
        if (!clock) {
            return;
        }
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clock.textContent = hours + ':' + minutes;
    }

    function initDesktopIcons() {
        const icons = document.querySelectorAll('.desktop-icon');
        function tryOpen(icon) {
            if (!window.currentUser) {
                if (window.showDialog) {
                    window.showDialog('Vui lòng đăng nhập để vào Desktop.', 'Thông báo');
                }
                return;
            }
            const target = icon.getAttribute('data-open');
            if (!window.osWindowManager && window.showDialog) {
                window.showDialog('Không thể mở cửa sổ (window-manager chưa sẵn sàng).', 'Thông báo');
                return;
            }
            if (target && window.osWindowManager) {
                window.osWindowManager.open(target);
            }
        }

        icons.forEach(function(icon) {
            icon.addEventListener('click', function() {
                tryOpen(icon);
            });
        });
    }

    function initStartButton() {
        const startButton = document.getElementById('startButton');
        const startMenu = document.getElementById('start-menu');
        if (!startButton) {
            return;
        }
        startButton.addEventListener('click', function() {
            if (!window.currentUser) {
                if (window.showDialog) {
                    window.showDialog('Vui lòng đăng nhập để vào Desktop.', 'Thông báo');
                }
                return;
            }
            toggleStartMenu(startMenu);
        });

        document.addEventListener('click', function(event) {
            if (!startMenu || startMenu.hidden) {
                return;
            }
            if (startMenu.contains(event.target) || startButton.contains(event.target)) {
                return;
            }
            startMenu.hidden = true;
        });
    }

    function toggleStartMenu(menu) {
        if (!menu) {
            return;
        }
        const next = menu.hidden;
        menu.hidden = !next ? true : false;
        if (!menu.hidden) {
            updateStartUsername();
            showStartTab('account');
        }
    }

    function updateStartUsername() {
        const label = document.getElementById('startUsername');
        if (label) {
            label.textContent = window.currentUser || '';
        }
    }

    function showStartTab(tabName) {
        const tabAccount = document.getElementById('start-tab-account');
        const tabPassword = document.getElementById('start-tab-password');
        const panelAccount = document.getElementById('start-panel-account');
        const panelPassword = document.getElementById('start-panel-password');

        const isAccount = tabName === 'account';
        if (tabAccount) {
            tabAccount.setAttribute('aria-selected', String(isAccount));
        }
        if (tabPassword) {
            tabPassword.setAttribute('aria-selected', String(!isAccount));
        }
        if (panelAccount) {
            panelAccount.hidden = !isAccount;
        }
        if (panelPassword) {
            panelPassword.hidden = isAccount;
        }
    }

    function parseJson(text) {
        try {
            return JSON.parse(text);
        } catch (error) {
            return null;
        }
    }

    function getApiBase() {
        return (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://play-with-ai-v2.onrender.com';
    }

    function sendJson(url, payload) {
        if (window.fetch) {
            return fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function(response) {
                return response.text().then(function(text) {
                    const data = parseJson(text) || { message: text };
                    if (response.ok) {
                        return data;
                    }
                    const error = new Error(data && data.message ? data.message : 'Request failed');
                    error.status = response.status;
                    error.data = data;
                    throw error;
                });
            });
        }

        return new Promise(function(resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function() {
                if (xhr.readyState !== 4) {
                    return;
                }
                const data = parseJson(xhr.responseText) || { message: xhr.responseText };
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(data);
                } else {
                    const error = new Error(data && data.message ? data.message : 'Request failed');
                    error.status = xhr.status;
                    error.data = data;
                    reject(error);
                }
            };
            xhr.onerror = function() {
                const error = new Error('Network error');
                error.status = 0;
                reject(error);
            };
            xhr.send(JSON.stringify(payload));
        });
    }

    function bindStartMenu() {
        const tabAccount = document.getElementById('start-tab-account');
        const tabPassword = document.getElementById('start-tab-password');
        const closeBtn = document.querySelector('[data-start-close]');
        const logoutBtn = document.getElementById('btnLogout');
        const changeBtn = document.getElementById('btnChangePassword');
        const startMenu = document.getElementById('start-menu');

        if (tabAccount) {
            tabAccount.addEventListener('click', function(event) {
                event.preventDefault();
                showStartTab('account');
            });
        }
        if (tabPassword) {
            tabPassword.addEventListener('click', function(event) {
                event.preventDefault();
                showStartTab('password');
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                if (startMenu) {
                    startMenu.hidden = true;
                }
            });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                window.currentUser = null;
                if (startMenu) {
                    startMenu.hidden = true;
                }
                if (window.messengerStomp && window.messengerStomp.disconnect) {
                    window.messengerStomp.disconnect();
                }
                if (window.messengerUI && window.messengerUI.reset) {
                    window.messengerUI.reset();
                }
                const windows = document.querySelectorAll('.app-window');
                windows.forEach(function(win) {
                    win.hidden = true;
                    win.dataset.state = 'closed';
                });
                const taskbar = document.getElementById('taskbarWindows');
                if (taskbar) {
                    taskbar.innerHTML = '';
                }
                if (window.setLoginVisible) {
                    window.setLoginVisible(true);
                }
            });
        }
        if (changeBtn) {
            changeBtn.addEventListener('click', async function() {
                const oldPass = document.getElementById('oldPassword').value;
                const newPass = document.getElementById('newPassword').value;
                const confirm = document.getElementById('confirmNewPassword').value;
                if (!oldPass || !newPass || !confirm) {
                    if (window.showDialog) {
                        window.showDialog('Vui lòng nhập đầy đủ thông tin.', 'Đổi mật khẩu');
                    }
                    return;
                }
                if (newPass !== confirm) {
                    if (window.showDialog) {
                        window.showDialog('Mật khẩu xác nhận không khớp!', 'Đổi mật khẩu');
                    }
                    return;
                }
                if (!window.currentUser) {
                    if (window.showDialog) {
                        window.showDialog('Bạn chưa đăng nhập.', 'Đổi mật khẩu');
                    }
                    return;
                }
                try {
                    const data = await sendJson(getApiBase() + '/api/auth/change-password', {
                        username: window.currentUser,
                        oldPassword: oldPass,
                        newPassword: newPass
                    });
                    if (window.showDialog) {
                        window.showDialog((data && data.message) ? data.message : 'Đổi mật khẩu thành công!', 'Đổi mật khẩu');
                    }
                    document.getElementById('oldPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmNewPassword').value = '';
                    showStartTab('account');
                } catch (error) {
                    if (window.showDialog) {
                        window.showDialog(error && error.message ? error.message : 'Đổi mật khẩu thất bại.', 'Đổi mật khẩu');
                    }
                }
            });
        }
    }

    function initDesktop() {
        updateClock();
        setInterval(updateClock, 1000);
        initDesktopIcons();
        initStartButton();
        bindStartMenu();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDesktop);
    } else {
        initDesktop();
    }
})();
