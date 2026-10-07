(function() {
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://play-with-ai-v2.onrender.com';
    
    // --- LOBBY ELEMENTS ---
    const lobbyView = document.getElementById('chess-lobby');
    const roomList = document.getElementById('chessRoomList');
    const btnRefreshLobby = document.getElementById('btnChessRefreshLobby');
    const btnCreateRoom = document.getElementById('btnChessCreateRoom');
    
    // --- GAME ELEMENTS ---
    const gameView = document.getElementById('chess-game-area');
    const boardEl = document.getElementById('chessBoard');
    const turnText = document.getElementById('chessTurnText');
    const playerRedText = document.getElementById('chessPlayerRed');
    const playerBlackText = document.getElementById('chessPlayerBlack');
    const gameRoomName = document.getElementById('chessGameRoomName');
    const logArea = document.getElementById('chessLogArea');
    const chatInput = document.getElementById('chessChatInput');
    const btnSendChat = document.getElementById('btnChessSendChat');
    const btnLeave = document.getElementById('btnChessLeave');
    const btnResign = document.getElementById('btnChessResign');
    const btnDraw = document.getElementById('btnChessDraw');
    const waitingOverlay = document.getElementById('chessWaitingOverlay');
    const onlineUsersList = document.getElementById('chessOnlineUsers');

    let mySide = null; // 'red' or 'black'
    let currentTurn = 'red';
    let isConnected = false;
    let selectedCell = null;
    let roomId = null;
    let isGameActive = false;

    let board = [];
    const INITIAL_BOARD = [
        ['br', 'bh', 'be', 'ba', 'bg', 'ba', 'be', 'bh', 'br'],
        ['', '', '', '', '', '', '', '', ''],
        ['', 'bc', '', '', '', '', '', 'bc', ''],
        ['bs', '', 'bs', '', 'bs', '', 'bs', '', 'bs'],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['rs', '', 'rs', '', 'rs', '', 'rs', '', 'rs'],
        ['', 'rc', '', '', '', '', '', 'rc', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['rr', 'rh', 're', 'ra', 'rg', 'ra', 're', 'rh', 'rr']
    ];

    const PIECE_NAMES = {
        'br': '車', 'bh': '馬', 'be': '象', 'ba': '士', 'bg': '將', 'bc': '砲', 'bs': '卒',
        'rr': '車', 'rh': '馬', 're': '相', 'ra': '仕', 'rg': '帥', 'rc': '炮', 'rs': '兵'
    };

    // --- LOBBY LOGIC ---
    function fetchRooms() {
        if (!window.currentUser) return;
        fetch(API_BASE + '/api/chess/rooms')
            .then(res => res.json())
            .then(rooms => {
                roomList.innerHTML = '';
                if (rooms.length === 0) {
                    roomList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 10px;">Chưa có bàn nào. Hãy mở bàn mới!</td></tr>';
                } else {
                    rooms.forEach(room => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td style="padding: 5px;">#${room.roomId}</td>
                            <td style="padding: 5px;">10p</td>
                            <td style="padding: 5px; color:red; font-weight:bold;">
                                <div style="display:inline-block; width:8px; height:8px; background:red; margin-right:5px;"></div>
                                ${room.playerRed || '-'}
                            </td>
                            <td style="padding: 5px; font-weight:bold;">
                                <div style="display:inline-block; width:8px; height:8px; background:black; margin-right:5px;"></div>
                                ${room.playerBlack || '-'}
                            </td>
                            <td style="padding: 5px;">
                                <button style="background: #eee; border: 1px solid #ccc; padding: 2px 10px; cursor: pointer;">&gt;&gt;</button>
                            </td>
                        `;
                        tr.style.borderBottom = '1px solid #eee';
                        tr.style.cursor = 'pointer';
                        tr.onmouseover = () => tr.style.background = '#f5f5f5';
                        tr.onmouseout = () => tr.style.background = 'transparent';
                        tr.onclick = () => joinRoom(room);
                        roomList.appendChild(tr);
                    });
                }
            })
            .catch(err => console.error(err));
            
        if (onlineUsersList) {
            fetch(API_BASE + '/api/users/status')
                .then(res => res.json())
                .then(users => {
                    onlineUsersList.innerHTML = '';
                    users.forEach(u => {
                        const isMe = u.username === window.currentUser;
                        const color = u.online ? 'green' : 'gray';
                        const textColor = u.online ? 'black' : '#888';
                        const label = isMe ? `${u.username} (Bạn)` : u.username;
                        const div = document.createElement('div');
                        div.style.marginBottom = '5px';
                        div.style.color = textColor;
                        div.innerHTML = `<div style="display:inline-block; width:8px; height:8px; background:${color}; margin-right:5px;"></div> ${label}`;
                        onlineUsersList.appendChild(div);
                    });
                })
                .catch(err => {
                    onlineUsersList.innerHTML = '<span style="color:red;">Lỗi tải danh sách</span>';
                });
        }
    }

    function createRoom() {
        if (!window.currentUser) {
            alert('Vui lòng đăng nhập!');
            return;
        }
        // Tạm thời fix tạo phòng ở phe Đỏ
        const payload = {
            player: window.currentUser,
            roomName: 'Bàn của ' + window.currentUser,
            side: 'red'
        };
        fetch(API_BASE + '/api/chess/rooms', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(room => {
            enterGameRoom(room, 'red');
        });
    }

    function joinRoom(room) {
        if (!window.currentUser) {
            alert('Vui lòng đăng nhập!');
            return;
        }
        if (room.playerRed === window.currentUser) {
            enterGameRoom(room, 'red');
            return;
        }
        if (room.playerBlack === window.currentUser) {
            enterGameRoom(room, 'black');
            return;
        }
        if (room.status === 'PLAYING') {
            alert('Bàn này đã đủ người chơi!');
            return;
        }
        
        fetch(API_BASE + '/api/chess/rooms/' + room.roomId + '/join', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ player: window.currentUser })
        })
        .then(res => res.json())
        .then(updatedRoom => {
            const side = updatedRoom.playerRed === window.currentUser ? 'red' : 'black';
            enterGameRoom(updatedRoom, side);
        });
    }

    // --- GAME ROOM LOGIC ---
    function enterGameRoom(room, side) {
        roomId = room.roomId;
        mySide = side;
        lobbyView.style.display = 'none';
        gameView.style.display = 'flex';
        
        gameRoomName.innerText = `bàn #${room.roomId}`;
        playerRedText.innerText = room.playerRed || '-';
        playerBlackText.innerText = room.playerBlack || '-';
        logArea.innerHTML = '';
        
        isGameActive = (room.playerRed && room.playerBlack);
        if (isGameActive) {
            waitingOverlay.style.display = 'none';
        } else {
            waitingOverlay.style.display = 'block';
        }
        
        initBoard();
        addLog('HỆ THỐNG', 'Bạn đã vào bàn.', 'blue');

        if (!window.messengerStomp || !window.messengerStomp.isConnected()) {
            alert('Mất kết nối WebSocket. Vui lòng F5 lại trang.');
            return;
        }

        window.messengerStomp.subscribeGame(roomId, handleIncomingMessage);
        
        // Announce join
        sendGameMessage({ type: 'JOIN', player: window.currentUser, side: mySide });
    }

    function leaveRoom() {
        if (!confirm('Bạn có chắc chắn muốn rời bàn?')) return;
        sendGameMessage({ type: 'LEAVE', player: window.currentUser });
        
        if (roomId) {
            fetch(API_BASE + '/api/chess/rooms/' + roomId, {
                method: 'DELETE'
            }).catch(e => console.log(e));
        }

        gameView.style.display = 'none';
        lobbyView.style.display = 'flex';
        roomId = null;
        isConnected = false;
        isGameActive = false;
        fetchRooms();
    }

    // --- MESSAGING ---
    function sendGameMessage(payload) {
        payload.roomId = roomId;
        payload.sender = window.currentUser;
        if (window.messengerStomp && window.messengerStomp.sendGameMove) {
            window.messengerStomp.sendGameMove(payload);
        }
    }

    function handleIncomingMessage(payload) {
        if (payload.type === 'JOIN') {
            if (payload.sender !== window.currentUser) {
                addLog('HỆ THỐNG', `${payload.sender} đã tham gia trận đấu.`, 'blue');
                if (payload.side === 'red') playerRedText.innerText = payload.sender;
                if (payload.side === 'black') playerBlackText.innerText = payload.sender;
                
                // Khi có đủ 2 người, ẩn dòng chờ đối thủ
                const redPlayer = playerRedText.innerText;
                const blackPlayer = playerBlackText.innerText;
                if (redPlayer !== '-' && blackPlayer !== '-') {
                    isGameActive = true;
                    waitingOverlay.style.display = 'none';
                    updateTurnText();
                }
            }
        } else if (payload.type === 'LEAVE') {
            addLog('HỆ THỐNG', `${payload.sender} đã rời bàn.`, 'red');
            isGameActive = false;
            updateTurnText();
        } else if (payload.type === 'CHAT') {
            const color = payload.sender === window.currentUser ? 'black' : 'gray';
            addLog(payload.sender, payload.message, color);
        } else if (payload.type === 'MOVE') {
            if (payload.sender !== window.currentUser) {
                executeMove(payload.sr, payload.sc, payload.tr, payload.tc, false);
            }
        } else if (payload.type === 'RESIGN') {
            addLog('HỆ THỐNG', `${payload.sender} đã đầu hàng. Bạn đã thắng!`, 'green');
            isGameActive = false;
            updateTurnText();
            alert(`Đối thủ ${payload.sender} đã đầu hàng!`);
        } else if (payload.type === 'DRAW') {
            if (payload.sender !== window.currentUser) {
                if (confirm(`${payload.sender} xin hòa. Bạn có đồng ý không?`)) {
                    sendGameMessage({ type: 'DRAW_ACCEPT' });
                }
            }
        } else if (payload.type === 'DRAW_ACCEPT') {
            addLog('HỆ THỐNG', `Hai bên đã đồng ý hòa!`, 'green');
            isGameActive = false;
            updateTurnText();
            alert('Trận đấu kết thúc với kết quả Hòa!');
        }
    }

    function addLog(sender, message, color = 'black') {
        const div = document.createElement('div');
        div.style.marginBottom = '2px';
        div.innerHTML = `<b style="color:${color}">[${sender}]</b> ${message}`;
        logArea.appendChild(div);
        logArea.scrollTop = logArea.scrollHeight;
    }

    // --- BOARD LOGIC ---
    function initBoard() {
        board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        currentTurn = 'red';
        selectedCell = null;
        renderBoard();
        updateTurnText();
    }

    function renderBoard() {
        if (!boardEl) return;
        boardEl.innerHTML = '';
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'chess-cell';
                
                // Add borders/river classes (visual only, based on grid r/c)
                if (c === 0) cell.classList.add('edge-left');
                if (c === 8) cell.classList.add('edge-right');
                if (r === 0) cell.classList.add('edge-top');
                if (r === 9) cell.classList.add('edge-bottom');
                if (r === 4) cell.classList.add('river-top');
                if (r === 5) cell.classList.add('river-bottom');
                
                // Palace crosses (visual only)
                if ((r === 0 && c === 3) || (r === 7 && c === 3)) cell.classList.add('palace-tl');
                if ((r === 0 && c === 5) || (r === 7 && c === 5)) cell.classList.add('palace-tr');
                if ((r === 2 && c === 3) || (r === 9 && c === 3)) cell.classList.add('palace-bl');
                if ((r === 2 && c === 5) || (r === 9 && c === 5)) cell.classList.add('palace-br');

                const actualR = mySide === 'black' ? 9 - r : r;
                const actualC = mySide === 'black' ? 8 - c : c;

                cell.dataset.r = actualR;
                cell.dataset.c = actualC;
                cell.onclick = () => onCellClick(actualR, actualC);

                const piece = board[actualR][actualC];
                if (piece) {
                    const pEl = document.createElement('div');
                    pEl.className = 'chess-piece ' + (piece.startsWith('r') ? 'red' : 'black');
                    pEl.innerText = PIECE_NAMES[piece];
                    cell.appendChild(pEl);
                }

                boardEl.appendChild(cell);
            }
        }
    }

    function isValidMove(sr, sc, tr, tc) {
        const p = board[sr][sc];
        if (!p) return false;
        const color = p[0];
        const type = p[1];
        const target = board[tr][tc];
        if (target && target[0] === color) return false; // Cannot capture own piece
        
        const dr = tr - sr;
        const dc = tc - sc;
        const absDr = Math.abs(dr);
        const absDc = Math.abs(dc);

        if (type === 'r') { // Rook
            if (sr !== tr && sc !== tc) return false;
            let stepR = sr === tr ? 0 : (tr > sr ? 1 : -1);
            let stepC = sc === tc ? 0 : (tc > sc ? 1 : -1);
            let r = sr + stepR, c = sc + stepC;
            while (r !== tr || c !== tc) {
                if (board[r][c]) return false;
                r += stepR; c += stepC;
            }
            return true;
        }
        if (type === 'h') { // Knight
            if (absDr === 2 && absDc === 1) {
                if (board[sr + dr/2][sc]) return false;
                return true;
            }
            if (absDr === 1 && absDc === 2) {
                if (board[sr][sc + dc/2]) return false;
                return true;
            }
            return false;
        }
        if (type === 'c') { // Cannon
            if (sr !== tr && sc !== tc) return false;
            let stepR = sr === tr ? 0 : (tr > sr ? 1 : -1);
            let stepC = sc === tc ? 0 : (tc > sc ? 1 : -1);
            let r = sr + stepR, c = sc + stepC;
            let count = 0;
            while (r !== tr || c !== tc) {
                if (board[r][c]) count++;
                r += stepR; c += stepC;
            }
            if (target) return count === 1;
            return count === 0;
        }
        if (type === 'e') { // Elephant
            if (absDr !== 2 || absDc !== 2) return false;
            if (color === 'r' && tr < 5) return false;
            if (color === 'b' && tr > 4) return false;
            if (board[sr + dr/2][sc + dc/2]) return false;
            return true;
        }
        if (type === 'a') { // Advisor
            if (absDr !== 1 || absDc !== 1) return false;
            if (tc < 3 || tc > 5) return false;
            if (color === 'r' && tr < 7) return false;
            if (color === 'b' && tr > 2) return false;
            return true;
        }
        if (type === 'g') { // General
            if (absDr + absDc !== 1) return false;
            if (tc < 3 || tc > 5) return false;
            if (color === 'r' && tr < 7) return false;
            if (color === 'b' && tr > 2) return false;
            return true;
        }
        if (type === 's') { // Soldier
            if (color === 'r') {
                if (dr > 0) return false;
                if (sr > 4 && absDc > 0) return false;
                if (absDr + absDc !== 1) return false;
                return true;
            } else {
                if (dr < 0) return false;
                if (sr < 5 && absDc > 0) return false;
                if (absDr + absDc !== 1) return false;
                return true;
            }
        }
        return false;
    }

    function onCellClick(r, c) {
        if (!isGameActive) {
            alert('Trận đấu chưa bắt đầu hoặc đã kết thúc!');
            return;
        }
        if (currentTurn !== mySide) {
            return;
        }

        const piece = board[r][c];
        const isMyPiece = piece && piece[0] === mySide[0];

        if (selectedCell) {
            if (isMyPiece) {
                selectedCell = {r, c};
                updateHighlight();
            } else {
                if (isValidMove(selectedCell.r, selectedCell.c, r, c)) {
                    executeMove(selectedCell.r, selectedCell.c, r, c, true);
                    selectedCell = null;
                    updateHighlight();
                }
            }
        } else {
            if (isMyPiece) {
                selectedCell = {r, c};
                updateHighlight();
            }
        }
    }

    function updateHighlight() {
        document.querySelectorAll('.chess-cell').forEach(c => {
            if (c.firstElementChild && c.firstElementChild.classList.contains('chess-piece')) {
                c.firstElementChild.classList.remove('selected');
            }
            const ind = c.querySelector('.move-indicator');
            if (ind) ind.remove();
            c.classList.remove('valid-move', 'valid-capture');
        });
        
        if (selectedCell) {
            const index = selectedCell.r * 9 + selectedCell.c;
            const cell = boardEl.children[index];
            if (cell && cell.firstElementChild) {
                cell.firstElementChild.classList.add('selected');
            }
            for (let r = 0; r < 10; r++) {
                for (let c = 0; c < 9; c++) {
                    if (isValidMove(selectedCell.r, selectedCell.c, r, c)) {
                        const targetCell = boardEl.children[r * 9 + c];
                        const ind = document.createElement('div');
                        ind.className = 'move-indicator';
                        if (board[r][c]) {
                            targetCell.classList.add('valid-capture');
                        } else {
                            targetCell.classList.add('valid-move');
                        }
                        targetCell.appendChild(ind);
                    }
                }
            }
        }
    }

    function executeMove(sr, sc, tr, tc, isLocal) {
        const piece = board[sr][sc];
        const target = board[tr][tc];
        board[tr][tc] = piece;
        board[sr][sc] = '';
        
        let moveText = `${piece} di chuyển từ (${sr},${sc}) đến (${tr},${tc})`;
        if (target) moveText += ` và ăn ${target}`;
        
        if (isLocal) {
            sendGameMessage({ type: 'MOVE', sr, sc, tr, tc });
            addLog('HỆ THỐNG', `Bạn đi: ${moveText}`, 'green');
        } else {
            addLog('HỆ THỐNG', `Đối thủ đi: ${moveText}`, 'orange');
        }

        currentTurn = currentTurn === 'red' ? 'black' : 'red';
        renderBoard();
        updateTurnText();

        if (target && target[1] === 'g') {
            isGameActive = false;
            if (isLocal) {
                alert('Chúc mừng! Bạn đã thắng.');
                addLog('HỆ THỐNG', 'Bạn đã chiếu tướng và thắng.', 'green');
            } else {
                alert('Tướng của bạn đã bị ăn. Bạn thua!');
                addLog('HỆ THỐNG', 'Tướng đã mất. Bạn đã thua.', 'red');
            }
        }
    }

    function updateTurnText() {
        if (!isGameActive) {
            turnText.innerText = "Trận đấu dừng/chờ";
            turnText.style.color = 'black';
            return;
        }
        if (currentTurn === mySide) {
            turnText.innerText = "Lượt của bạn (" + (mySide === 'red' ? 'Đỏ' : 'Đen') + ")";
            turnText.style.color = '#cc0000';
            turnText.style.fontWeight = 'bold';
        } else {
            turnText.innerText = "Lượt đối thủ";
            turnText.style.color = '#000000';
            turnText.style.fontWeight = 'normal';
        }
    }

    // --- BINDINGS ---
    document.addEventListener('DOMContentLoaded', () => {
        if (btnRefreshLobby) btnRefreshLobby.addEventListener('click', fetchRooms);
        if (btnCreateRoom) btnCreateRoom.addEventListener('click', createRoom);
        
        if (btnLeave) btnLeave.addEventListener('click', leaveRoom);
        if (btnResign) {
            btnResign.addEventListener('click', () => {
                if (!isGameActive) return;
                if(confirm('Chắc chắn đầu hàng?')) {
                    sendGameMessage({ type: 'RESIGN' });
                    addLog('HỆ THỐNG', 'Bạn đã đầu hàng.', 'red');
                    isGameActive = false;
                    updateTurnText();
                }
            });
        }
        if (btnDraw) {
            btnDraw.addEventListener('click', () => {
                if (!isGameActive) return;
                sendGameMessage({ type: 'DRAW' });
                addLog('HỆ THỐNG', 'Đã gửi lời mời hòa cờ.', 'blue');
            });
        }
        
        if (btnSendChat) {
            btnSendChat.addEventListener('click', () => {
                const msg = chatInput.value.trim();
                if (msg) {
                    sendGameMessage({ type: 'CHAT', message: msg });
                    addLog('Bạn', msg, 'black');
                    chatInput.value = '';
                }
            });
        }
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') btnSendChat.click();
            });
        }
    });

    // Make fetchRooms global so it can be called when window opens
    window.chessApp = {
        fetchRooms: fetchRooms
    };

    // Auto fetch rooms when user double clicks desktop icon
    const chessIcon = document.querySelector('.desktop-icon[data-open="chess"]');
    if (chessIcon) {
        chessIcon.addEventListener('click', () => {
            fetchRooms();
        });
        chessIcon.addEventListener('dblclick', () => {
            fetchRooms();
        });
    }

})();
