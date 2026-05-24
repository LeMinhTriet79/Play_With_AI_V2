package com.minhtriet.se3979.play_with_ai_v2;

import com.google.gson.Gson;
import com.minhtriet.se3979.play_with_ai_v2.model.ApiKey;
import com.minhtriet.se3979.play_with_ai_v2.model.ChatMessage;
import com.minhtriet.se3979.play_with_ai_v2.model.ChatSession;
import com.minhtriet.se3979.play_with_ai_v2.service.AiChatService;
import com.minhtriet.se3979.play_with_ai_v2.service.DatabaseService;
import com.minhtriet.se3979.play_with_ai_v2.util.MarkdownParser;
import javafx.application.Platform;
import javafx.scene.web.WebEngine;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class JavaBridge {
    private static final String DEFAULT_SESSION_PREFIX = "Đoạn chat mới: ";

    private final WebEngine webEngine;
    private final DatabaseService dbService;
    private final AiChatService aiService;
    private final Gson gson = new Gson();
    private final DateTimeFormatter timestampFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private volatile ChatSession currentSession;

    public JavaBridge(WebEngine webEngine) {
        this.webEngine = webEngine;
        this.dbService = new DatabaseService();
        this.aiService = new AiChatService("gemini-2.5-flash");
    }

    public void initData() {
        runBackground(() -> refreshState(null, true));
    }

    public void selectSession(int id) {
        runBackground(() -> refreshState(id, true));
    }

    public void handleNewSession() {
        runBackground(() -> {
            ChatSession created = dbService.createNewSession(defaultSessionTitle());
            refreshState(created != null ? created.getId() : null, true);
        });
    }

    public void handleRenameSession(int id, String newName) {
        if (newName == null || newName.trim().isEmpty()) {
            return;
        }

        runBackground(() -> {
            dbService.updateSessionTitle(id, newName.trim());
            refreshState(id, false);
        });
    }

    public void handleDeleteSession(int id) {
        runBackground(() -> {
            dbService.deleteSession(id);
            refreshState(null, true);
        });
    }

    public void handleAddKey(String name, String value) {
        String safeName = name == null ? "" : name.trim();
        String safeValue = value == null ? "" : value.trim();
        if (safeName.isEmpty() || safeValue.isEmpty()) {
            runOnFxThread(() -> safeAlert("Vui lòng điền đủ Tên gợi nhớ và Mã API Key."));
            return;
        }

        runBackground(() -> {
            dbService.addApiKey(safeName, safeValue);
            refreshKeysOnly();
            runOnFxThread(() -> safeAlert("Đã lưu Key thành công!"));
        });
    }

    public void handleDeleteKey(int id) {
        runBackground(() -> {
            dbService.deleteApiKey(id);
            refreshKeysOnly();
        });
    }

    public void handleSetActiveKey(int id) {
        runBackground(() -> {
            dbService.setActiveApiKey(id);
            refreshKeysOnly();
            runOnFxThread(() -> safeAlert("Đã áp dụng Key làm mặc định!"));
        });
    }

    public void handleSend(String userText, String modelName) {
        ChatSession sessionSnapshot = currentSession;
        String trimmedText = userText == null ? "" : userText.trim();
        if (sessionSnapshot == null || trimmedText.isEmpty()) {
            return;
        }

        String normalizedModel = modelName == null ? "" : modelName.trim();

        runBackground(() -> {
            String apiKey = dbService.getActiveApiKey();
            if (apiKey == null || apiKey.isBlank()) {
                String errorHtml = MarkdownParser.convertMarkdownToHtml("Lỗi: Bạn chưa cài đặt API Key. Hãy sang tab Cài đặt để thêm Key!");
                runOnFxThread(() -> {
                    appendMessage("SYSTEM", errorHtml, now(), "red");
                    safeSetBusy(false);
                });
                return;
            }

            String userTimestamp = now();
            String userHtml = MarkdownParser.convertMarkdownToHtml(trimmedText);
            boolean titleChanged = false;

            if (sessionSnapshot.getTitle() != null && sessionSnapshot.getTitle().startsWith(DEFAULT_SESSION_PREFIX)) {
                String newTitle = trimmedText.length() > 25 ? trimmedText.substring(0, 25) + "..." : trimmedText;
                dbService.updateSessionTitle(sessionSnapshot.getId(), newTitle);
                sessionSnapshot.setTitle(newTitle);
                currentSession = sessionSnapshot;
                titleChanged = true;
            }

            dbService.saveMessage(sessionSnapshot.getId(), "YOU", trimmedText, userTimestamp);
            runOnFxThread(() -> {
                safeClearInput();
                appendMessage("YOU", userHtml, userTimestamp, "blue");
                safeSetBusy(true);
            });

            if (titleChanged) {
                refreshSessionsOnly(sessionSnapshot.getId());
            }

            try {
                String aiText = aiService.generateResponse(trimmedText, apiKey, normalizedModel);
                String aiTimestamp = now();
                String aiHtml = MarkdownParser.convertMarkdownToHtml(aiText);
                dbService.saveMessage(sessionSnapshot.getId(), "AI", aiText, aiTimestamp);

                runOnFxThread(() -> {
                    appendMessage("AI", aiHtml, aiTimestamp, "green");
                    safeSetBusy(false);
                });
            } catch (Exception ex) {
                String errorHtml = MarkdownParser.convertMarkdownToHtml("Lỗi: " + ex.getMessage());
                runOnFxThread(() -> {
                    appendMessage("SYSTEM", errorHtml, now(), "red");
                    safeSetBusy(false);
                });
            }
        });
    }

    private void refreshState(Integer preferredSessionId, boolean loadHistory) {
        List<ChatSession> sessions = dbService.getAllSessions();
        if (sessions.isEmpty()) {
            ChatSession created = dbService.createNewSession(defaultSessionTitle());
            sessions = dbService.getAllSessions();
            if (created != null) {
                preferredSessionId = created.getId();
            }
        }

        List<ApiKey> apiKeys = dbService.getAllApiKeys();
        ChatSession selectedSession = resolveSession(sessions, preferredSessionId);
        List<ChatMessage> history = new ArrayList<>();

        if (selectedSession != null) {
            currentSession = selectedSession;
            if (loadHistory) {
                history = dbService.getMessagesBySession(selectedSession.getId());
                aiService.loadHistoryIntoMemory(history);
            }
        } else {
            currentSession = null;
            if (loadHistory) {
                aiService.loadHistoryIntoMemory(history);
            }
        }

        final List<ChatSession> sessionsSnapshot = sessions;
        final List<ApiKey> apiKeysSnapshot = apiKeys;
        final ChatSession selectedSnapshot = selectedSession;
        final List<ChatMessage> historySnapshot = history;

        runOnFxThread(() -> {
            webEngine.executeScript("updateSessions(" + gson.toJson(sessionsSnapshot) + ")");
            webEngine.executeScript("updateKeys(" + gson.toJson(apiKeysSnapshot) + ")");

            if (selectedSnapshot != null) {
                webEngine.executeScript("setSelectedSession(" + selectedSnapshot.getId() + ")");
                if (loadHistory) {
                    webEngine.executeScript("clearChat()");
                    for (ChatMessage message : historySnapshot) {
                        appendMessage(
                                message.getSender(),
                                MarkdownParser.convertMarkdownToHtml(message.getContent()),
                                message.getTimestamp(),
                                colorForSender(message.getSender())
                        );
                    }
                }
            } else if (loadHistory) {
                webEngine.executeScript("clearChat()");
            }

            safeSetBusy(false);
        });
    }

    private void refreshKeysOnly() {
        List<ApiKey> apiKeys = dbService.getAllApiKeys();
        runOnFxThread(() -> webEngine.executeScript("updateKeys(" + gson.toJson(apiKeys) + ")"));
    }

    private void refreshSessionsOnly(int selectedSessionId) {
        List<ChatSession> sessions = dbService.getAllSessions();
        runOnFxThread(() -> {
            webEngine.executeScript("updateSessions(" + gson.toJson(sessions) + ")");
            if (selectedSessionId > 0) {
                webEngine.executeScript("setSelectedSession(" + selectedSessionId + ")");
            }
        });
    }

    private ChatSession resolveSession(List<ChatSession> sessions, Integer preferredSessionId) {
        if (sessions.isEmpty()) {
            return null;
        }

        if (preferredSessionId != null) {
            for (ChatSession session : sessions) {
                if (session.getId() == preferredSessionId) {
                    return session;
                }
            }
        }

        if (currentSession != null) {
            for (ChatSession session : sessions) {
                if (session.getId() == currentSession.getId()) {
                    return session;
                }
            }
        }

        return sessions.get(0);
    }

    private void appendMessage(String sender, String html, String timestamp, String color) {
        webEngine.executeScript(
                "window.appendMessage(" + jsString(sender) + ", " + jsString(html) + ", " + jsString(timestamp) + ", " + jsString(color) + ")"
        );
    }

    private void safeAlert(String message) {
        webEngine.executeScript(
                "if (window.showInfoDialog) { window.showInfoDialog(" + jsString(message) + "); } else { alert(" + jsString(message) + "); }"
        );
    }

    private void safeClearInput() {
        webEngine.executeScript("window.clearInput()");
    }

    private void safeSetBusy(boolean busy) {
        webEngine.executeScript("window.setBusy(" + busy + ")");
    }

    private void runBackground(Runnable task) {
        Thread thread = new Thread(task, "play-with-ai-v2-bridge");
        thread.setDaemon(true);
        thread.start();
    }

    private void runOnFxThread(Runnable task) {
        if (Platform.isFxApplicationThread()) {
            task.run();
        } else {
            Platform.runLater(task);
        }
    }

    private String jsString(String value) {
        return gson.toJson(value == null ? "" : value);
    }

    private String now() {
        return timestampFormat.format(LocalDateTime.now());
    }

    private String colorForSender(String sender) {
        if ("YOU".equals(sender)) {
            return "blue";
        }
        if ("AI".equals(sender)) {
            return "green";
        }
        return "red";
    }

    private String defaultSessionTitle() {
        return DEFAULT_SESSION_PREFIX + now();
    }
}