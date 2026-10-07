package com.minhtriet.se3979.play_with_ai_backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "chat_messages")
public class ChatMessage {
    @Id
    private String id;
    private String sender;      // Người gửi
    private String receiver;    // Người nhận (Dùng cho Private Chat)
    private String roomId;      // Mã phòng (Dùng cho Game/Phòng chung)
    private String content;     // Nội dung
    private String timestamp;   // Thời gian
    private MessageType type;   // Loại tin nhắn
    private boolean recalled;   // Đã thu hồi

    public enum MessageType {
        CHAT, JOIN, LEAVE, GAME_MOVE // Thêm GAME_MOVE để truyền nước cờ
    }
}