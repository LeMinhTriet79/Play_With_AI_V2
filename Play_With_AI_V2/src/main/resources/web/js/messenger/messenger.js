(function() {
    let currentTarget = '';
    let presenceTimer = null;
    let statusCache = [];

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
        currentTarget = username || '';
        const input = getTargetInput();
        if (input) {
            input.value = currentTarget;
        }
        renderContacts(mergeContacts(statusCache, loadContacts()));
        if (currentTarget) {
            loadConversation(currentTarget);
        }
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
            empty.textContent = 'Chưa có danh bạ';
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

    function addContact(name) {
        const cleaned = String(name || '').trim();
        if (!cleaned) {
            showNotice('Vui lòng nhập username để thêm.', 'Danh bạ');
            return;
        }
        if (window.currentUser && cleaned === window.currentUser) {
            showNotice('Không thể thêm chính bạn vào danh bạ.', 'Danh bạ');
            return;
        }
        const list = loadContacts();
        if (list.includes(cleaned)) {
            showNotice('Username này đã có trong danh bạ.', 'Danh bạ');
            return;
        }
        list.push(cleaned);
        saveContacts(list);
        renderContacts(mergeContacts(statusCache, list));
        setTarget(cleaned);
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
        bubble.className = 'message-bubble';

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

        bubble.appendChild(meta);
        bubble.appendChild(content);
        row.appendChild(bubble);
        history.appendChild(row);
        history.scrollTop = history.scrollHeight;
    }

    function handlePrivateMessage(payload) {
        if (!payload) {
            return;
        }
        if (payload.recalled) {
            applyRecall(payload);
            return;
        }
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
                if (event.ctrlKey && event.key === 'Enter') {
                    event.preventDefault();
                    sendCurrentMessage();
                }
            });
        }
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
            statusCache = Array.isArray(list) ? list : [];
            renderContacts(statusCache);
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
        history.innerHTML = '<div class="messenger-empty" id="messengerEmpty">Đang tải...</div>';
        if (!window.currentUser || !target) {
            return;
        }
        const url = getApiBase() + '/api/chat/history?user1=' + encodeURIComponent(window.currentUser)
            + '&user2=' + encodeURIComponent(target);

        fetchJson(url).then(function(list) {
            renderHistory(Array.isArray(list) ? list : []);
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
        setSelfName('Chưa đăng nhập');
        setStatus('Disconnected');
        stopPresencePolling();
        const history = getHistoryPanel();
        if (history) {
            history.innerHTML = '<div class="messenger-empty" id="messengerEmpty">Chưa có tin nhắn.</div>';
        }
        renderContacts([]);
    }

    document.addEventListener('DOMContentLoaded', function() {
        initContactList();
        initComposer();
        bindStompHandlers();
        setSelfName(window.currentUser || 'Chưa đăng nhập');
    });

    window.messengerUI = {
        setSelfName: setSelfName,
        setTarget: setTarget,
        reset: resetUi
    };
})();
