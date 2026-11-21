package org.example.backend.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class ChatbotAiConfig {

    @Bean
    public ChatMemory chatMemory() {
        ChatMemory delegate = MessageWindowChatMemory.builder()
                .maxMessages(8)
                .build();

        // Bọc ChatMemory để loại bỏ metadata ẩn (như reasoning_content) khỏi AssistantMessage
        // giúp tương thích hoàn hảo với Groq và các nhà cung cấp OpenAI-compatible khác.
        return new ChatMemory() {
            @Override
            public void add(String conversationId, List<Message> messages) {
                List<Message> cleaned = messages.stream().map(msg -> {
                    if (msg instanceof AssistantMessage assistantMsg) {
                        return new AssistantMessage(assistantMsg.getText());
                    }
                    return msg;
                }).toList();
                delegate.add(conversationId, cleaned);
            }

            @Override
            public List<Message> get(String conversationId) {
                return delegate.get(conversationId);
            }

            @Override
            public void clear(String conversationId) {
                delegate.clear(conversationId);
            }
        };
    }

    @Bean
    @ConditionalOnProperty(name = "spring.ai.openai.api-key", matchIfMissing = false)
    public ChatClient chatClient(ChatModel chatModel, ChatMemory chatMemory) {
        return ChatClient.builder(chatModel)
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
    }
}
