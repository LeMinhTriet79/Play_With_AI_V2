(function() {
    'use strict';
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'https://play-with-ai-v2.onrender.com';

    // =====================================================================
    // DOM ELEMENTS
    // =====================================================================
    const lobbyView        = document.getElementById('chess-lobby');
    const roomList         = document.getElementById('chessRoomList');
    const btnRefreshLobby  = document.getElementById('btnChessRefreshLobby');
    const btnCreateRoom    = document.getElementById('btnChessCreateRoom');

    const gameView         = document.getElementById('chess-game-area');
    const boardEl          = document.getElementById('chessBoard');
    const turnText         = document.getElementById('chessTurnText');
    const playerRedText    = document.getElementById('chessPlayerRed');
    const playerBlackText  = document.getElementById('chessPlayerBlack');
    const gameRoomName     = document.getElementById('chessGameRoomName');
    const logArea          = document.getElementById('chessLogArea');
    const chatInput        = document.getElementById('chessChatInput');
    const btnSendChat      = document.getElementById('btnChessSendChat');
    const btnLeave         = document.getElementById('btnChessLeave');
    const btnResign        = document.getElementById('btnChessResign');
    const btnDraw          = document.getElementById('btnChessDraw');
    const waitingOverlay   = document.getElementById('chessWaitingOverlay');
    const onlineUsersList  = document.getElementById('chessOnlineUsers');

    // =====================================================================
    // STATE
    // =====================================================================
    let mySide       = null;   // 'red' | 'black'
    let currentTurn  = 'red';
    let selectedCell = null;
    let roomId       = null;
    let isGameActive = false;
    let board        = [];
    let lobbyPollTimer = null;  // periodic room-state poll while waiting

    // =====================================================================
    // BOARD CONSTANTS
    // =====================================================================
    const INITIAL_BOARD = [
        ['br','bh','be','ba','bg','ba','be','bh','br'],
        ['',  '',  '',  '',  '',  '',  '',  '',  '' ],
        ['',  'bc','',  '',  '',  '',  '',  'bc','' ],
        ['bs','',  'bs','',  'bs','',  'bs','',  'bs'],
        ['',  '',  '',  '',  '',  '',  '',  '',  '' ],
        ['',  '',  '',  '',  '',  '',  '',  '',  '' ],
        ['rs','',  'rs','',  'rs','',  'rs','',  'rs'],
        ['',  'rc','',  '',  '',  '',  '',  'rc','' ],
        ['',  '',  '',  '',  '',  '',  '',  '',  '' ],
        ['rr','rh','re','ra','rg','ra','re','rh','rr']
    ];

    const PIECE_NAMES = {
        'br':'車','bh':'馬','be':'象','ba':'士','bg':'將','bc':'砲','bs':'卒',
        'rr':'車','rh':'馬','re':'相','ra':'仕','rg':'帥','rc':'炮','rs':'兵'
    };

    // =====================================================================
    // LOBBY
    // =====================================================================
    function fetchRooms() {
        if (!window.currentUser) return;
        fetch(API_BASE + '/api/chess/rooms')
            .then(r => r.json())
            .then(rooms => {
                roomList.innerHTML = '';
                if (!rooms.length) {
                    roomList.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:10px;">Chưa có bàn nào. Hãy mở bàn mới!</td></tr>';
                    return;
                }
                rooms.forEach(room => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #eee';
                    tr.style.cursor = 'pointer';
                    tr.innerHTML = `
                        <td style="padding:5px;">#${room.roomId}</td>
                        <td style="padding:5px;">10p</td>
                        <td style="padding:5px;color:red;font-weight:bold;">
                            <span style="display:inline-block;width:8px;height:8px;background:red;margin-right:4px;"></span>
                            ${room.playerRed || '-'}
                        </td>
                        <td style="padding:5px;font-weight:bold;">
                            <span style="display:inline-block;width:8px;height:8px;background:#222;margin-right:4px;"></span>
                            ${room.playerBlack || '-'}
                        </td>
                        <td style="padding:5px;">
                            <button style="background:#eee;border:1px solid #ccc;padding:2px 10px;cursor:pointer;">&gt;&gt;</button>
                        </td>
                    `;
                    tr.onmouseover = () => tr.style.background = '#f5f5f5';
                    tr.onmouseout  = () => tr.style.background = 'transparent';
                    tr.onclick = () => joinRoom(room);
                    roomList.appendChild(tr);
                });
            })
            .catch(e => console.error('fetchRooms error', e));

        // Fetch online users
        if (onlineUsersList) {
            fetch(API_BASE + '/api/users/status')
                .then(r => r.json())
                .then(users => {
                    onlineUsersList.innerHTML = '';
                    users.forEach(u => {
                        const isMe = u.username === window.currentUser;
                        const dot  = u.online ? 'green' : 'gray';
                        const div  = document.createElement('div');
                        div.style.cssText = `margin-bottom:4px;color:${u.online?'black':'#888'}`;
                        div.innerHTML = `<span style="display:inline-block;width:8px;height:8px;background:${dot};margin-right:5px;border-radius:50%;"></span>${u.username}${isMe?' (Bạn)':''}`;
                        onlineUsersList.appendChild(div);
                    });
                })
                .catch(() => {});
        }
    }

    function createRoom() {
        if (!window.currentUser) { alert('Vui lòng đăng nhập!'); return; }
        fetch(API_BASE + '/api/chess/rooms', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ player: window.currentUser, roomName: 'Bàn của ' + window.currentUser, side: 'red' })
        })
        .then(r => r.json())
        .then(room => enterGameRoom(room, 'red'))
        .catch(e => console.error(e));
    }

    function joinRoom(room) {
        if (!window.currentUser) { alert('Vui lòng đăng nhập!'); return; }

        // Already in room?
        if (room.playerRed === window.currentUser) { enterGameRoom(room, 'red'); return; }
        if (room.playerBlack === window.currentUser) { enterGameRoom(room, 'black'); return; }

        if (room.status === 'PLAYING') { alert('Bàn này đã đủ người chơi!'); return; }

        fetch(API_BASE + '/api/chess/rooms/' + room.roomId + '/join', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ player: window.currentUser })
        })
        .then(async r => {
            const text = await r.text();
            if (!text) return null;
            return JSON.parse(text);
        })
        .then(updatedRoom => {
            if (!updatedRoom) {
                alert('Phòng không tồn tại hoặc đã bị xóa!');
                fetchRooms();
                return;
            }
            const side = updatedRoom.playerRed === window.currentUser ? 'red' : 'black';
            enterGameRoom(updatedRoom, side);
        })
        .catch(e => console.error(e));
    }

    // =====================================================================
    // ENTER / LEAVE ROOM
    // =====================================================================
    function enterGameRoom(room, side) {
        roomId  = room.roomId;
        mySide  = side;

        // Clear any previous poll
        if (lobbyPollTimer) { clearInterval(lobbyPollTimer); lobbyPollTimer = null; }

        // Switch views
        lobbyView.style.display = 'none';
        gameView.style.display  = 'flex';

        // Update header
        gameRoomName.innerText      = `bàn #${room.roomId}`;
        playerRedText.innerText     = room.playerRed   || '-';
        playerBlackText.innerText   = room.playerBlack || '-';
        logArea.innerHTML           = '';
        currentTurn = 'red';
        selectedCell = null;

        // Decide waiting overlay
        isGameActive = !!(room.playerRed && room.playerBlack);
        waitingOverlay.style.display = isGameActive ? 'none' : 'block';

        initBoard();
        addLog('HỆ THỐNG', 'Bạn đã vào bàn. Mã bàn: ' + room.roomId, 'blue');

        // Subscribe to game room topic — retry up to 5 times if not yet connected
        function trySubscribe(attemptsLeft) {
            if (window.messengerStomp && window.messengerStomp.isConnected()) {
                window.messengerStomp.subscribeGame(roomId, handleIncomingMessage);
                // Announce JOIN to everyone else in the room
                sendGameEvent({ type: 'JOIN', player: window.currentUser, side: mySide, sender: window.currentUser });
            } else if (attemptsLeft > 0) {
                setTimeout(() => trySubscribe(attemptsLeft - 1), 600);
            } else {
                addLog('HỆ THỐNG', '⚠️ Mất kết nối WebSocket. Vui lòng F5 trang.', 'red');
            }
        }
        trySubscribe(5);

        // Fallback polling: every 3s fetch room state from HTTP while waiting
        if (!isGameActive) {
            startLobbyPoll();
        }
    }

    function startLobbyPoll() {
        if (lobbyPollTimer) return;
        lobbyPollTimer = setInterval(() => {
            if (isGameActive || !roomId) {
                clearInterval(lobbyPollTimer);
                lobbyPollTimer = null;
                return;
            }
            fetch(API_BASE + '/api/chess/rooms/' + roomId)
                .then(async r => {
                    const text = await r.text();
                    if (!text) return null;
                    return JSON.parse(text);
                })
                .then(updatedRoom => {
                    if (!updatedRoom) return;
                    if (updatedRoom.playerRed)   playerRedText.innerText   = updatedRoom.playerRed;
                    if (updatedRoom.playerBlack) playerBlackText.innerText = updatedRoom.playerBlack;
                    if (updatedRoom.playerRed && updatedRoom.playerBlack) {
                        isGameActive = true;
                        initBoard(); // Ensure fresh board
                        waitingOverlay.style.display = 'none';
                        addLog('HỆ THỐNG', '✅ Đối thủ đã vào! Trận đấu bắt đầu!', 'green');
                        updateTurnText();
                        clearInterval(lobbyPollTimer);
                        lobbyPollTimer = null;
                    }
                })
                .catch(() => {});
        }, 3000);
    }

    function leaveRoom() {
        if (!confirm('Bạn có chắc chắn muốn rời bàn?')) return;

        // Notify the opponent first (before clearing state)
        sendGameEvent({ type: 'LEAVE', player: window.currentUser, sender: window.currentUser });

        // Tell server to remove this player from the room
        if (roomId) {
            fetch(API_BASE + '/api/chess/rooms/' + roomId + '?player=' + encodeURIComponent(window.currentUser), {
                method: 'DELETE'
            }).catch(e => console.log(e));
        }

        resetToLobby();
    }

    function resetToLobby() {
        if (lobbyPollTimer) { clearInterval(lobbyPollTimer); lobbyPollTimer = null; }
        gameView.style.display  = 'none';
        lobbyView.style.display = 'flex';
        roomId       = null;
        isGameActive = false;
        selectedCell = null;
        fetchRooms();
    }

    // =====================================================================
    // MESSAGING
    // =====================================================================
    function sendGameEvent(extraFields) {
        if (!roomId) return;
        const payload = Object.assign({ roomId, sender: window.currentUser }, extraFields);
        if (window.messengerStomp && window.messengerStomp.sendGameMove) {
            window.messengerStomp.sendGameMove(payload);
        }
    }

    /**
     * Central handler for ALL incoming WebSocket messages from the game room.
     * Called for EVERY subscriber including the sender, so we must guard
     * against processing our own events where appropriate.
     */
    function handleIncomingMessage(payload) {
        if (!payload || !payload.type) return;
        const fromMe = payload.sender === window.currentUser;

        switch (payload.type) {

            case 'ROOM_STATE': {
                // Pushed by server when the 2nd player joins via HTTP.
                // This is the notification A was waiting for.
                const redPlayer   = payload.playerRed   || playerRedText.innerText;
                const blackPlayer = payload.playerBlack || playerBlackText.innerText;
                playerRedText.innerText   = redPlayer;
                playerBlackText.innerText = blackPlayer;
                if (redPlayer !== '-' && blackPlayer !== '-') {
                    isGameActive = true;
                    initBoard(); // Reset board in case of reconnect
                    waitingOverlay.style.display = 'none';
                    addLog('HỆ THỐNG', '✅ Trận đấu bắt đầu!', 'green');
                    updateTurnText();
                }
                break;
            }

            case 'JOIN': {
                if (fromMe) break; // Don't process your own JOIN
                // Update opponent's name
                if (payload.side === 'red')   playerRedText.innerText   = payload.sender;
                if (payload.side === 'black')  playerBlackText.innerText = payload.sender;
                
                // robust check
                if (payload.playerRed) playerRedText.innerText = payload.playerRed;
                if (payload.playerBlack) playerBlackText.innerText = payload.playerBlack;

                addLog('HỆ THỐNG', `${payload.sender} đã tham gia trận đấu.`, 'blue');

                // Check if both seats are filled
                const red   = playerRedText.innerText;
                const black = playerBlackText.innerText;
                if (red && red !== '-' && black && black !== '-') {
                    isGameActive = true;
                    initBoard(); // Reset board in case of reconnect/new player
                    waitingOverlay.style.display = 'none';
                    addLog('HỆ THỐNG', '✅ Trận đấu bắt đầu!', 'green');
                    updateTurnText();
                }
                break;
            }

            case 'LEAVE': {
                if (fromMe) break;
                addLog('HỆ THỐNG', `⚠️ ${payload.sender} đã rời bàn.`, 'red');
                isGameActive = false;
                // Clear the leaver's seat
                if (payload.sender === playerRedText.innerText)   playerRedText.innerText   = '-';
                if (payload.sender === playerBlackText.innerText) playerBlackText.innerText = '-';
                waitingOverlay.style.display = 'block';
                updateTurnText();
                
                startLobbyPoll(); // Resume polling for new player
                break;
            }

            case 'MOVE': {
                if (fromMe) break; // Our own move already applied locally
                executeMove(payload.sr, payload.sc, payload.tr, payload.tc, false);
                break;
            }

            case 'RESIGN': {
                if (fromMe) break;
                addLog('HỆ THỐNG', `🏳️ ${payload.sender} đã đầu hàng. Bạn đã thắng!`, 'green');
                isGameActive = false;
                updateTurnText();
                alert(`Đối thủ ${payload.sender} đã đầu hàng! Bạn thắng!`);
                break;
            }

            case 'DRAW': {
                if (fromMe) break;
                if (confirm(`${payload.sender} xin hòa. Bạn có đồng ý không?`)) {
                    sendGameEvent({ type: 'DRAW_ACCEPT' });
                    addLog('HỆ THỐNG', 'Bạn đã chấp nhận hòa.', 'blue');
                }
                break;
            }

            case 'DRAW_ACCEPT': {
                if (fromMe) break;
                addLog('HỆ THỐNG', '🤝 Hai bên đã đồng ý hòa!', 'green');
                isGameActive = false;
                updateTurnText();
                alert('Trận đấu kết thúc: Hòa cờ!');
                break;
            }

            case 'CHAT': {
                const color = fromMe ? 'black' : '#555';
                addLog(payload.sender, payload.message, color);
                break;
            }

            default:
                console.log('[chess] Unknown message type:', payload.type, payload);
        }
    }

    // =====================================================================
    // BOARD LOGIC
    // =====================================================================
    function initBoard() {
        board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        currentTurn  = 'red';
        selectedCell = null;
        renderBoard();
        updateTurnText();
    }

    function renderBoard() {
        if (!boardEl) return;
        boardEl.innerHTML = '';

        // --- SVG board lines ---
        const W = 450, H = 500;
        const PAD = 25, GAP = 50;
        let svg = `<svg class="chess-svg" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;

        // Outer border
        svg += `<rect x="${PAD}" y="${PAD}" width="${W-2*PAD}" height="${H-2*PAD}" fill="none" stroke="#5c3a21" stroke-width="3"/>`;

        // Horizontal lines (rows 1-8)
        for (let i = 1; i <= 8; i++) {
            const y = PAD + i * GAP;
            svg += `<line x1="${PAD}" y1="${y}" x2="${W-PAD}" y2="${y}" stroke="#5c3a21" stroke-width="1.5"/>`;
        }

        // Vertical lines (cols 1-7) — split at river
        for (let i = 1; i <= 7; i++) {
            const x = PAD + i * GAP;
            svg += `<line x1="${x}" y1="${PAD}"       x2="${x}" y2="${PAD+4*GAP}" stroke="#5c3a21" stroke-width="1.5"/>`;
            svg += `<line x1="${x}" y1="${PAD+5*GAP}" x2="${x}" y2="${H-PAD}"    stroke="#5c3a21" stroke-width="1.5"/>`;
        }

        // Palace diagonals - black side (top)
        svg += `<line x1="${PAD+3*GAP}" y1="${PAD}"         x2="${PAD+5*GAP}" y2="${PAD+2*GAP}" stroke="#5c3a21" stroke-width="1.5"/>`;
        svg += `<line x1="${PAD+5*GAP}" y1="${PAD}"         x2="${PAD+3*GAP}" y2="${PAD+2*GAP}" stroke="#5c3a21" stroke-width="1.5"/>`;

        // Palace diagonals - red side (bottom)
        svg += `<line x1="${PAD+3*GAP}" y1="${H-PAD}"       x2="${PAD+5*GAP}" y2="${H-PAD-2*GAP}" stroke="#5c3a21" stroke-width="1.5"/>`;
        svg += `<line x1="${PAD+5*GAP}" y1="${H-PAD}"       x2="${PAD+3*GAP}" y2="${H-PAD-2*GAP}" stroke="#5c3a21" stroke-width="1.5"/>`;

        // Cannon / soldier tick marks
        const ticks = [[2,1],[2,7],[3,0],[3,2],[3,4],[3,6],[3,8],[7,1],[7,7],[6,0],[6,2],[6,4],[6,6],[6,8]];
        const T = 5, L = 10;
        ticks.forEach(([row, col]) => {
            const cx = PAD + col * GAP;
            const cy = PAD + row * GAP;
            if (col > 0) { // left tick
                svg += `<polyline points="${cx-L},${cy-T} ${cx-T},${cy-T} ${cx-T},${cy-L}" fill="none" stroke="#5c3a21" stroke-width="1.5"/>`;
                svg += `<polyline points="${cx-L},${cy+T} ${cx-T},${cy+T} ${cx-T},${cy+L}" fill="none" stroke="#5c3a21" stroke-width="1.5"/>`;
            }
            if (col < 8) { // right tick
                svg += `<polyline points="${cx+L},${cy-T} ${cx+T},${cy-T} ${cx+T},${cy-L}" fill="none" stroke="#5c3a21" stroke-width="1.5"/>`;
                svg += `<polyline points="${cx+L},${cy+T} ${cx+T},${cy+T} ${cx+T},${cy+L}" fill="none" stroke="#5c3a21" stroke-width="1.5"/>`;
            }
        });

        // River text
        svg += `<text x="${W/2}" y="${PAD+4.5*GAP+6}" text-anchor="middle" font-size="13" fill="#5c3a21" font-family="ms_sans_serif,serif">楚 河　　　漢 界</text>`;

        svg += `</svg>`;
        boardEl.innerHTML = svg;

        // --- Pieces and click areas ---
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                // For black side, flip the visual board
                const actualR = mySide === 'black' ? 9 - r : r;
                const actualC = mySide === 'black' ? 8 - c : c;
                const vx = PAD + c * GAP;
                const vy = PAD + r * GAP;

                // Click zone
                const zone = document.createElement('div');
                zone.className = 'intersection-click';
                zone.style.left = vx + 'px';
                zone.style.top  = vy + 'px';
                zone.dataset.r  = actualR;
                zone.dataset.c  = actualC;
                zone.onclick    = () => onCellClick(actualR, actualC);
                boardEl.appendChild(zone);

                // Piece
                const piece = board[actualR][actualC];
                if (piece) {
                    const pEl = document.createElement('div');
                    pEl.className = 'chess-piece ' + (piece[0] === 'r' ? 'red' : 'black');
                    pEl.innerText = PIECE_NAMES[piece] || piece;
                    pEl.style.left = vx + 'px';
                    pEl.style.top  = vy + 'px';
                    pEl.id = `piece-${actualR}-${actualC}`;
                    if (selectedCell && selectedCell.r === actualR && selectedCell.c === actualC) {
                        pEl.classList.add('selected');
                    }
                    pEl.onclick = () => onCellClick(actualR, actualC);
                    boardEl.appendChild(pEl);
                }
            }
        }

        // Re-render move indicators
        if (selectedCell) renderMoveIndicators();
    }

    function renderMoveIndicators() {
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (!isValidMove(selectedCell.r, selectedCell.c, r, c)) continue;
                const vr = mySide === 'black' ? 9 - r : r;
                const vc = mySide === 'black' ? 8 - c : c;
                const ind = document.createElement('div');
                ind.className = 'move-indicator' + (board[r][c] ? ' capture' : '');
                ind.style.left = (PAD + vc * 50) + 'px';
                ind.style.top  = (PAD + vr * 50) + 'px';
                ind.onclick = (e) => { e.stopPropagation(); onCellClick(r, c); };
                boardEl.appendChild(ind);
            }
        }
    }

    // =====================================================================
    // GAME RULES
    // =====================================================================
    function isValidMove(sr, sc, tr, tc) {
        const p = board[sr][sc];
        if (!p) return false;
        const color  = p[0];
        const type   = p[1];
        const target = board[tr][tc];
        if (target && target[0] === color) return false;

        const dr = tr - sr, dc = tc - sc;
        const absDr = Math.abs(dr), absDc = Math.abs(dc);

        switch (type) {
            case 'r': { // Rook
                if (sr !== tr && sc !== tc) return false;
                const sr2 = sr === tr ? 0 : (tr > sr ? 1 : -1);
                const sc2 = sc === tc ? 0 : (tc > sc ? 1 : -1);
                let r = sr + sr2, c = sc + sc2;
                while (r !== tr || c !== tc) { if (board[r][c]) return false; r += sr2; c += sc2; }
                return true;
            }
            case 'h': { // Horse/Knight
                if (absDr === 2 && absDc === 1) { if (board[sr + (dr > 0 ? 1 : -1)][sc]) return false; return true; }
                if (absDr === 1 && absDc === 2) { if (board[sr][sc + (dc > 0 ? 1 : -1)]) return false; return true; }
                return false;
            }
            case 'c': { // Cannon
                if (sr !== tr && sc !== tc) return false;
                const sr2 = sr === tr ? 0 : (tr > sr ? 1 : -1);
                const sc2 = sc === tc ? 0 : (tc > sc ? 1 : -1);
                let r = sr + sr2, c = sc + sc2, count = 0;
                while (r !== tr || c !== tc) { if (board[r][c]) count++; r += sr2; c += sc2; }
                return target ? count === 1 : count === 0;
            }
            case 'e': { // Elephant
                if (absDr !== 2 || absDc !== 2) return false;
                if (color === 'r' && tr < 5) return false;
                if (color === 'b' && tr > 4) return false;
                return !board[sr + dr/2][sc + dc/2];
            }
            case 'a': { // Advisor
                if (absDr !== 1 || absDc !== 1) return false;
                if (tc < 3 || tc > 5) return false;
                if (color === 'r' && tr < 7) return false;
                if (color === 'b' && tr > 2) return false;
                return true;
            }
            case 'g': { // General
                if (absDr + absDc !== 1) return false;
                if (tc < 3 || tc > 5) return false;
                if (color === 'r' && tr < 7) return false;
                if (color === 'b' && tr > 2) return false;
                return true;
            }
            case 's': { // Soldier/Pawn
                if (color === 'r') {
                    if (dr > 0) return false;           // can only move forward (up for red)
                    if (sr > 4 && absDc > 0) return false; // before crossing river, no sideways
                    return absDr + absDc === 1;
                } else {
                    if (dr < 0) return false;           // can only move forward (down for black)
                    if (sr < 5 && absDc > 0) return false;
                    return absDr + absDc === 1;
                }
            }
            default: return false;
        }
    }

    function onCellClick(r, c) {
        if (!isGameActive) {
            alert('Trận đấu chưa bắt đầu hoặc đã kết thúc!');
            return;
        }
        if (currentTurn !== mySide) return; // Not my turn

        const piece    = board[r][c];
        const isMyPiece = piece && piece[0] === mySide[0];

        if (selectedCell) {
            if (isMyPiece) {
                // Re-select another piece
                selectedCell = { r, c };
                renderBoard();
            } else if (isValidMove(selectedCell.r, selectedCell.c, r, c)) {
                executeMove(selectedCell.r, selectedCell.c, r, c, true);
                selectedCell = null;
                renderBoard();
            } else {
                // Invalid move — deselect
                selectedCell = null;
                renderBoard();
            }
        } else {
            if (isMyPiece) {
                selectedCell = { r, c };
                renderBoard();
            }
        }
    }

    function executeMove(sr, sc, tr, tc, isLocal) {
        const piece  = board[sr][sc];
        const target = board[tr][tc];
        board[tr][tc] = piece;
        board[sr][sc] = '';

        const pName  = PIECE_NAMES[piece]  || piece;
        const tName  = target ? (PIECE_NAMES[target] || target) : '';
        let moveText = `${pName}(${sr},${sc})→(${tr},${tc})`;
        if (target) moveText += ` ăn ${tName}`;

        if (isLocal) {
            sendGameEvent({ type: 'MOVE', sr, sc, tr, tc });
            addLog('Bạn', moveText, 'green');
        } else {
            addLog('Đối thủ', moveText, 'orange');
        }

        currentTurn = currentTurn === 'red' ? 'black' : 'red';
        renderBoard();
        updateTurnText();

        // Check win
        if (target && target[1] === 'g') {
            isGameActive = false;
            updateTurnText();
            if (isLocal) {
                alert('🏆 Chiếu tướng! Bạn đã thắng!');
                addLog('HỆ THỐNG', 'Bạn đã thắng!', 'green');
            } else {
                alert('💔 Tướng của bạn bị chiếu. Bạn thua!');
                addLog('HỆ THỐNG', 'Bạn đã thua!', 'red');
            }
        }
    }

    function updateTurnText() {
        if (!isGameActive) {
            turnText.innerText = 'Trận đấu dừng / chờ';
            turnText.style.color  = '#666';
            turnText.style.fontWeight = 'normal';
            return;
        }
        if (currentTurn === mySide) {
            turnText.innerText = '▶ Lượt của bạn (' + (mySide === 'red' ? 'Đỏ' : 'Đen') + ')';
            turnText.style.color  = '#cc0000';
            turnText.style.fontWeight = 'bold';
        } else {
            turnText.innerText = 'Đang chờ đối thủ...';
            turnText.style.color  = '#333';
            turnText.style.fontWeight = 'normal';
        }
    }

    // =====================================================================
    // LOG
    // =====================================================================
    function addLog(sender, message, color) {
        const div = document.createElement('div');
        div.style.marginBottom = '2px';
        div.style.color = color || 'black';
        div.innerHTML = `<b>[${sender}]</b> ${message}`;
        logArea.appendChild(div);
        logArea.scrollTop = logArea.scrollHeight;
    }

    // =====================================================================
    // EVENT BINDINGS
    // =====================================================================
    document.addEventListener('DOMContentLoaded', () => {
        if (btnRefreshLobby) btnRefreshLobby.addEventListener('click', fetchRooms);
        if (btnCreateRoom)   btnCreateRoom.addEventListener('click', createRoom);
        if (btnLeave)        btnLeave.addEventListener('click', leaveRoom);

        if (btnResign) {
            btnResign.addEventListener('click', () => {
                if (!isGameActive) return;
                if (!confirm('Bạn có chắc chắn muốn đầu hàng?')) return;
                sendGameEvent({ type: 'RESIGN' });
                addLog('HỆ THỐNG', 'Bạn đã đầu hàng.', 'red');
                isGameActive = false;
                updateTurnText();
            });
        }

        if (btnDraw) {
            btnDraw.addEventListener('click', () => {
                if (!isGameActive) return;
                sendGameEvent({ type: 'DRAW' });
                addLog('HỆ THỐNG', 'Đã gửi đề nghị hòa cờ.', 'blue');
            });
        }

        if (btnSendChat) {
            btnSendChat.addEventListener('click', sendChat);
        }
        if (chatInput) {
            chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendChat(); });
        }

        // Listen for lobby refresh from WebSocket
        if (window.messengerStomp) {
            window.messengerStomp.on('public', payload => {
                if (payload && payload.type === 'ROOM_UPDATE') {
                    fetchRooms();
                }
            });
        }
    });

    function sendChat() {
        const msg = chatInput ? chatInput.value.trim() : '';
        if (!msg) return;
        sendGameEvent({ type: 'CHAT', message: msg });
        addLog('Bạn', msg, 'black');
        chatInput.value = '';
    }

    // =====================================================================
    // PUBLIC API
    // =====================================================================
    window.chessApp = { fetchRooms };

    // Auto-refresh when desktop icon is clicked/double-clicked
    const icon = document.querySelector('.desktop-icon[data-open="chess"]');
    if (icon) {
        icon.addEventListener('click',   fetchRooms);
        icon.addEventListener('dblclick', fetchRooms);
    }

})();
