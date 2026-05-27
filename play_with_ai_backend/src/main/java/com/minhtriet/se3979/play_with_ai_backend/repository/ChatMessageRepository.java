package com.minhtriet.se3979.play_with_ai_backend.repository;

import com.minhtriet.se3979.play_with_ai_backend.model.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    // Để trống! Spring Boot đã tự động viết sẵn cho bạn các hàm save(), findAll(), delete() ở dưới nền rồi.
}