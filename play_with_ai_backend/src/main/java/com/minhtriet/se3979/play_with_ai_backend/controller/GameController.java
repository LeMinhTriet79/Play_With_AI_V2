package com.minhtriet.se3979.play_with_ai_backend.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class GameController {

    private final SimpMessagingTemplate messagingTemplate;

    public GameController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/game.move")
    public void handleGameMove(@Payload Map<String, Object> payload) {
        System.out.println("DEBUG GameController received: " + payload);
        String roomId = (String) payload.get("roomId");
        if (roomId != null) {
            // Broadcast the move directly to all clients in the room
            messagingTemplate.convertAndSend("/topic/game/" + roomId, (Object) payload);
        }
    }
}
