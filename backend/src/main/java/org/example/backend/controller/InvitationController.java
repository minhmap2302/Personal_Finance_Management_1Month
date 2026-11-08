package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.SendInvitationRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.InvitationResponse;
import org.example.backend.model.dto.response.UserSearchResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.InvitationStatus;
import org.example.backend.service.InvitationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API lời mời vào gia đình.
 * Phía gia đình (tìm người, gửi lời mời) nằm dưới /api/v1/families/{familyId}/invitations,
 * phía người được mời (xem, chấp nhận, từ chối) nằm dưới /api/v1/invitations.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    // ------------------------- Phía gia đình (chủ gia đình, quản lý) -------------------------

    /** Tìm người dùng theo tên đăng nhập để mời (ít nhất 2 ký tự), có phân trang, mỗi trang tối đa 20 kết quả. */
    @GetMapping("/families/{familyId}/invitations/search-users")
    public ResponseEntity<ApiResponse<Page<UserSearchResponse>>> searchUsers(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @RequestParam String username,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<UserSearchResponse> data =
                invitationService.searchUsers(currentUser.getId(), familyId, username, pageable);
        return ResponseEntity.ok(ApiResponse.success("Tìm kiếm người dùng thành công", data));
    }

    @PostMapping("/families/{familyId}/invitations")
    public ResponseEntity<ApiResponse<InvitationResponse>> sendInvitation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody SendInvitationRequest request) {
        InvitationResponse data = invitationService.sendInvitation(currentUser.getId(), familyId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi lời mời thành công", data));
    }

    // ------------------------- Phía người được mời -------------------------

    /** Lời mời gửi cho tôi, mặc định là các lời mời đang chờ. */
    @GetMapping("/invitations")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getMyInvitations(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "PENDING") InvitationStatus status) {
        List<InvitationResponse> data = invitationService.getMyInvitations(currentUser.getId(), status);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lời mời thành công", data));
    }

    /** Chi tiết một lời mời gửi cho tôi. */
    @GetMapping("/invitations/{invitationId}")
    public ResponseEntity<ApiResponse<InvitationResponse>> getMyInvitation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long invitationId) {
        InvitationResponse data = invitationService.getMyInvitation(currentUser.getId(), invitationId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin lời mời thành công", data));
    }

    /** Số lời mời đang chờ, dùng cho chấm đỏ thông báo. */
    @GetMapping("/invitations/pending-count")
    public ResponseEntity<ApiResponse<Long>> countPendingInvitations(
            @AuthenticationPrincipal User currentUser) {
        long count = invitationService.countPendingInvitations(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy số lời mời đang chờ thành công", count));
    }

    @PostMapping("/invitations/{invitationId}/accept")
    public ResponseEntity<ApiResponse<InvitationResponse>> acceptInvitation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long invitationId) {
        InvitationResponse data = invitationService.acceptInvitation(currentUser.getId(), invitationId);
        return ResponseEntity.ok(ApiResponse.success("Đã tham gia gia đình", data));
    }

    @PostMapping("/invitations/{invitationId}/decline")
    public ResponseEntity<ApiResponse<InvitationResponse>> declineInvitation(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long invitationId) {
        InvitationResponse data = invitationService.declineInvitation(currentUser.getId(), invitationId);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối lời mời", data));
    }
}