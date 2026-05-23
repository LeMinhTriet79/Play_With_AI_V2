package com.minhtriet.se3979.play_with_ai_v2.service;

import com.minhtriet.se3979.play_with_ai_v2.model.ChatMessage;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import java.util.List;

public class AiChatService {
    private final String defaultModelName;
    private ChatMemory chatMemory;

    public AiChatService(String defaultModelName) {
        this.defaultModelName = defaultModelName;
        this.chatMemory = MessageWindowChatMemory.withMaxMessages(20);
    }

    public void loadHistoryIntoMemory(List<ChatMessage> history) {
        chatMemory.clear();
        for (ChatMessage msg : history) {
            if (msg.getSender().equals("YOU")) chatMemory.add(UserMessage.from(msg.getContent()));
            else if (msg.getSender().equals("AI")) chatMemory.add(AiMessage.from(msg.getContent()));
        }
    }

    public String generateResponse(String prompt, String apiKey, String modelName) {
        String finalModelName = (modelName == null || modelName.isBlank()) ? defaultModelName : modelName;
        ChatLanguageModel model = GoogleAiGeminiChatModel.builder().apiKey(apiKey).modelName(finalModelName).build();
        chatMemory.add(UserMessage.from(prompt));
        AiMessage response = model.generate(chatMemory.messages()).content();
        chatMemory.add(response);
        return response.text();
    }
}