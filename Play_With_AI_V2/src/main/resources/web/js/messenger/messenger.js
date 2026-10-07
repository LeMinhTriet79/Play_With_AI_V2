(function() {
    let currentTarget = '';
    let presenceTimer = null;
    let statusCache = [];
    let statusSignature = '';
    let pendingTarget = '';
    const LAST_TARGET_KEY = 'messenger.lastTarget';
    const HISTORY_KEY_PREFIX = 'messenger.history.';
    const HISTORY_LIMIT = 200;

    function getApiBase() {
        return (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://play-with-ai-v2.onrender.com';
    }

    function showNotice(message, title) {
        if (window.showDialog) {
            window.showDialog(message, title || 'Messenger');
            return;
        }
        alert(message);
    }

    function getTargetInput() {
        return document.getElementById('messengerTarget');
    }

    function getHistoryPanel() {
        return document.getElementById('messengerHistory');
    }

    function getContactList() {
        return document.getElementById('contactList');
    }

    function getSelfLabel() {
        return document.getElementById('messengerSelfName');
    }

    function getStatusLabel() {
        return document.getElementById('messengerSelfStatus');
    }

    function setSelfName(name) {
        const label = getSelfLabel();
        if (label) {
            label.textContent = name || 'Chưa đăng nhập';
        }
        if (name && name !== 'Chưa đăng nhập') {
            pendingTarget = getLastTarget() || '';
            startPresencePolling();
        }
    }

    function setStatus(text) {
        const label = getStatusLabel();
        if (label) {
            label.textContent = text || 'Disconnected';
        }
    }

    function setTarget(username) {
        const nextTarget = username || '';
        if (nextTarget === currentTarget) {
            highlightContact(currentTarget);
            return;
        }
        currentTarget = nextTarget;
        const input = getTargetInput();
        if (input) {
            input.value = currentTarget;
        }
        rememberTarget(currentTarget);
        highlightContact(currentTarget);
        if (currentTarget) {
            loadConversation(currentTarget);
        }
    }

    function highlightContact(username) {
        const list = getContactList();
        if (!list) {
            return;
        }
        Array.from(list.querySelectorAll('.contact-item.selected')).forEach(function(item) {
            item.classList.remove('selected');
        });
        if (!username) {
            return;
        }
        const selected = list.querySelector('li[data-user="' + username + '"]');
        if (selected) {
            selected.classList.add('selected');
        }
    }

    function rememberTarget(username) {
        const key = getLastTargetKey();
        try {
            if (!username) {
                localStorage.removeItem(key);
                return;
            }
            localStorage.setItem(key, username);
        } catch (error) {
            return;
        }
    }

    function getLastTarget() {
        const key = getLastTargetKey();
        try {
            return localStorage.getItem(key) || '';
        } catch (error) {
            return '';
        }
    }

    function getLastTargetKey() {
        const me = String(window.currentUser || '').trim().toLowerCase();
        if (!me) {
            return LAST_TARGET_KEY;
        }
        return LAST_TARGET_KEY + '.' + me;
    }

    function renderContacts(list) {
        const container = getContactList();
        if (!container) {
            return;
        }
        container.innerHTML = '';
        if (!list || list.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'contact-empty';
            empty.textContent = 'Chưa có người dùng';
            container.appendChild(empty);
            return;
        }
        const online = list.filter(function(item) { return item.online; });
        const offline = list.filter(function(item) { return !item.online; });

        appendGroup(container, 'Online', online);
        appendGroup(container, 'Offline', offline);
    }

    function appendGroup(container, title, entries) {
        const group = document.createElement('li');
        group.className = 'contact-group';
        group.textContent = title;
        container.appendChild(group);

        if (!entries || entries.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'contact-empty';
            empty.textContent = 'Trống';
            container.appendChild(empty);
        } else {
            entries.forEach(function(entry) {
                const item = document.createElement('li');
                item.className = 'contact-item ' + (entry.online ? 'online' : 'offline');
                if (entry.username === window.currentUser) {
                    item.classList.add('self');
                } else {
                    item.setAttribute('data-user', entry.username);
                }
                if (entry.username === currentTarget) {
                    item.classList.add('selected');
                }

                const name = document.createElement('span');
                name.className = 'contact-name';
                name.textContent = entry.username;

                const badge = document.createElement('span');
                badge.className = 'contact-badge';
                badge.textContent = entry.username === window.currentUser ? 'Bạn' : (entry.online ? 'Online' : 'Offline');

                item.appendChild(name);
                item.appendChild(badge);
                container.appendChild(item);
            });
        }
    }

    function formatTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return hours + ':' + minutes;
    }

    function formatTimestamp(value) {
        if (!value) {
            return formatTime();
        }
        const parts = String(value).split(' ');
        if (parts.length > 1) {
            return parts[1].slice(0, 5);
        }
        return String(value);
    }

    function getHistoryKey(user1, user2) {
        const first = String(user1 || '').trim().toLowerCase();
        const second = String(user2 || '').trim().toLowerCase();
        if (!first || !second) {
            return '';
        }
        const pair = first < second ? first + '__' + second : second + '__' + first;
        return HISTORY_KEY_PREFIX + pair;
    }

    function readHistoryCache(user1, user2) {
        const key = getHistoryKey(user1, user2);
        if (!key) {
            return [];
        }
        try {
            const raw = localStorage.getItem(key);
            const list = JSON.parse(raw || '[]');
            return Array.isArray(list) ? list : [];
        } catch (error) {
            return [];
        }
    }

    function writeHistoryCache(user1, user2, list) {
        const key = getHistoryKey(user1, user2);
        if (!key) {
            return;
        }
        const data = Array.isArray(list) ? list.slice(-HISTORY_LIMIT) : [];
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            return;
        }
    }

    function upsertHistory(list, message) {
        if (!Array.isArray(list)) {
            list = [];
        }
        if (!message) {
            return list;
        }
        if (message.id) {
            const index = list.findIndex(function(item) {
                return item && item.id === message.id;
            });
            if (index >= 0) {
                list[index] = Object.assign({}, list[index], message);
                return list;
            }
        }
        list.push(message);
        return list;
    }

    function updateHistoryCache(message) {
        if (!message || !window.currentUser) {
            return;
        }
        const other = message.sender === window.currentUser ? message.receiver : message.sender;
        if (!other) {
            return;
        }
        const list = readHistoryCache(window.currentUser, other);
        const updated = upsertHistory(list, message);
        writeHistoryCache(window.currentUser, other, updated);
    }

    function appendMessage(message, direction) {
        const history = getHistoryPanel();
        if (!history) {
            return;
        }
        const empty = document.getElementById('messengerEmpty');
        if (empty) {
            empty.remove();
        }

        const row = document.createElement('div');
        row.className = 'message-row ' + (direction === 'out' ? 'message-row-out' : 'message-row-in');
        if (message && message.id) {
            row.dataset.messageId = message.id;
        }

        const bubble = document.createElement('div');
        bubble.className = 'window message-bubble';

        const body = document.createElement('div');
        body.className = 'window-body';

        const meta = document.createElement('div');
        meta.className = 'message-meta';

        const sender = document.createElement('span');
        sender.textContent = direction === 'out' ? 'Bạn' : (message.sender || 'User');

        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = formatTimestamp(message && message.timestamp);

        if (direction === 'out' && message && message.id && !message.recalled) {
            const recallBtn = document.createElement('button');
            recallBtn.className = 'message-action';
            recallBtn.textContent = 'Thu hồi';
            recallBtn.addEventListener('click', function() {
                recallMessage(message.id);
            });
            time.appendChild(recallBtn);
        }

        meta.appendChild(sender);
        meta.appendChild(time);

        const content = document.createElement('div');
        content.className = 'message-text';
        if (message.recalled) {
            bubble.classList.add('recalled');
            content.textContent = 'Tin nhắn đã thu hồi.';
        } else {
            content.textContent = message.content || message.raw || '';
        }

        body.appendChild(meta);
        body.appendChild(content);
        bubble.appendChild(body);
        row.appendChild(bubble);
        history.appendChild(row);
        history.scrollTop = history.scrollHeight;
    }

    function handlePrivateMessage(payload) {
        if (!payload) {
            return;
        }
        if (payload.recalled) {
            updateHistoryCache(payload);
            applyRecall(payload);
            return;
        }
        updateHistoryCache(payload);
        if (!isCurrentConversation(payload)) {
            if (payload.sender && payload.sender !== window.currentUser) {
                showNotice('Tin nhắn mới từ ' + payload.sender + '.', 'Messenger');
            }
            return;
        }
        const direction = payload.sender === window.currentUser ? 'out' : 'in';
        appendMessage(payload, direction);
    }

    function handlePublicMessage(payload) {
        if (!payload) {
            return;
        }
        appendMessage({
            sender: payload.sender || 'Public',
            content: payload.content || payload.raw || ''
        }, 'in');
    }

    function sendCurrentMessage() {
        const input = document.getElementById('messengerInput');
        if (!input) {
            return;
        }
        const content = input.value.trim();
        const receiver = getTargetInput() ? getTargetInput().value.trim() : '';
        if (!receiver) {
            showNotice('Vui lòng nhập username người nhận.', 'Messenger');
            return;
        }
        if (!content) {
            return;
        }
        if (!window.currentUser) {
            showNotice('Vui lòng đăng nhập trước.', 'Messenger');
            return;
        }
        if (receiver === window.currentUser) {
            showNotice('Bạn không thể nhắn tin cho chính mình.', 'Messenger');
            return;
        }
        if (!window.messengerStomp || !window.messengerStomp.isConnected()) {
            showNotice('Chưa kết nối đến server chat.', 'Messenger');
            return;
        }

        if (receiver !== currentTarget) {
            setTarget(receiver);
        }

        const payload = {
            sender: window.currentUser,
            receiver: receiver,
            content: content,
            type: 'CHAT'
        };

        window.messengerStomp.sendPrivate(payload);
        input.value = '';
        input.focus();
    }

    function initContactList() {
        const list = document.getElementById('contactList');
        if (!list) {
            return;
        }
        renderContacts(statusCache);
        highlightContact(currentTarget);

        list.addEventListener('click', function(event) {
            const item = event.target.closest('li[data-user]');
            if (!item) {
                return;
            }
            setTarget(item.getAttribute('data-user'));
        });
    }

    function initComposer() {
        const input = document.getElementById('messengerInput');
        const sendBtn = document.getElementById('btnSendPrivate');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendCurrentMessage);
        }
        if (input) {
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendCurrentMessage();
                }
            });
        }
    }

    function initSplitter() {
        const splitter = document.getElementById('messengerSplitter');
        const history = document.getElementById('messengerHistory');
        const composer = document.getElementById('messengerComposer');
        const splitContainer = document.getElementById('messengerSplit');
        let isDragging = false;

        if (!splitter || !history || !composer || !splitContainer) return;

        splitter.addEventListener('mousedown', function(event) {
            event.preventDefault();
            isDragging = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function(event) {
            if (!isDragging) return;
            const rect = splitContainer.getBoundingClientRect();
            const splitterHeight = splitter.offsetHeight || 7;
            const minChat = 100;
            const minComposer = 80;
            const maxChat = rect.height - minComposer - splitterHeight;
            let nextHeight = event.clientY - rect.top;

            if (nextHeight < minChat) {
                nextHeight = minChat;
            }
            if (nextHeight > maxChat) {
                nextHeight = maxChat;
            }
            
            history.style.flex = '0 0 ' + nextHeight + 'px';
            composer.style.flex = '1 1 auto';
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = 'default';
                document.body.style.webkitUserSelect = '';
                document.body.style.userSelect = '';
            }
        });
    }

    function bindStompHandlers() {
        if (!window.messengerStomp) {
            return;
        }
        window.messengerStomp.on('private', handlePrivateMessage);
        window.messengerStomp.on('public', handlePublicMessage);
        window.messengerStomp.on('status', setStatus);
    }

    function isCurrentConversation(message) {
        const me = window.currentUser || '';
        if (!me || !currentTarget) {
            return false;
        }
        const sender = message.sender || '';
        const receiver = message.receiver || '';
        return (sender === me && receiver === currentTarget) || (sender === currentTarget && receiver === me);
    }

    function fetchJson(url) {
        return fetch(url).then(function(response) {
            return response.text().then(function(text) {
                let data = null;
                try {
                    data = JSON.parse(text);
                } catch (error) {
                    data = text;
                }
                if (!response.ok) {
                    const error = new Error(data && data.message ? data.message : 'Request failed');
                    error.status = response.status;
                    throw error;
                }
                return data;
            });
        });
    }

    function fetchStatuses() {
        if (!window.currentUser) {
            return;
        }
        const url = getApiBase() + '/api/users/status';
        fetchJson(url).then(function(list) {
            const nextList = Array.isArray(list) ? list : [];
            const signature = nextList.map(function(item) {
                return item.username + ':' + (item.online ? '1' : '0');
            }).join('|');
            if (signature !== statusSignature) {
                statusCache = nextList;
                statusSignature = signature;
                renderContacts(statusCache);
            }
            highlightContact(currentTarget);
            if (pendingTarget && pendingTarget !== window.currentUser) {
                const nextTarget = pendingTarget;
                pendingTarget = '';
                setTarget(nextTarget);
            }
        }).catch(function() {
            return;
        });
    }

    function startPresencePolling() {
        if (presenceTimer) {
            return;
        }
        fetchStatuses();
        presenceTimer = setInterval(fetchStatuses, 5000);
    }

    function stopPresencePolling() {
        if (!presenceTimer) {
            return;
        }
        clearInterval(presenceTimer);
        presenceTimer = null;
    }

    function loadConversation(target) {
        const history = getHistoryPanel();
        if (!history) {
            return;
        }
        if (!window.currentUser || !target) {
            return;
        }
        const cached = readHistoryCache(window.currentUser, target);
        if (cached.length > 0) {
            renderHistory(cached);
        } else {
            history.innerHTML = '<div class="messenger-empty" id="messengerEmpty">Đang tải...</div>';
        }
        const url = getApiBase() + '/api/chat/history?user1=' + encodeURIComponent(window.currentUser)
            + '&user2=' + encodeURIComponent(target);

        fetchJson(url).then(function(list) {
            const historyList = Array.isArray(list) ? list : [];
            writeHistoryCache(window.currentUser, target, historyList);
            renderHistory(historyList);
        }).catch(function() {
            history.innerHTML = '<div class="messenger-empty" id="messengerEmpty">Không tải được lịch sử.</div>';
        });
    }

    function recallMessage(messageId) {
        if (!messageId) {
            return;
        }
        if (!window.messengerStomp || !window.messengerStomp.isConnected()) {
            showNotice('Chưa kết nối đến server chat.', 'Messenger');
            return;
        }
        window.messengerStomp.sendRecall({
            id: messageId,
            sender: window.currentUser
        });
    }

    function applyRecall(message) {
        if (!message || !message.id) {
            return;
        }
        const row = document.querySelector('.message-row[data-message-id="' + message.id + '"]');
        if (!row) {
            if (isCurrentConversation(message)) {
                const direction = message.sender === window.currentUser ? 'out' : 'in';
                appendMessage(message, direction);
            }
            return;
        }
        const bubble = row.querySelector('.message-bubble');
        const text = row.querySelector('.message-text');
        const action = row.querySelector('.message-action');
        if (bubble) {
            bubble.classList.add('recalled');
        }
        if (text) {
            text.textContent = 'Tin nhắn đã thu hồi.';
        }
        if (action) {
            action.remove();
        }
    }

    function renderHistory(list) {
        const history = getHistoryPanel();
        if (!history) {
            return;
        }
        history.innerHTML = '';
        if (!list || list.length === 0) {
            history.innerHTML = '<div class="messenger-empty" id="messengerEmpty">Chưa có tin nhắn.</div>';
            return;
        }
        list.forEach(function(message) {
            const direction = message.sender === window.currentUser ? 'out' : 'in';
            appendMessage(message, direction);
        });
    }

    function resetUi() {
        currentTarget = '';
        pendingTarget = '';
        setSelfName('Chưa đăng nhập');
        setStatus('Disconnected');
        stopPresencePolling();
        const history = getHistoryPanel();
        if (history) {
            history.innerHTML = '<div class="messenger-empty" id="messengerEmpty">Chưa có tin nhắn.</div>';
        }
        renderContacts([]);
    }

    function initSettings() {
        const msgBgSelect = document.getElementById('msgBgSelect');
        const msgFontSelect = document.getElementById('msgFontSelect');
        const msgFontSizeRange = document.getElementById('msgFontSizeRange');
        const messengerWindow = document.getElementById('window-messenger');

        const backgroundPresets = {
            white: { bg: '#ffffff', text: '#000000' },
            notepad: { bg: '#fff7c7', text: '#000000' },
            desktop: { bg: '#cfe9f6', text: '#000000' },
            matrix: { bg: '#0c2f1b', text: '#d2f9d2' },
            dialog: { bg: '#d4d0c8', text: '#000000' }
        };

        function applyMessengerTheme() {
            if (!messengerWindow) return;
            const fontFamily = msgFontSelect ? msgFontSelect.value || 'MS Sans Serif' : 'MS Sans Serif';
            const fontSize = msgFontSizeRange ? Number(msgFontSizeRange.value) || 11 : 11;
            const preset = msgBgSelect ? backgroundPresets[msgBgSelect.value] || backgroundPresets.white : backgroundPresets.white;

            messengerWindow.style.setProperty('--msg-font-family', fontFamily);
            messengerWindow.style.setProperty('--msg-font-size', `${fontSize}px`);
            messengerWindow.style.setProperty('--msg-bg-color', preset.bg);
            messengerWindow.style.setProperty('--msg-text-color', preset.text);
        }

        if (msgBgSelect) msgBgSelect.addEventListener('change', applyMessengerTheme);
        if (msgFontSelect) msgFontSelect.addEventListener('change', applyMessengerTheme);
        if (msgFontSizeRange) msgFontSizeRange.addEventListener('input', applyMessengerTheme);

        applyMessengerTheme();
    }

    document.addEventListener('DOMContentLoaded', function() {
        initContactList();
        initComposer();
        initSplitter();
        initSettings();
        bindStompHandlers();
        setSelfName(window.currentUser || 'Chưa đăng nhập');
    });

    window.messengerUI = {
        setSelfName: setSelfName,
        setTarget: setTarget,
        reset: resetUi
    };
})();
