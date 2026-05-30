package com.minhtriet.se3979.play_with_ai_backend.controller;

import com.minhtriet.se3979.play_with_ai_backend.model.ChatMessage;
import com.minhtriet.se3979.play_with_ai_backend.model.SignalMessage;
import com.minhtriet.se3979.play_with_ai_backend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Controller
public class ChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private String getNow() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    // 1. CHAT CỘNG ĐỒNG (Kênh /topic/public)
    @MessageMapping("/chat.global")
    public void sendGlobalMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(getNow());
        ChatMessage saved = chatMessageRepository.save(chatMessage);
        messagingTemplate.convertAndSend("/topic/public", saved);
    }

    // 2. CHAT RIÊNG NHƯ ZALO/MESSENGER
    // Client người nhận sẽ lắng nghe ở kênh: /queue/private.<username>
    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(getNow());
        chatMessage.setType(ChatMessage.MessageType.CHAT);
        chatMessage.setRecalled(false);
        ChatMessage saved = chatMessageRepository.save(chatMessage); // Vẫn lưu lịch sử vào DB

        // Bắn tin nhắn trực tiếp vào "hộp thư" của người nhận
        messagingTemplate.convertAndSend("/queue/private." + saved.getReceiver(), saved);
        // Bắn ngược lại cho người gửi để hiển thị lên màn hình của họ
        messagingTemplate.convertAndSend("/queue/private." + saved.getSender(), saved);
    }

    // 5. THU HỒI TIN NHẮN
    @MessageMapping("/chat.recall")
    public void recallMessage(@Payload ChatRecallRequest request) {
        if (request == null || request.getId() == null || request.getSender() == null) {
            return;
        }
        Optional<ChatMessage> existing = chatMessageRepository.findById(request.getId());
        if (existing.isEmpty()) {
            return;
        }
        ChatMessage message = existing.get();
        if (!request.getSender().equals(message.getSender())) {
            return;
        }
        if (message.isRecalled()) {
            return;
        }
        message.setRecalled(true);
        message.setContent("Tin nhắn đã thu hồi.");
        chatMessageRepository.save(message);

        messagingTemplate.convertAndSend("/queue/private." + message.getReceiver(), message);
        messagingTemplate.convertAndSend("/queue/private." + message.getSender(), message);
    }

    public static class ChatRecallRequest {
        private String id;
        private String sender;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getSender() {
            return sender;
        }

        public void setSender(String sender) {
            this.sender = sender;
        }
    }

    // 3. CHAT TRONG PHÒNG GAME HOẶC ĐÁNH CỜ CARO
    // Client nghe ở kênh: /topic/room.<roomId>
    @MessageMapping("/chat.room")
    public void sendRoomMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(getNow());
        if (chatMessage.getType() == ChatMessage.MessageType.CHAT) {
            chatMessageRepository.save(chatMessage); // Chỉ lưu text chat
        }
        // Phát thanh toàn bộ dữ liệu (chat hoặc nước cờ) vào đúng phòng game
        messagingTemplate.convertAndSend("/topic/room." + chatMessage.getRoomId(), chatMessage);
    }

    // 4. SIGNALING CHO WEB-RTC (GỌI VIDEO/VOICE CALL)
    // Tốc độ cao, không lưu Database
    @MessageMapping("/webrtc.signal")
    public void processSignal(@Payload SignalMessage signal) {
        // Tổng đài chuyển hướng tín hiệu Video/Voice từ Sender sang Target ngay lập tức
        messagingTemplate.convertAndSend("/queue/webrtc." + signal.getTarget(), signal);
    }
}