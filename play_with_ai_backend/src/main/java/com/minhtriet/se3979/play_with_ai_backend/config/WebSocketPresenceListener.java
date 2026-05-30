package com.minhtriet.se3979.play_with_ai_backend.config;

import com.minhtriet.se3979.play_with_ai_backend.service.PresenceService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketPresenceListener {
    private final PresenceService presenceService;

    public WebSocketPresenceListener(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        presenceService.unregisterSession(event.getSessionId());
    }
}
