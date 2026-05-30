package com.minhtriet.se3979.play_with_ai_backend.controller;

import com.minhtriet.se3979.play_with_ai_backend.model.ChatMessage;
import com.minhtriet.se3979.play_with_ai_backend.repository.ChatMessageRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatHistoryController {
    private final ChatMessageRepository chatMessageRepository;

    public ChatHistoryController(ChatMessageRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam("user1") String user1,
                                        @RequestParam("user2") String user2) {
        if (user1 == null || user2 == null || user1.trim().isEmpty() || user2.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu username"));
        }
        String u1 = user1.trim();
        String u2 = user2.trim();
        List<ChatMessage> history = chatMessageRepository.findConversation(
            u1,
            u2,
            Sort.by(Sort.Direction.ASC, "timestamp")
        );
        return ResponseEntity.ok(history);
    }
}
