package com.minhtriet.se3979.play_with_ai_backend.controller;

import com.minhtriet.se3979.play_with_ai_backend.model.User;
import com.minhtriet.se3979.play_with_ai_backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserStatusController {
    private final UserRepository userRepository;

    public UserStatusController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatuses(@RequestParam(value = "exclude", required = false) String exclude) {
        String skip = exclude == null ? "" : exclude.trim();
        List<UserStatus> result = new ArrayList<>();
        for (User user : userRepository.findAllByOrderByUsernameAsc()) {
            if (!skip.isEmpty() && user.getUsername().equalsIgnoreCase(skip)) {
                continue;
            }
            result.add(new UserStatus(user.getUsername(), user.isOnline()));
        }
        return ResponseEntity.ok(result);
    }

    public static class UserStatus {
        private final String username;
        private final boolean online;

        public UserStatus(String username, boolean online) {
            this.username = username;
            this.online = online;
        }

        public String getUsername() {
            return username;
        }

        public boolean isOnline() {
            return online;
        }
    }
}
