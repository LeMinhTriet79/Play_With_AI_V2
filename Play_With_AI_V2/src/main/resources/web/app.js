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

function ensureDialogElements() {
    if (document.getElementById('dialogBackdrop')) {
        return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'dialogBackdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('hidden', '');
    backdrop.style.display = 'none';
    backdrop.innerHTML = `
        <div class="window dialog-window" role="dialog" aria-modal="true" aria-labelledby="dialogTitle">
            <div class="title-bar">
                <div class="title-bar-text" id="dialogTitle">Dialog</div>
                <div class="title-bar-controls">
                    <button aria-label="Close" id="dialogClose"></button>
                </div>
            </div>
            <div class="window-body dialog-body">
                <p class="dialog-message" id="dialogMessage"></p>
                <div class="field-row" id="dialogInputRow">
                    <label for="dialogInput" id="dialogInputLabel">Input</label>
                    <input id="dialogInput" type="text" class="dialog-input">
                </div>
                <div class="dialog-actions">
                    <button id="dialogOk" class="default">OK</button>
                    <button id="dialogCancel">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(backdrop);
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
        cell.title = session.title;
        row.appendChild(cell);

        row.onclick = () => {
            setSelectedSession(row.dataset.id);
            const id = Number(row.dataset.id);
            if (!Number.isNaN(id)) {
                bridgeCall('selectSession', id);
            }
        };

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
        nameCell.title = key.name;
        row.appendChild(nameCell);

        const statusCell = document.createElement('td');
        statusCell.textContent = key.isActive ? '[Đang dùng]' : '';
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
    normalizeChatTables();
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
    window.__currentSessionId = String(id);
    highlightRowById(tbody, String(id));
};

window.setBusy = function(busy) {
    document.getElementById('btnSend').disabled = !!busy;
    document.getElementById('btnNewChat').disabled = !!busy;
    document.getElementById('btnRename').disabled = false;
    document.getElementById('btnDelete').disabled = false;
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
    document.getElementById('bgSelect').disabled = !!busy;
    document.getElementById('userInput').readOnly = !!busy;
    document.getElementById('statusText').textContent = busy ? 'Thinking...' : 'Ready';
};

window.setStatus = function(text) {
    document.getElementById('statusText').textContent = text;
};

window.showInfoDialog = function(message, title) {
    ensureDialogElements();
    const dialogHost = document.getElementById('dialogBackdrop');
    if (dialogHost && typeof window.__openDialog === 'function') {
        window.__openDialog({
            title: title || 'Thông báo',
            message: message || '',
            showInput: false,
            okText: 'OK',
            cancelText: 'Cancel',
            hideCancel: true,
        }, () => {
        });
        return;
    }

    alert(message || '');
};

window.handleRenameClick = function() {
    const id = resolveSelectedSessionId();
    if (Number.isNaN(id)) {
        return;
    }

    const currentTitle = getSelectedSessionTitle();
    ensureDialogElements();
    const dialogHost = document.getElementById('dialogBackdrop');
    if (dialogHost && typeof window.__openDialog === 'function') {
        window.__openDialog({
            title: 'Đổi tên đoạn chat',
            message: 'Nhập tên mới cho đoạn chat:',
            inputLabel: 'Tên mới',
            defaultValue: currentTitle,
            showInput: true,
            okText: 'OK',
            cancelText: 'Cancel',
        }, (result) => {
            if (result && result.confirmed && result.value.trim()) {
                bridgeCall('handleRenameSession', id, result.value.trim());
            }
        });
        return;
    }

    const newName = prompt('Nhập tên mới cho đoạn chat:', currentTitle);
    if (newName && newName.trim()) {
        bridgeCall('handleRenameSession', id, newName.trim());
    }
};

window.handleDeleteClick = function() {
    const id = resolveSelectedSessionId();
    if (Number.isNaN(id)) {
        return;
    }

    ensureDialogElements();
    const dialogHost = document.getElementById('dialogBackdrop');
    if (dialogHost && typeof window.__openDialog === 'function') {
        window.__openDialog({
            title: 'Xóa đoạn chat',
            message: 'Bạn có chắc muốn xóa đoạn chat này?',
            showInput: false,
            okText: 'OK',
            cancelText: 'Cancel',
        }, (result) => {
            if (result && result.confirmed) {
                bridgeCall('handleDeleteSession', id);
            }
        });
        return;
    }

    if (confirm('Bạn có chắc muốn xóa đoạn chat này?')) {
        bridgeCall('handleDeleteSession', id);
    }
};

const initUi = () => {
    // =========================================================================
    // TIÊM CSS ĐỘNG - KẾT HỢP BIẾN CSS VÀ GIAO DIỆN CHUẨN WIN98 (BẢNG, CODE)
    // =========================================================================
    const dynamicStyle = document.createElement('style');
    dynamicStyle.innerHTML = `
        /* Ép toàn bộ chữ trong chat ăn theo biến Font và Size */
        .message-content, .message-content p, .message-content ul, .message-content ol, .message-content li {
            font-family: var(--chat-font-family) !important;
            font-size: var(--chat-font-size) !important;
            color: var(--chat-text-color) !important;
        }

        /* ---------------------------------------------------- */
        /* THIẾT KẾ BẢNG (TABLE) CHUẨN GIAO DIỆN WIN98          */
        /* ---------------------------------------------------- */
        .message-content table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin: 15px 0 !important;
            background-color: var(--chat-bg-color) !important;
        }
        
        /* Tiêu đề Bảng: Màu Xanh Gradient, Chữ Trắng Đậm, Font Hệ Thống */
        .message-content th.title-bar {
            background: #000080 !important;
            background-image: linear-gradient(90deg, #000080, #1084d0) !important;
            border: 1px solid var(--chat-border-color) !important;
            padding: 6px 10px !important;
            text-align: left !important;
        }
        
        /* Chữ trong thanh Tiêu đề Bảng và Code Block */
        .message-content .title-bar-text {
            font-family: "Pixelated MS Sans Serif", "MS Sans Serif", sans-serif !important;
            font-size: 12px !important;
            color: #ffffff !important;
            font-weight: bold !important;
            letter-spacing: 0 !important;
        }

        /* Ô dữ liệu (Cell): Hiệu ứng lắng xuống (Sunken Border) */
        .message-content td {
            font-family: var(--chat-font-family) !important;
            font-size: var(--chat-font-size) !important;
            color: var(--chat-text-color) !important;
            padding: 8px 10px !important;
            /* Đường viền lõm 3D: Xám Trái/Trên - Trắng Phải/Dưới */
            border-top: 2px solid #808080 !important;
            border-left: 2px solid #808080 !important;
            border-bottom: 2px solid #ffffff !important;
            border-right: 2px solid #ffffff !important;
            background-color: var(--chat-panel-color) !important; /* Đổi màu theo Theme */
        }

        /* ---------------------------------------------------- */
        /* THIẾT KẾ KHUNG MÃ NGUỒN (CODE BLOCK)                 */
        /* ---------------------------------------------------- */
        .message-content .window {
            background-color: var(--chat-border-color) !important;
            margin: 15px 0 !important;
            box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px grey, inset 2px 2px #fff !important;
        }
        
        .message-content .window-body .sunken-panel {
            background-color: var(--chat-bg-color) !important;
            border: 2px solid #808080 !important;
            border-bottom-color: #ffffff !important;
            border-right-color: #ffffff !important;
            padding: 10px !important;
            overflow-x: auto !important;
        }

        .message-content pre, .message-content code {
            font-family: "Courier New", Courier, monospace !important;
            font-size: var(--chat-font-size) !important;
            color: var(--chat-text-color) !important;
        }

        /* Inline Code: Đoạn code ngắn trong dòng chữ */
        .message-content code:not(pre code) {
            background-color: rgba(0,0,0,0.1) !important;
            padding: 2px 5px !important;
            border-top: 1px solid #808080 !important;
            border-left: 1px solid #808080 !important;
            border-bottom: 1px solid #ffffff !important;
            border-right: 1px solid #ffffff !important;
            font-size: var(--chat-font-size) !important;
        }

        .modal-backdrop {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.25);
            z-index: 9999;
        }

        .dialog-window {
            width: 420px;
            max-width: calc(100% - 40px);
        }

        .dialog-body {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .dialog-message {
            margin: 0;
        }

        .dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 6px;
            margin-top: 6px;
        }

        .dialog-input {
            width: 100%;
        }
    `;
    document.head.appendChild(dynamicStyle);

    ensureDialogElements();

    const chatArea = document.getElementById('chatArea');
    const userInput = document.getElementById('userInput');
    const fontSelect = document.getElementById('fontSelect');
    const fontSizeRange = document.getElementById('fontSizeRange');
    const fontSizeLabel = document.getElementById('fontSizeLabel');
    const bgSelect = document.getElementById('bgSelect');
    const chatSplitter = document.getElementById('chatSplitter');
    const sidebarSplitter = document.getElementById('sidebarSplitter');
    const chatSidebar = document.getElementById('chatSidebar');
    const chatSplit = document.getElementById('chatSplit');
    const chatComposer = document.getElementById('chatComposer');
    const dialogBackdrop = document.getElementById('dialogBackdrop');
    const dialogTitle = document.getElementById('dialogTitle');
    const dialogMessage = document.getElementById('dialogMessage');
    const dialogInputRow = document.getElementById('dialogInputRow');
    const dialogInputLabel = document.getElementById('dialogInputLabel');
    const dialogInput = document.getElementById('dialogInput');
    const dialogOk = document.getElementById('dialogOk');
    const dialogCancel = document.getElementById('dialogCancel');
    const dialogClose = document.getElementById('dialogClose');

    const dialog = (() => {
        if (!dialogBackdrop || !dialogTitle || !dialogMessage || !dialogInputRow || !dialogInput || !dialogOk || !dialogCancel || !dialogClose) {
            return { open: null };
        }

        let resolver = null;
        let lastFocus = null;
        let showInput = false;
        let isOpen = false;

        const closeDialog = (confirmed) => {
            if (!isOpen) {
                return;
            }
            dialogBackdrop.setAttribute('hidden', '');
            dialogBackdrop.style.display = 'none';
            const value = showInput ? dialogInput.value : '';
            showInput = false;
            isOpen = false;
            if (lastFocus && typeof lastFocus.focus === 'function') {
                lastFocus.focus();
            }
            if (resolver) {
                resolver({ confirmed, value });
            }
            resolver = null;
            lastFocus = null;
        };

        dialogOk.addEventListener('click', () => closeDialog(true));
        dialogCancel.addEventListener('click', () => closeDialog(false));
        dialogClose.addEventListener('click', () => closeDialog(false));

        dialogBackdrop.addEventListener('keydown', (event) => {
            if (!isOpen) {
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDialog(false);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                closeDialog(true);
            }
        });

        return {
            open: (options, onClose) => {
                resolver = typeof onClose === 'function' ? onClose : null;
                lastFocus = document.activeElement;
                const opts = options || {};
                showInput = !!opts.showInput;
                const hideCancel = !!opts.hideCancel;
                dialogTitle.textContent = opts.title || 'Dialog';
                dialogMessage.textContent = opts.message || '';
                dialogInputLabel.textContent = opts.inputLabel || 'Input';
                dialogInputRow.hidden = !showInput;
                dialogInput.value = opts.defaultValue || '';
                dialogOk.textContent = opts.okText || 'OK';
                dialogCancel.textContent = opts.cancelText || 'Cancel';
                dialogCancel.hidden = hideCancel;
                dialogCancel.style.display = hideCancel ? 'none' : '';
                dialogBackdrop.removeAttribute('hidden');
                dialogBackdrop.style.display = 'flex';
                dialogBackdrop.tabIndex = -1;
                dialogBackdrop.focus();
                isOpen = true;

                setTimeout(() => {
                    if (showInput) {
                        dialogInput.focus();
                        dialogInput.select();
                    } else {
                        dialogOk.focus();
                    }
                }, 0);
            },
        };
    })();

    window.__openDialog = typeof dialog.open === 'function' ? dialog.open : null;

    const backgroundPresets = {
        white: { bg: '#ffffff', text: '#000000', panel: '#f8f8f8', border: '#c0c0c0' },
        notepad: { bg: '#fff7c7', text: '#000000', panel: '#fff2a8', border: '#b2a97a' },
        desktop: { bg: '#cfe9f6', text: '#000000', panel: '#e1f1f9', border: '#9cb1bd' },
        matrix: { bg: '#0c2f1b', text: '#d2f9d2', panel: '#0f3a21', border: '#1f5536' },
        dialog: { bg: '#d4d0c8', text: '#000000', panel: '#e6e2dc', border: '#9a968f' },
    };

    const applyTypography = () => {
        const fontFamily = fontSelect.value || 'MS Sans Serif';
        const fontSize = Number(fontSizeRange.value) || 12;
        fontSizeLabel.textContent = String(fontSize);
        // Thay đổi biến CSS gốc - Tự động thay đổi luôn cả bảng biểu và code block
        document.body.style.setProperty('--chat-font-family', fontFamily);
        document.body.style.setProperty('--chat-font-size', `${fontSize}px`);
        chatArea.style.fontFamily = fontFamily;
        chatArea.style.fontSize = `${fontSize}px`;
        userInput.style.fontFamily = fontFamily;
        userInput.style.fontSize = `${fontSize}px`;
        normalizeChatTables();
    };

    const applyBackground = () => {
        const preset = backgroundPresets[bgSelect.value] || backgroundPresets.white;
        // Thay đổi biến CSS nền - Tự động đổi nền bảng biểu và ô dữ liệu
        document.body.style.setProperty('--chat-bg-color', preset.bg);
        document.body.style.setProperty('--chat-text-color', preset.text);
        document.body.style.setProperty('--chat-panel-color', preset.panel);
        document.body.style.setProperty('--chat-border-color', preset.border);
        normalizeChatTables();
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

    const renameBtn = document.getElementById('btnRename');
    if (renameBtn) {
        renameBtn.onclick = window.handleRenameClick;
    }

    const deleteBtn = document.getElementById('btnDelete');
    if (deleteBtn) {
        deleteBtn.onclick = window.handleDeleteClick;
    }

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
    bgSelect.addEventListener('change', applyBackground);

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
    applyBackground();

    setTab('chat');
    window.setBusy(false);
};

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initUi);
} else {
    initUi();
}

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
    if (panel && panel.dataset.selectedId) {
        return Number(panel.dataset.selectedId);
    }

    if (window.__currentSessionId) {
        return Number(window.__currentSessionId);
    }

    const tbody = document.getElementById('sessionTableBody');
    if (tbody) {
        const row = tbody.querySelector('tr.highlighted');
        if (row && row.dataset.id) {
            return Number(row.dataset.id);
        }
        const firstRow = tbody.querySelector('tr');
        if (firstRow && firstRow.dataset.id) {
            return Number(firstRow.dataset.id);
        }
    }
    return Number.NaN;
}

function getSelectedSessionTitle() {
    const tbody = document.getElementById('sessionTableBody');
    if (!tbody) {
        return '';
    }
    const row = tbody.querySelector('tr.highlighted');
    if (!row) {
        return '';
    }
    const cell = row.querySelector('td');
    return cell ? cell.textContent.trim() : '';
}

function resolveSelectedSessionId() {
    let id = getSelectedSessionId();
    if (!Number.isNaN(id)) {
        return id;
    }

    const tbody = document.getElementById('sessionTableBody');
    if (!tbody) {
        return Number.NaN;
    }

    const firstRow = tbody.querySelector('tr');
    if (firstRow && firstRow.dataset.id) {
        setSelectedSession(firstRow.dataset.id);
        id = Number(firstRow.dataset.id);
    }

    return id;
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

function normalizeChatTables() {
    const chatArea = document.getElementById('chatArea');
    if (!chatArea) {
        return;
    }

    const tables = chatArea.querySelectorAll('table');
    tables.forEach((table) => {
        // Đã LƯỢC BỎ lệnh xóa style để giữ nguyên cấu trúc HTML của Java trả về
        // Chỉ thêm class 'interactive' để tương thích 98.css
        table.classList.add('interactive');
    });
}