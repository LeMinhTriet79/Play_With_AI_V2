package com.minhtriet.se3979.play_with_ai_backend.model;

import lombok.Data;

@Data
public class SignalMessage {
    private String sender;
    private String target; // Gửi cho ai
    private String type;   // OFFER, ANSWER, ICE_CANDIDATE, HANGUP
    private Object data;   // Dữ liệu WebRTC
}