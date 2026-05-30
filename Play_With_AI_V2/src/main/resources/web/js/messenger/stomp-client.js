(function() {
    const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.WS_BASE) || 'https://play-with-ai-v2.onrender.com';
    const SOCKET_URL = baseUrl + '/ws';
    let stompClient = null;
    let connected = false;
    let currentUser = '';

    const handlers = {
        public: [],
        private: [],
        webrtc: [],
        status: []
    };

    function notify(type, payload) {
        const list = handlers[type] || [];
        list.forEach(function(handler) {
            try {
                handler(payload);
            } catch (error) {
                console.error('Handler error:', error);
            }
        });
    }

    function setStatus(text) {
        const statusEl = document.getElementById('messengerStatus');
        if (statusEl) {
            statusEl.textContent = text;
        }
        notify('status', text);
    }

    function parseMessage(message) {
        if (!message || !message.body) {
            return null;
        }
        try {
            return JSON.parse(message.body);
        } catch (error) {
            return { raw: message.body };
        }
    }

    function subscribeTopics() {
        if (!stompClient || !currentUser) {
            return;
        }

        // Public room messages
        stompClient.subscribe('/topic/public', function(message) {
            notify('public', parseMessage(message));
        });

        // Private chat messages for current user
        stompClient.subscribe('/queue/private.' + currentUser, function(message) {
            notify('private', parseMessage(message));
        });

        // WebRTC signaling messages
        stompClient.subscribe('/queue/webrtc.' + currentUser, function(message) {
            notify('webrtc', parseMessage(message));
        });
    }

    function connect(username) {
        if (!username) {
            return;
        }
        if (connected && username === currentUser) {
            return;
        }
        if (connected && username !== currentUser) {
            disconnect();
        }
        if (!window.SockJS || !window.Stomp) {
            setStatus('SockJS or Stomp missing');
            return;
        }

        currentUser = username;
        const socket = new SockJS(SOCKET_URL);
        stompClient = Stomp.over(socket);
        stompClient.debug = null;

        setStatus('Connecting...');
        stompClient.connect({ username: currentUser, login: currentUser }, function() {
            connected = true;
            setStatus('Connected');
            subscribeTopics();
        }, function(error) {
            connected = false;
            setStatus('Disconnected');
            console.error('STOMP error:', error);
        });
    }

    function sendPrivate(payload) {
        if (!connected || !stompClient) {
            setStatus('Not connected');
            return;
        }
        stompClient.send('/app/chat.private', {}, JSON.stringify(payload));
    }

    function sendSignal(payload) {
        if (!connected || !stompClient) {
            setStatus('Not connected');
            return;
        }
        stompClient.send('/app/webrtc.signal', {}, JSON.stringify(payload));
    }

    function sendRecall(payload) {
        if (!connected || !stompClient) {
            setStatus('Not connected');
            return;
        }
        stompClient.send('/app/chat.recall', {}, JSON.stringify(payload));
    }

    function disconnect() {
        if (stompClient && connected) {
            stompClient.disconnect(function() {
                connected = false;
                setStatus('Disconnected');
            });
        }
        connected = false;
        stompClient = null;
        currentUser = '';
    }

    function on(type, handler) {
        if (!handlers[type]) {
            handlers[type] = [];
        }
        handlers[type].push(handler);
    }

    function waitForUser() {
        const timer = setInterval(function() {
            if (window.currentUser) {
                clearInterval(timer);
                connect(window.currentUser);
            }
        }, 400);
    }

    window.messengerStomp = {
        connect: connect,
        disconnect: disconnect,
        sendPrivate: sendPrivate,
        sendRecall: sendRecall,
        sendSignal: sendSignal,
        on: on,
        isConnected: function() { return connected; }
    };

    document.addEventListener('DOMContentLoaded', waitForUser);
})();
