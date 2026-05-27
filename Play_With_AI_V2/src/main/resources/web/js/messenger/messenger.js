(function() {
    let currentTarget = '';
    const STORAGE_KEY = 'messenger.contacts';

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

    function getContactInput() {
        return document.getElementById('contactInput');
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
    }

    function loadContacts() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const list = JSON.parse(raw || '[]');
            return Array.isArray(list) ? list : [];
        } catch (error) {
            return [];
        }
    }

    function saveContacts(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
        } catch (error) {
            return;
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
        list.forEach(function(name) {
            const item = document.createElement('li');
            item.setAttribute('data-user', name);
            item.textContent = name;
            container.appendChild(item);
        });
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
        renderContacts(list);
        setTarget(cleaned);
    }

    function formatTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return hours + ':' + minutes;
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

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        const meta = document.createElement('div');
        meta.className = 'message-meta';

        const sender = document.createElement('span');
        sender.textContent = direction === 'out' ? 'Bạn' : (message.sender || 'User');

        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = formatTime();

        meta.appendChild(sender);
        meta.appendChild(time);

        const content = document.createElement('div');
        content.className = 'message-text';
        content.textContent = message.content || message.raw || '';

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
        const direction = payload.sender === window.currentUser ? 'out' : 'in';
        if (direction === 'in' && payload.sender && !currentTarget) {
            setTarget(payload.sender);
        }
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
        const addBtn = document.getElementById('btnAddContact');
        const input = getContactInput();
        if (!list) {
            return;
        }
        renderContacts(loadContacts());

        list.addEventListener('click', function(event) {
            const item = event.target.closest('li[data-user]');
            if (!item) {
                return;
            }
            setTarget(item.getAttribute('data-user'));
        });

        if (addBtn) {
            addBtn.addEventListener('click', function() {
                const value = input ? input.value : '';
                addContact(value);
                if (input) {
                    input.value = '';
                    input.focus();
                }
            });
        }
        if (input) {
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addContact(input.value);
                    input.value = '';
                }
            });
        }
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

    function resetUi() {
        currentTarget = '';
        setSelfName('Chưa đăng nhập');
        setStatus('Disconnected');
        const history = getHistoryPanel();
        if (history) {
            history.innerHTML = '<div class="messenger-empty" id="messengerEmpty">Chưa có tin nhắn.</div>';
        }
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
