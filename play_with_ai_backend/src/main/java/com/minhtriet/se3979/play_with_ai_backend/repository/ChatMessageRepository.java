package com.minhtriet.se3979.play_with_ai_backend.repository;

import com.minhtriet.se3979.play_with_ai_backend.model.ChatMessage;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    // Để trống! Spring Boot đã tự động viết sẵn cho bạn các hàm save(), findAll(), delete() ở dưới nền rồi.

    @Query("{ '$and': [ { '$or': [ { 'sender': ?0, 'receiver': ?1 }, { 'sender': ?1, 'receiver': ?0 } ] }, { '$or': [ { 'type': 'CHAT' }, { 'type': null }, { 'type': { '$exists': false } } ] } ] }")
    List<ChatMessage> findConversation(String user1, String user2, Sort sort);
}