function bridgeCall(methodName, ...args) {
    if (window.javaBridge && typeof window.javaBridge[methodName] === 'function') {
        window.javaBridge[methodName](...args);
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parsePayload(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (typeof payload === 'string') {
        try {
            return JSON.parse(payload);
        } catch (error) {
            console.error('Failed to parse payload:', error);
            return [];
        }
    }

    return [];
}

function setTab(tabId) {
    const chatTab = document.getElementById('tab-chat');
    const settingsTab = document.getElementById('tab-settings');
    const chatPanel = document.getElementById('chat-panel');
    const settingsPanel = document.getElementById('settings-panel');

    const showChat = tabId === 'chat';
    chatTab.setAttribute('aria-selected', String(showChat));
    settingsTab.setAttribute('aria-selected', String(!showChat));
    chatPanel.hidden = !showChat;
    settingsPanel.hidden = showChat;
}

window.updateSessions = function(payload) {
    const sessions = parsePayload(payload);
    const tbody = document.getElementById('sessionTableBody');
    const panel = document.getElementById('sessionPanel');
    const previousId = panel ? panel.dataset.selectedId : '';

    tbody.innerHTML = '';
    sessions.forEach((session) => {
        const row = document.createElement('tr');
        row.dataset.id = String(session.id);

        const cell = document.createElement('td');
        cell.textContent = session.title;
        row.appendChild(cell);

        tbody.appendChild(row);
    });

    if (previousId) {
        window.setSelectedSession(previousId);
    }
};

window.updateKeys = function(payload) {
    const keys = parsePayload(payload);
    const tbody = document.getElementById('keyTableBody');
    const panel = document.getElementById('keyPanel');
    const previousId = panel ? panel.dataset.selectedId : '';

    tbody.innerHTML = '';
    keys.forEach((key) => {
        const row = document.createElement('tr');
        row.dataset.id = String(key.id);

        const nameCell = document.createElement('td');
        nameCell.textContent = key.name;
        row.appendChild(nameCell);

        const statusCell = document.createElement('td');
        statusCell.textContent = key.isActive ? 'Đang dùng' : '';
        row.appendChild(statusCell);

        tbody.appendChild(row);
    });

    if (previousId) {
        setSelectedKey(previousId);
    }
};

window.appendMessage = function(sender, html, time, color) {
    const chatArea = document.getElementById('chatArea');
    const message = document.createElement('section');
    const senderClass = color === 'green' ? 'message-ai' : color === 'blue' ? 'message-you' : 'message-system';

    message.className = `message ${senderClass}`;
    message.innerHTML = `
        <div class="message-header">
            <span>${escapeHtml(sender)}</span>
            <span>${escapeHtml(time)}</span>
        </div>
        <div class="message-content">${html}</div>
    `;

    chatArea.appendChild(message);
    chatArea.scrollTop = chatArea.scrollHeight;
};

window.clearChat = function() {
    document.getElementById('chatArea').innerHTML = '';
};

window.clearInput = function() {
    const input = document.getElementById('userInput');
    input.value = '';
    input.focus();
};

window.setSelectedSession = function(id) {
    const panel = document.getElementById('sessionPanel');
    const tbody = document.getElementById('sessionTableBody');
    if (!panel || !tbody) {
        return;
    }

    if (id === null || id === undefined || id === '') {
        panel.dataset.selectedId = '';
        clearHighlightedRows(tbody);
        return;
    }

    panel.dataset.selectedId = String(id);
    highlightRowById(tbody, String(id));
};

window.setBusy = function(busy) {
    document.getElementById('btnSend').disabled = !!busy;
    document.getElementById('btnNewChat').disabled = !!busy;
    document.getElementById('btnRename').disabled = !!busy;
    document.getElementById('btnDelete').disabled = !!busy;
    document.getElementById('btnAddKey').disabled = !!busy;
    document.getElementById('btnDelKey').disabled = !!busy;
    document.getElementById('btnSetKey').disabled = !!busy;
    const sessionPanel = document.getElementById('sessionPanel');
    const keyPanel = document.getElementById('keyPanel');
    if (sessionPanel) {
        sessionPanel.style.pointerEvents = busy ? 'none' : 'auto';
    }
    if (keyPanel) {
        keyPanel.style.pointerEvents = busy ? 'none' : 'auto';
    }
    document.getElementById('modelSelect').disabled = !!busy;
    document.getElementById('fontSelect').disabled = !!busy;
    document.getElementById('fontSizeRange').disabled = !!busy;
    document.getElementById('userInput').readOnly = !!busy;
    document.getElementById('statusText').textContent = busy ? 'Thinking...' : 'Ready';
};

window.setStatus = function(text) {
    document.getElementById('statusText').textContent = text;
};

window.addEventListener('DOMContentLoaded', () => {
    const chatArea = document.getElementById('chatArea');
    const userInput = document.getElementById('userInput');
    const fontSelect = document.getElementById('fontSelect');
    const fontSizeRange = document.getElementById('fontSizeRange');
    const fontSizeLabel = document.getElementById('fontSizeLabel');
    const chatSplitter = document.getElementById('chatSplitter');
    const sidebarSplitter = document.getElementById('sidebarSplitter');
    const chatSidebar = document.getElementById('chatSidebar');
    const chatSplit = document.getElementById('chatSplit');
    const chatComposer = document.getElementById('chatComposer');

    const applyTypography = () => {
        const fontFamily = fontSelect.value || 'MS Sans Serif';
        const fontSize = Number(fontSizeRange.value) || 12;
        fontSizeLabel.textContent = String(fontSize);
        chatArea.style.fontFamily = fontFamily;
        chatArea.style.fontSize = `${fontSize}px`;
        userInput.style.fontFamily = fontFamily;
        userInput.style.fontSize = `${fontSize}px`;
    };

    document.getElementById('tab-chat').addEventListener('click', (event) => {
        event.preventDefault();
        setTab('chat');
    });

    document.getElementById('tab-settings').addEventListener('click', (event) => {
        event.preventDefault();
        setTab('settings');
    });

    document.getElementById('sessionTableBody').addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.id) {
            return;
        }
        setSelectedSession(row.dataset.id);
        const id = Number(row.dataset.id);
        if (!Number.isNaN(id)) {
            bridgeCall('selectSession', id);
        }
    });

    document.getElementById('btnNewChat').addEventListener('click', () => {
        bridgeCall('handleNewSession');
    });

    document.getElementById('btnRename').addEventListener('click', () => {
        const id = getSelectedSessionId();
        if (Number.isNaN(id)) {
            return;
        }

        const newName = prompt('Nhập tên mới cho đoạn chat:');
        if (newName && newName.trim()) {
            bridgeCall('handleRenameSession', id, newName);
        }
    });

    document.getElementById('btnDelete').addEventListener('click', () => {
        const id = getSelectedSessionId();
        if (Number.isNaN(id)) {
            return;
        }

        if (confirm('Bạn có chắc muốn xóa đoạn chat này?')) {
            bridgeCall('handleDeleteSession', id);
        }
    });

    document.getElementById('btnSend').addEventListener('click', () => {
        const text = document.getElementById('userInput').value;
        const model = document.getElementById('modelSelect').value;
        bridgeCall('handleSend', text, model);
    });

    document.getElementById('userInput').addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            document.getElementById('btnSend').click();
        }
    });

    document.getElementById('btnAddKey').addEventListener('click', () => {
        const nameInput = document.getElementById('keyName');
        const valueInput = document.getElementById('keyValue');
        bridgeCall('handleAddKey', nameInput.value, valueInput.value);
        nameInput.value = '';
        valueInput.value = '';
        nameInput.focus();
    });

    document.getElementById('keyTableBody').addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.id) {
            return;
        }
        setSelectedKey(row.dataset.id);
    });

    document.getElementById('btnDelKey').addEventListener('click', () => {
        const id = getSelectedKeyId();
        if (!Number.isNaN(id)) {
            bridgeCall('handleDeleteKey', id);
        }
    });

    document.getElementById('btnSetKey').addEventListener('click', () => {
        const id = getSelectedKeyId();
        if (!Number.isNaN(id)) {
            bridgeCall('handleSetActiveKey', id);
        }
    });

    fontSelect.addEventListener('change', applyTypography);
    fontSizeRange.addEventListener('input', applyTypography);

    if (chatSplitter && chatSplit) {
        let dragging = false;

        chatSplitter.addEventListener('mousedown', (event) => {
            event.preventDefault();
            dragging = true;
            document.body.style.cursor = 'row-resize';
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) {
                return;
            }
            dragging = false;
            document.body.style.cursor = '';
        });

        document.addEventListener('mousemove', (event) => {
            if (!dragging) {
                return;
            }

            const rect = chatSplit.getBoundingClientRect();
            const splitterHeight = chatSplitter.offsetHeight || 7;
            const minChat = 160;
            const minComposer = 110;
            const maxChat = rect.height - minComposer - splitterHeight;
            let nextHeight = event.clientY - rect.top;

            if (nextHeight < minChat) {
                nextHeight = minChat;
            }
            if (nextHeight > maxChat) {
                nextHeight = maxChat;
            }

            chatArea.style.flex = `0 0 ${nextHeight}px`;
            chatComposer.style.flex = '1 1 auto';
        });
    }

    if (sidebarSplitter && chatSidebar) {
        let draggingSidebar = false;

        sidebarSplitter.addEventListener('mousedown', (event) => {
            event.preventDefault();
            draggingSidebar = true;
            document.body.style.cursor = 'col-resize';
        });

        document.addEventListener('mouseup', () => {
            if (!draggingSidebar) {
                return;
            }
            draggingSidebar = false;
            document.body.style.cursor = '';
        });

        document.addEventListener('mousemove', (event) => {
            if (!draggingSidebar) {
                return;
            }

            const rect = chatLayoutRect();
            const minWidth = 180;
            const maxWidth = Math.max(220, rect.width - 420);
            let nextWidth = event.clientX - rect.left;

            if (nextWidth < minWidth) {
                nextWidth = minWidth;
            }
            if (nextWidth > maxWidth) {
                nextWidth = maxWidth;
            }

            chatSidebar.style.flex = `0 0 ${nextWidth}px`;
            chatSidebar.style.width = `${nextWidth}px`;
        });
    }

    applyTypography();

    setTab('chat');
    window.setBusy(false);
});

