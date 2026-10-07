package com.minhtriet.se3979.play_with_ai_backend.service;

import com.minhtriet.se3979.play_with_ai_backend.model.User;
import com.minhtriet.se3979.play_with_ai_backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PresenceService {
    private final UserRepository userRepository;
    private final ConcurrentHashMap<String, String> sessionUsers = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicInteger> userSessions = new ConcurrentHashMap<>();

    public PresenceService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void resetOnlineFlags() {
        List<User> users = userRepository.findAll();
        boolean changed = false;
        for (User user : users) {
            if (user.isOnline()) {
                user.setOnline(false);
                changed = true;
            }
        }
        if (changed) {
            userRepository.saveAll(users);
        }
    }

    public void registerSession(String sessionId, String username) {
        if (sessionId == null || username == null) {
            return;
        }
        String trimmed = username.trim();
        if (trimmed.isEmpty()) {
            return;
        }
        sessionUsers.put(sessionId, trimmed);
        AtomicInteger counter = userSessions.computeIfAbsent(trimmed, key -> new AtomicInteger(0));
        int next = counter.incrementAndGet();
        if (next == 1) {
            updateOnline(trimmed, true);
        }
    }

    public void unregisterSession(String sessionId) {
        if (sessionId == null) {
            return;
        }
        String username = sessionUsers.remove(sessionId);
        if (username == null) {
            return;
        }
        AtomicInteger counter = userSessions.get(username);
        if (counter == null) {
            updateOnline(username, false);
            return;
        }
        int next = counter.decrementAndGet();
        if (next <= 0) {
            userSessions.remove(username);
            updateOnline(username, false);
        }
    }

    private void updateOnline(String username, boolean online) {
        userRepository.findByUsername(username).ifPresent(user -> {
            if (user.isOnline() != online) {
                user.setOnline(online);
                userRepository.save(user);
            }
        });
    }
}
