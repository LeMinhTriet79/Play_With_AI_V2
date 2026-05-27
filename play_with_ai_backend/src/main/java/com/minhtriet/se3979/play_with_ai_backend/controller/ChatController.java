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
        chatMessageRepository.save(chatMessage);
        messagingTemplate.convertAndSend("/topic/public", chatMessage);
    }

    // 2. CHAT RIÊNG NHƯ ZALO/MESSENGER
    // Client người nhận sẽ lắng nghe ở kênh: /queue/private.<username>
    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(getNow());
        chatMessageRepository.save(chatMessage); // Vẫn lưu lịch sử vào DB

        // Bắn tin nhắn trực tiếp vào "hộp thư" của người nhận
        messagingTemplate.convertAndSend("/queue/private." + chatMessage.getReceiver(), chatMessage);
        // Bắn ngược lại cho người gửi để hiển thị lên màn hình của họ
        messagingTemplate.convertAndSend("/queue/private." + chatMessage.getSender(), chatMessage);
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