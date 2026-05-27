(function() {
    let peer = null;
    let localStream = null;
    let activeTarget = '';

    const rtcConfig = {
        iceServers: []
    };

    function getCurrentUser() {
        return window.currentUser || '';
    }

    function getTargetUser() {
        const input = document.getElementById('messengerTarget');
        return input ? input.value.trim() : '';
    }

    function openCallWindow() {
        if (window.osWindowManager) {
            window.osWindowManager.open('call');
        }
    }

    function setCallStatus(text) {
        const status = document.getElementById('callStatus');
        if (status) {
            status.textContent = text;
        }
    }

    async function startLocalStream(withVideo) {
        if (localStream) {
            return localStream;
        }
        // Local capture: audio only or audio + video depending on call type.
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: withVideo
        });
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
        return localStream;
    }

    function createPeerConnection(targetUser) {
        if (peer) {
            return peer;
        }
        // RTCPeerConnection for WebRTC signaling.
        peer = new RTCPeerConnection(rtcConfig);

        peer.onicecandidate = function(event) {
            if (event.candidate) {
                sendSignal({
                    sender: getCurrentUser(),
                    target: targetUser,
                    type: 'candidate',
                    data: event.candidate
                });
            }
        };

        peer.ontrack = function(event) {
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo && event.streams && event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
            }
        };

        peer.onconnectionstatechange = function() {
            setCallStatus(peer.connectionState);
        };

        return peer;
    }

    function sendSignal(payload) {
        if (!window.messengerStomp) {
            return;
        }
        // Send signaling data via STOMP to /app/webrtc.signal
        window.messengerStomp.sendSignal(payload);
    }

    async function startVideoCall(targetUser) {
        if (!targetUser) {
            alert('Select a user to call.');
            return;
        }
        if (!getCurrentUser()) {
            alert('Please login first.');
            return;
        }

        openCallWindow();
        activeTarget = targetUser;

        try {
            const stream = await startLocalStream(true);
            const pc = createPeerConnection(targetUser);

            stream.getTracks().forEach(function(track) {
                pc.addTrack(track, stream);
            });

            // Create offer -> set local description -> send to target
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            sendSignal({
                sender: getCurrentUser(),
                target: targetUser,
                type: 'offer',
                data: offer
            });

            setCallStatus('Calling ' + targetUser + '...');
        } catch (error) {
            console.error('Call error:', error);
            alert('Cannot start call.');
        }
    }

    async function handleSignal(payload) {
        if (!payload || !payload.type) {
            return;
        }
        const sender = payload.sender || '';

        try {
            if (payload.type === 'offer') {
                // Incoming offer: create peer, set remote, answer back.
                openCallWindow();
                activeTarget = sender;

                const stream = await startLocalStream(true);
                const pc = createPeerConnection(sender);

                stream.getTracks().forEach(function(track) {
                    pc.addTrack(track, stream);
                });

                await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                sendSignal({
                    sender: getCurrentUser(),
                    target: sender,
                    type: 'answer',
                    data: answer
                });

                setCallStatus('In call with ' + sender);
            } else if (payload.type === 'answer') {
                // Outgoing offer accepted.
                if (peer) {
                    await peer.setRemoteDescription(new RTCSessionDescription(payload.data));
                    setCallStatus('In call with ' + activeTarget);
                }
            } else if (payload.type === 'candidate') {
                if (peer && payload.data) {
                    await peer.addIceCandidate(new RTCIceCandidate(payload.data));
                }
            } else if (payload.type === 'hangup') {
                endCall();
            }
        } catch (error) {
            console.error('Signal error:', error);
        }
    }

    function endCall() {
        if (peer) {
            peer.close();
            peer = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(function(track) {
                track.stop();
            });
            localStream = null;
        }
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        if (localVideo) {
            localVideo.srcObject = null;
        }
        if (remoteVideo) {
            remoteVideo.srcObject = null;
        }
        setCallStatus('Idle');
    }

    function toggleTrack(kind) {
        if (!localStream) {
            return;
        }
        localStream.getTracks().forEach(function(track) {
            if (track.kind === kind) {
                track.enabled = !track.enabled;
            }
        });
    }

    function bindUI() {
        const voiceBtn = document.getElementById('btnVoiceCall');
        const videoBtn = document.getElementById('btnVideoCall');
        const hangupBtn = document.getElementById('btnHangup');
        const micBtn = document.getElementById('btnToggleMic');
        const camBtn = document.getElementById('btnToggleCam');

        if (voiceBtn) {
            voiceBtn.addEventListener('click', function() {
                startVideoCall(getTargetUser());
            });
        }
        if (videoBtn) {
            videoBtn.addEventListener('click', function() {
                startVideoCall(getTargetUser());
            });
        }
        if (hangupBtn) {
            hangupBtn.addEventListener('click', function() {
                if (activeTarget) {
                    sendSignal({
                        sender: getCurrentUser(),
                        target: activeTarget,
                        type: 'hangup',
                        data: null
                    });
                }
                endCall();
            });
        }
        if (micBtn) {
            micBtn.addEventListener('click', function() {
                toggleTrack('audio');
            });
        }
        if (camBtn) {
            camBtn.addEventListener('click', function() {
                toggleTrack('video');
            });
        }
    }

    function bindStomp() {
        if (!window.messengerStomp) {
            return;
        }
        // Receive signaling data from /queue/webrtc.{username}
        window.messengerStomp.on('webrtc', handleSignal);
    }

    window.webrtcCall = {
        startVideoCall: startVideoCall,
        endCall: endCall
    };

    document.addEventListener('DOMContentLoaded', function() {
        bindUI();
        bindStomp();
    });
})();
