package com.minhtriet.se3979.play_with_ai_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Mở cổng "/ws" để Javascript gọi tới.
        // setAllowedOriginPatterns("*") giúp không bị chặn lỗi CORS (bảo mật chéo) khi test từ máy khác
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Tiền tố "/topic" giống như một Trạm Phát Thanh. Ai đăng ký kênh này sẽ nhận được tin nhắn (Broadcast)
        registry.enableSimpleBroker("/topic");

        // Tiền tố "/app" dành cho tin nhắn từ Client gửi LÊN Server để xử lý
        registry.setApplicationDestinationPrefixes("/app");
    }
}