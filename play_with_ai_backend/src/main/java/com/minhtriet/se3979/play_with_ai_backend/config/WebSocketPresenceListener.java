package com.minhtriet.se3979.play_with_ai_backend.config;

import com.minhtriet.se3979.play_with_ai_backend.service.PresenceService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.minhtriet.se3979.play_with_ai_backend.controller.ChessRoomController;

@Component
public class WebSocketPresenceListener {
    private final PresenceService presenceService;
    private final ChessRoomController chessRoomController;

    public WebSocketPresenceListener(PresenceService presenceService, ChessRoomController chessRoomController) {
        this.presenceService = presenceService;
        this.chessRoomController = chessRoomController;
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        String username = presenceService.unregisterSession(event.getSessionId());
        if (username != null) {
            chessRoomController.handleUserDisconnect(username);
        }
    }
}
