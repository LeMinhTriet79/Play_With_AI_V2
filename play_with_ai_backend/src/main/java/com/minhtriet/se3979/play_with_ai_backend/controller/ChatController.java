package com.minhtriet.se3979.play_with_ai_backend.controller;

import com.minhtriet.se3979.play_with_ai_backend.model.ChatMessage;
import com.minhtriet.se3979.play_with_ai_backend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Controller
public class ChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    // Bắt các tin nhắn gửi đến địa chỉ /app/chat.sendMessage từ Javascript
    @MessageMapping("/chat.sendMessage")
    // Gửi ngược kết quả tới tất cả những máy tính đang nghe ở kênh /topic/public
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        // 1. Cập nhật giờ hệ thống chuẩn trước khi lưu
        chatMessage.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        // 2. Lưu tin nhắn vào MongoDB (Thông qua Repository đã tạo ở Bước 3)
        chatMessageRepository.save(chatMessage);

        // 3. Trả về để Server tự động phát thanh cho mọi người
        return chatMessage;
    }

    // Bắt sự kiện có người mới tham gia phòng chat
    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        // Lưu tên người dùng vào phiên kết nối (Session) hiện tại
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());

        chatMessage.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return chatMessage;
    }
}