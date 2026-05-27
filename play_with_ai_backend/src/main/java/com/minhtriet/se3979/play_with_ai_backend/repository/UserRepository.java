package com.minhtriet.se3979.play_with_ai_backend.repository;

import com.minhtriet.se3979.play_with_ai_backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
}