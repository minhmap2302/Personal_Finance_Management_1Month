package org.example.backend.service;

import org.example.backend.model.dto.request.ChatMessageRequest;
import org.example.backend.model.dto.response.ChatMessageResponse;

public interface ChatbotService {
    ChatMessageResponse chat(Long userId, Long familyId, ChatMessageRequest request);
}
