package com.minhtriet.se3979.play_with_ai_backend.controller;

import com.minhtriet.se3979.play_with_ai_backend.model.User;
import com.minhtriet.se3979.play_with_ai_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Cho phép Giao diện gọi API không bị chặn
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        String username = user.getUsername();
        String password = user.getPassword();

        if (username == null || password == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập đầy đủ tài khoản và mật khẩu!"));
        }

        username = username.trim();
        password = password.trim();

        if (username.length() > 10 || password.length() > 10) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tài khoản/Mật khẩu tối đa 10 ký tự!"));
        }
        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên này đã có người xài rồi!"));
        }
        user.setUsername(username);
        user.setPassword(password);
        user.setOnline(false);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Đăng ký thành công!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {
        String username = user.getUsername();
        String password = user.getPassword();

        if (username == null || password == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập đầy đủ tài khoản và mật khẩu!"));
        }

        username = username.trim();
        password = password.trim();

        Optional<User> existingUser = userRepository.findByUsername(username);
        if (existingUser.isPresent() && existingUser.get().getPassword().equals(password)) {
            return ResponseEntity.ok(Map.of("message", "Đăng nhập thành công", "username", username));
        }
        return ResponseEntity.status(401).body(Map.of("message", "Sai tên hoặc mật khẩu!"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String oldPassword = payload.get("oldPassword");
        String newPassword = payload.get("newPassword");

        if (username == null || oldPassword == null || newPassword == null
            || username.trim().isEmpty() || oldPassword.trim().isEmpty() || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập đầy đủ thông tin!"));
        }

        username = username.trim();
        oldPassword = oldPassword.trim();
        newPassword = newPassword.trim();

        if (newPassword.length() > 10) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu mới tối đa 10 ký tự!"));
        }

        Optional<User> existingUser = userRepository.findByUsername(username);
        if (existingUser.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy tài khoản!"));
        }

        User user = existingUser.get();
        if (!user.getPassword().equals(oldPassword)) {
            return ResponseEntity.status(401).body(Map.of("message", "Mật khẩu cũ không đúng!"));
        }

        user.setPassword(newPassword);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công!"));
    }
}