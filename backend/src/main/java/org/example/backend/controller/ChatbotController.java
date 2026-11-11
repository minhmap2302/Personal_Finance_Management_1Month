package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.UnauthorizedException;
import org.example.backend.model.dto.request.ChatMessageRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.ChatMessageResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.service.ChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller cho Chatbot AI phân tích chi tiêu tài chính gia đình (Read-Only).
 * - Quyền truy cập: Chỉ thành viên gia đình (Admin hệ thống bị chặn).
 * - Hoạt động chỉ đọc: không sửa đổi bất kỳ dữ liệu thu chi, ngân sách nào.
 */
@RestController
@RequestMapping("/api/v1/families/{familyId}/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    /**
     * Gửi yêu cầu phân tích chi tiêu hoặc trò chuyện tài chính với FinHome AI.
     * Hỗ trợ cả 2 endpoint:
     * - POST /api/v1/families/{familyId}/chatbot
     * - POST /api/v1/families/{familyId}/chatbot/chat
     */
    @PostMapping(value = {"", "/chat"})
    public ResponseEntity<ApiResponse<ChatMessageResponse>> chat(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody ChatMessageRequest request) {

        if (currentUser == null) {
            throw new UnauthorizedException("Yêu cầu đăng nhập để sử dụng dịch vụ Chatbot");
        }

        if (currentUser.getRole() == SystemRole.ADMIN) {
            throw new ForbiddenException("Quản trị viên hệ thống (Admin) không có quyền xem dữ liệu tài chính gia đình qua chatbot");
        }

        ChatMessageResponse response = chatbotService.chat(currentUser.getId(), familyId, request);
        return ResponseEntity.ok(ApiResponse.success("Phân tích chi tiêu tài chính thành công", response));
    }
}

