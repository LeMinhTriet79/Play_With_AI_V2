package com.minhtriet.se3979.play_with_ai_backend.config;

import com.minhtriet.se3979.play_with_ai_backend.service.PresenceService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class WebSocketPresenceInterceptor implements ChannelInterceptor {
    private final PresenceService presenceService;

    public WebSocketPresenceInterceptor(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String username = extractUsername(accessor);
            String sessionId = accessor.getSessionId();
            if (sessionId != null && username != null && !username.trim().isEmpty()) {
                presenceService.registerSession(sessionId, username);
            }
        }
        return message;
    }

    private String extractUsername(StompHeaderAccessor accessor) {
        String username = accessor.getFirstNativeHeader("username");
        if (username == null || username.trim().isEmpty()) {
            username = accessor.getFirstNativeHeader("login");
        }
        return username;
    }
}
