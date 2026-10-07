package com.minhtriet.se3979.play_with_ai_backend.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * Handles all in-game WebSocket messages for online chess.
 * All client messages arrive at /app/game.event and are broadcast
 * to /topic/game/{roomId} so every subscriber in the room receives them.
 *
 * Message types handled:
 *   JOIN       – player joined the room (notifies opponent)
 *   LEAVE      – player left the room
 *   MOVE       – a chess move (sr, sc, tr, tc)
 *   RESIGN     – player resigned
 *   DRAW       – player requests draw
 *   DRAW_ACCEPT– player accepts draw
 *   CHAT       – in-game chat message
 */
@Controller
public class GameController {

    private final SimpMessagingTemplate messagingTemplate;

    public GameController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Single entry-point for all game events.
     * Expects payload: { type, roomId, sender, ... }
     */
    @MessageMapping("/game.event")
    public void handleGameEvent(@Payload Map<String, Object> payload) {
        String roomId = (String) payload.get("roomId");
        if (roomId == null || roomId.isBlank()) {
            System.err.println("[GameController] Missing roomId in payload: " + payload);
            return;
        }
        String type = (String) payload.get("type");
        System.out.println("[GameController] event=" + type + " room=" + roomId + " from=" + payload.get("sender"));

        // Broadcast the exact payload to everyone subscribed to this room's topic
        messagingTemplate.convertAndSend("/topic/game/" + roomId, (Object) payload);
    }

    /**
     * Legacy endpoint kept for backwards compatibility.
     * Redirects to handleGameEvent.
     */
    @MessageMapping("/game.move")
    public void handleGameMove(@Payload Map<String, Object> payload) {
        handleGameEvent(payload);
    }
}
