package com.minhtriet.se3979.play_with_ai_v2.model;

public class ChatSession {
    private int id;
    private String title;

    public ChatSession(int id, String title) {
        this.id = id;
        this.title = title;
    }

    public int getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
}