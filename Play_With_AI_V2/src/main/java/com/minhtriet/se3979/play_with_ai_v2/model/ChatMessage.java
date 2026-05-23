package com.minhtriet.se3979.play_with_ai_v2.model;

public class ChatMessage {
    private String sender;
    private String content;
    private String timestamp;

    public ChatMessage(String sender, String content, String timestamp) {
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
    }

    public String getSender() { return sender; }
    public String getContent() { return content; }
    public String getTimestamp() { return timestamp; }
}