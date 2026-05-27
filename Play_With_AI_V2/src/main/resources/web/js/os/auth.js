(function() {
    function getApiBase() {
        return (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://play-with-ai-v2.onrender.com';
    }

    function initAuth() {
        if (window.__authBound) {
            return;
        }
        window.__authBound = true;

    function showTab(tabName) {
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const panelLogin = document.getElementById('panel-login');
        const panelRegister = document.getElementById('panel-register');

        const isLogin = tabName === 'login';
        tabLogin.setAttribute('aria-selected', String(isLogin));
        tabRegister.setAttribute('aria-selected', String(!isLogin));
        panelLogin.hidden = !isLogin;
        panelRegister.hidden = isLogin;
    }

    function setLoginVisible(visible) {
        const modal = document.getElementById('login-modal');
        const overlay = document.getElementById('login-overlay');
        if (modal) {
            modal.hidden = !visible;
        }
        if (overlay) {
            overlay.hidden = !visible;
        }
    }

    function showDialog(message, title) {
        const overlay = document.getElementById('dialog-overlay');
        const modal = document.getElementById('dialog-modal');
        const titleEl = document.getElementById('dialog-title');
        const messageEl = document.getElementById('dialog-message');
        if (titleEl) {
            titleEl.textContent = title || 'Thông báo';
        }
        if (messageEl) {
            messageEl.textContent = message || '';
        }
        if (overlay) {
            overlay.hidden = false;
        }
        if (modal) {
            modal.hidden = false;
        }
    }

    function hideDialog() {
        const overlay = document.getElementById('dialog-overlay');
        const modal = document.getElementById('dialog-modal');
        if (overlay) {
            overlay.hidden = true;
        }
        if (modal) {
            modal.hidden = true;
        }
    }

    window.showDialog = showDialog;
    window.hideDialog = hideDialog;
    window.setLoginVisible = setLoginVisible;

    function parseJson(text) {
        try {
            return JSON.parse(text);
        } catch (error) {
            return null;
        }
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

    function showDesktop(username) {
        window.currentUser = username;
        setLoginVisible(false);
        if (window.messengerUI && window.messengerUI.setSelfName) {
            window.messengerUI.setSelfName(username);
        }
        if (window.messengerStomp && window.messengerStomp.connect) {
            window.messengerStomp.connect(username);
        }
    }

    async function handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!username || !password) {
            showDialog('Vui lòng nhập đầy đủ tài khoản và mật khẩu!', 'Đăng nhập');
            return;
        }
        try {
            const data = await sendJson(getApiBase() + '/api/auth/login', {
                username: username,
                password: password
            });
            showDesktop(data && data.username ? data.username : username);
        } catch (error) {
            showDialog(error && error.message ? error.message : 'Đăng nhập thất bại.', 'Đăng nhập');
        }
    }

    async function handleRegister() {
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('registerConfirm').value;
        if (!username || !password || !confirm) {
            showDialog('Vui lòng nhập đầy đủ thông tin đăng ký!', 'Đăng ký');
            return;
        }
        if (password !== confirm) {
            showDialog('Mật khẩu xác nhận không khớp!', 'Đăng ký');
            return;
        }
        try {
            const data = await sendJson(getApiBase() + '/api/auth/register', {
                username: username,
                password: password
            });
            showDialog((data && data.message) ? data.message : 'Đăng ký thành công!', 'Đăng ký');
            showTab('login');
        } catch (error) {
            showDialog(error && error.message ? error.message : 'Đăng ký thất bại.', 'Đăng ký');
        }
    }

        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const btnLogin = document.getElementById('btnLogin');
        const btnRegister = document.getElementById('btnRegister');

        const logClose = document.querySelector('[data-log-close]');

        window.handleLogin = handleLogin;
        window.handleRegister = handleRegister;

        if (tabLogin) {
            tabLogin.addEventListener('click', function(event) {
                event.preventDefault();
                showTab('login');
            });
        }
        if (tabRegister) {
            tabRegister.addEventListener('click', function(event) {
                event.preventDefault();
                showTab('register');
            });
        }
        if (btnLogin) {
            btnLogin.addEventListener('click', handleLogin);
        }
        if (btnRegister) {
            btnRegister.addEventListener('click', handleRegister);
        }
        const dialogClose = document.querySelector('[data-dialog-close]');
        const dialogOk = document.getElementById('dialog-ok');
        if (dialogClose) {
            dialogClose.addEventListener('click', hideDialog);
        }
        if (dialogOk) {
            dialogOk.addEventListener('click', hideDialog);
        }

        showTab('login');
        setLoginVisible(true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();
