package org.example.backend.service;

import org.example.backend.model.dto.request.ChatMessageRequest;
import org.example.backend.model.dto.response.ChatMessageResponse;

/**
 * Dịch vụ Chatbot AI phân tích chi tiêu tài chính gia đình (Read-Only).
 * Phân tích thu chi, ngân sách, xu hướng và đưa ra lời khuyên tối ưu tài chính.
 */
public interface ChatbotService {

    ChatMessageResponse chat(Long userId, Long familyId, ChatMessageRequest request);
}

