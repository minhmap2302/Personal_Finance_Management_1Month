package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.TransferOwnershipRequest;
import org.example.backend.model.dto.request.UpdateMemberRoleRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.FamilyMemberResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.FamilyMemberService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API thành viên trong gia đình: danh sách, đổi vai trò, xóa, rời đi, chuyển quyền chủ.
 */
@RestController
@RequestMapping("/api/v1/families/{familyId}")
@RequiredArgsConstructor
public class FamilyMemberController {

    private final FamilyMemberService familyMemberService;

    /** Danh sách thành viên, tìm theo tên đăng nhập hoặc họ tên qua tham số keyword. */
    @GetMapping("/members")
    public ResponseEntity<ApiResponse<Page<FamilyMemberResponse>>> getMembers(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20, sort = "joinedAt", direction = Sort.Direction.ASC) Pageable pageable) {
        Page<FamilyMemberResponse> data =
                familyMemberService.getMembers(currentUser.getId(), familyId, keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thành viên thành công", data));
    }

    /** Chủ gia đình nâng thành viên lên MANAGER hoặc hạ xuống MEMBER. */
    @PutMapping("/members/{targetUserId}/role")
    public ResponseEntity<ApiResponse<FamilyMemberResponse>> updateMemberRole(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long targetUserId,
            @Valid @RequestBody UpdateMemberRoleRequest request) {
        FamilyMemberResponse data =
                familyMemberService.updateMemberRole(currentUser.getId(), familyId, targetUserId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò thành công", data));
    }

    @DeleteMapping("/members/{targetUserId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long targetUserId) {
        familyMemberService.removeMember(currentUser.getId(), familyId, targetUserId);
        return ResponseEntity.ok(ApiResponse.success("Xóa thành viên thành công"));
    }

    @PostMapping("/leave")
    public ResponseEntity<ApiResponse<Void>> leaveFamily(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId) {
        familyMemberService.leaveFamily(currentUser.getId(), familyId);
        return ResponseEntity.ok(ApiResponse.success("Rời gia đình thành công"));
    }

    @PostMapping("/transfer-ownership")
    public ResponseEntity<ApiResponse<Void>> transferOwnership(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody TransferOwnershipRequest request) {
        familyMemberService.transferOwnership(currentUser.getId(), familyId, request);
        return ResponseEntity.ok(ApiResponse.success("Chuyển quyền chủ gia đình thành công"));
    }
}