function clearHighlightedRows(tbody) {
    Array.from(tbody.querySelectorAll('tr.highlighted')).forEach((row) => {
        row.classList.remove('highlighted');
    });
}

function highlightRowById(tbody, id) {
    clearHighlightedRows(tbody);
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach((row) => {
        if (row.dataset.id === id) {
            row.classList.add('highlighted');
        }
    });
}

function getSelectedSessionId() {
    const panel = document.getElementById('sessionPanel');
    if (!panel || !panel.dataset.selectedId) {
        return Number.NaN;
    }
    return Number(panel.dataset.selectedId);
}

function getSelectedKeyId() {
    const panel = document.getElementById('keyPanel');
    if (!panel || !panel.dataset.selectedId) {
        return Number.NaN;
    }
    return Number(panel.dataset.selectedId);
}

function setSelectedKey(id) {
    const panel = document.getElementById('keyPanel');
    const tbody = document.getElementById('keyTableBody');
    if (!panel || !tbody) {
        return;
    }

    if (id === null || id === undefined || id === '') {
        panel.dataset.selectedId = '';
        clearHighlightedRows(tbody);
        return;
    }

    panel.dataset.selectedId = String(id);
    highlightRowById(tbody, String(id));
}

function chatLayoutRect() {
    const layout = document.querySelector('.chat-layout');
    if (!layout) {
        return { left: 0, width: window.innerWidth };
    }
    return layout.getBoundingClientRect();
}
