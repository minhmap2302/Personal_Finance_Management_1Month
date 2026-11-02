package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.UnauthorizedException;
import org.example.backend.model.dto.request.ChatMessageRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.ChatMessageResponse;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.service.ChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final FamilyMemberRepository familyMemberRepository;

    @PostMapping("/families/{familyId}/chatbot/chat")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> chat(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody ChatMessageRequest request) {
        if (currentUser == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập");
        }

        if (currentUser.getRole() == SystemRole.ADMIN) {
            throw new ForbiddenException("Tài khoản ADMIN không được sử dụng chatbot của gia đình");
        }

        FamilyMember member = familyMemberRepository.findByUserIdAndFamilyId(currentUser.getId(), familyId)
                .orElseThrow(() -> new ForbiddenException("Bạn không thuộc gia đình này"));

        ChatMessageResponse response = chatbotService.chat(currentUser.getId(), familyId, request);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi từ chatbot", response));
    }
}
