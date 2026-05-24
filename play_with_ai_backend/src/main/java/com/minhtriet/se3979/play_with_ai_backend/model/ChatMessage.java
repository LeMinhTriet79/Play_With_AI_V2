package com.minhtriet.se3979.play_with_ai_backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data // Tự động sinh Getter/Setter nhờ thư viện Lombok
@Document(collection = "chat_messages") // Lưu vào bảng tên là chat_messages trong MongoDB
public class ChatMessage {
    @Id
    private String id;          // Mã tin nhắn tự động tạo
    private String sender;      // Tên người gửi (VD: "Triết", "Bạn A")
    private String content;     // Nội dung tin nhắn
    private String timestamp;   // Thời gian gửi
    private MessageType type;   // Loại tin nhắn (CHAT, JOIN, LEAVE)

    public enum MessageType {
        CHAT, JOIN, LEAVE
    }
}