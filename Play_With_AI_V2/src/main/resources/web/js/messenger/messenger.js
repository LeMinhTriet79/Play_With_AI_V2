(function() {
    let currentTarget = '';

    function getTargetInput() {
        return document.getElementById('messengerTarget');
    }

    function getHistoryPanel() {
        return document.getElementById('messengerHistory');
    }

    function setTarget(username) {
        currentTarget = username || '';
        const input = getTargetInput();
        if (input) {
            input.value = currentTarget;
        }
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

        const row = document.createElement('div');
        row.className = 'field-row';

        const label = document.createElement('strong');
        const senderName = message.sender || (direction === 'out' ? 'Me' : 'User');
        label.textContent = senderName + ':';

        const content = document.createElement('span');
        content.textContent = message.content || message.raw || '';

        const time = document.createElement('span');
        time.style.marginLeft = 'auto';
        time.textContent = formatTime();

        row.appendChild(label);
        row.appendChild(content);
        row.appendChild(time);
        history.appendChild(row);
        history.scrollTop = history.scrollHeight;
    }

    function handlePrivateMessage(payload) {
        if (!payload) {
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
            alert('Select a user to chat with.');
            return;
        }
        if (!content) {
            return;
        }
        if (!window.currentUser) {
            alert('Please login first.');
            return;
        }

        const payload = {
            sender: window.currentUser,
            receiver: receiver,
            content: content,
            type: 'CHAT'
        };

        if (window.messengerStomp) {
            window.messengerStomp.sendPrivate(payload);
        }

        appendMessage(payload, 'out');
        input.value = '';
        input.focus();
    }

    function initContactList() {
        const list = document.getElementById('contactList');
        if (!list) {
            return;
        }
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
    }

    document.addEventListener('DOMContentLoaded', function() {
        initContactList();
        initComposer();
        bindStompHandlers();
    });
})();
