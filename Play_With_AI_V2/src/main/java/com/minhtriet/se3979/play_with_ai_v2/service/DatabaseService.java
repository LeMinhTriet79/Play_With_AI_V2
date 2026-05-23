package com.minhtriet.se3979.play_with_ai_v2.service;

import com.minhtriet.se3979.play_with_ai_v2.model.*;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class DatabaseService {
    private static final String DB_URL = "jdbc:sqlite:chat_history.db";

    public DatabaseService() { initDatabase(); }

    private void initDatabase() {
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE IF NOT EXISTS t_session (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
            stmt.execute("CREATE TABLE IF NOT EXISTS t_message (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER, sender TEXT, content TEXT, timestamp TEXT, FOREIGN KEY(session_id) REFERENCES t_session(id))");
            stmt.execute("CREATE TABLE IF NOT EXISTS t_api_key (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, value TEXT NOT NULL, is_active INTEGER DEFAULT 0)");
        } catch (SQLException e) { e.printStackTrace(); }
    }

    public ChatSession createNewSession(String title) {
        String sql = "INSERT INTO t_session(title) VALUES(?)";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            pstmt.setString(1, title);
            pstmt.executeUpdate();
            ResultSet rs = pstmt.getGeneratedKeys();
            if (rs.next()) return new ChatSession(rs.getInt(1), title);
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }

    public void updateSessionTitle(int sessionId, String newTitle) {
        String sql = "UPDATE t_session SET title = ? WHERE id = ?";
        try (Connection conn = DriverManager.getConnection(DB_URL); PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, newTitle); pstmt.setInt(2, sessionId); pstmt.executeUpdate();
        } catch (SQLException e) { e.printStackTrace(); }
    }

    public List<ChatSession> getAllSessions() {
        List<ChatSession> sessions = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(DB_URL); Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery("SELECT * FROM t_session ORDER BY id DESC")) {
            while (rs.next()) sessions.add(new ChatSession(rs.getInt("id"), rs.getString("title")));
        } catch (SQLException e) { e.printStackTrace(); }
        return sessions;
    }

    public void deleteSession(int sessionId) {
        try (Connection conn = DriverManager.getConnection(DB_URL)) {
            try (PreparedStatement pstmt1 = conn.prepareStatement("DELETE FROM t_message WHERE session_id = ?")) {
                pstmt1.setInt(1, sessionId); pstmt1.executeUpdate();
            }
            try (PreparedStatement pstmt2 = conn.prepareStatement("DELETE FROM t_session WHERE id = ?")) {
                pstmt2.setInt(1, sessionId); pstmt2.executeUpdate();
            }
        } catch (SQLException e) { e.printStackTrace(); }
    }

    public void saveMessage(int sessionId, String sender, String content, String timestamp) {
        String sql = "INSERT INTO t_message(session_id, sender, content, timestamp) VALUES(?,?,?,?)";
        try (Connection conn = DriverManager.getConnection(DB_URL); PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, sessionId); pstmt.setString(2, sender); pstmt.setString(3, content); pstmt.setString(4, timestamp); pstmt.executeUpdate();
        } catch (SQLException e) { e.printStackTrace(); }
    }

    public List<ChatMessage> getMessagesBySession(int sessionId) {
        List<ChatMessage> msgs = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(DB_URL); PreparedStatement pstmt = conn.prepareStatement("SELECT * FROM t_message WHERE session_id = ? ORDER BY id ASC")) {
            pstmt.setInt(1, sessionId);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) msgs.add(new ChatMessage(rs.getString("sender"), rs.getString("content"), rs.getString("timestamp")));
        } catch (SQLException e) { e.printStackTrace(); }
        return msgs;
    }

    public List<ApiKey> getAllApiKeys() {
        List<ApiKey> keys = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(DB_URL); Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery("SELECT * FROM t_api_key ORDER BY id ASC")) {
            while (rs.next()) keys.add(new ApiKey(rs.getInt("id"), rs.getString("name"), rs.getString("value"), rs.getInt("is_active") == 1));
        } catch (SQLException e) { e.printStackTrace(); }
        return keys;
    }

    public String getActiveApiKey() {
        try (Connection conn = DriverManager.getConnection(DB_URL); Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery("SELECT value FROM t_api_key WHERE is_active = 1 LIMIT 1")) {
            if (rs.next()) return rs.getString("value");
        } catch (SQLException e) { e.printStackTrace(); }
        return null;
    }

    public void addApiKey(String name, String value) {
        try (Connection conn = DriverManager.getConnection(DB_URL); PreparedStatement pstmt = conn.prepareStatement("INSERT INTO t_api_key(name, value, is_active) VALUES(?, ?, ?)")) {
            pstmt.setString(1, name); pstmt.setString(2, value); pstmt.setInt(3, getAllApiKeys().isEmpty() ? 1 : 0); pstmt.executeUpdate();
        } catch (SQLException e) { e.printStackTrace(); }
    }

    public void deleteApiKey(int id) {
        try (Connection conn = DriverManager.getConnection(DB_URL); PreparedStatement pstmt = conn.prepareStatement("DELETE FROM t_api_key WHERE id = ?")) {
            pstmt.setInt(1, id); pstmt.executeUpdate();
        } catch (SQLException e) { e.printStackTrace(); }
    }

    public void setActiveApiKey(int id) {
        try (Connection conn = DriverManager.getConnection(DB_URL)) {
            try (Statement stmt = conn.createStatement()) { stmt.executeUpdate("UPDATE t_api_key SET is_active = 0"); }
            try (PreparedStatement pstmt = conn.prepareStatement("UPDATE t_api_key SET is_active = 1 WHERE id = ?")) {
                pstmt.setInt(1, id); pstmt.executeUpdate();
            }
        } catch (SQLException e) { e.printStackTrace(); }
    }
}