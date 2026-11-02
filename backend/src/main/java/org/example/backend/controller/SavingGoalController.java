package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.SavingGoalRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.SavingGoalResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.SavingGoalStatus;
import org.example.backend.service.SavingGoalService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * API mục tiêu tiết kiệm của gia đình. Các khoản đóng góp nằm ở SavingContributionController.
 */
@RestController
@RequestMapping("/api/v1/families/{familyId}/saving-goals")
@RequiredArgsConstructor
public class SavingGoalController {

    private final SavingGoalService savingGoalService;

    @PostMapping
    public ResponseEntity<ApiResponse<SavingGoalResponse>> createGoal(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody SavingGoalRequest request) {
        SavingGoalResponse data = savingGoalService.createGoal(currentUser.getId(), familyId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mục tiêu tiết kiệm thành công", data));
    }

    /**
     * Danh sách mục tiêu của gia đình, mới nhất trước. Tìm theo tên bằng keyword, lọc theo status.
     * Sắp xếp được theo name, targetAmount, targetDate, createdAt, id.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<SavingGoalResponse>>> getGoals(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SavingGoalStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<SavingGoalResponse> data =
                savingGoalService.getGoals(currentUser.getId(), familyId, keyword, status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mục tiêu tiết kiệm thành công", data));
    }

    @GetMapping("/{goalId}")
    public ResponseEntity<ApiResponse<SavingGoalResponse>> getGoal(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long goalId) {
        SavingGoalResponse data = savingGoalService.getGoal(currentUser.getId(), familyId, goalId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin mục tiêu tiết kiệm thành công", data));
    }

    @PutMapping("/{goalId}")
    public ResponseEntity<ApiResponse<SavingGoalResponse>> updateGoal(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long goalId,
            @Valid @RequestBody SavingGoalRequest request) {
        SavingGoalResponse data = savingGoalService.updateGoal(currentUser.getId(), familyId, goalId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật mục tiêu tiết kiệm thành công", data));
    }

    /** Chưa có đóng góp thì xóa hẳn, đã có thì chuyển sang đã hủy (giữ lịch sử). */
    @DeleteMapping("/{goalId}")
    public ResponseEntity<ApiResponse<Void>> deleteGoal(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long goalId) {
        savingGoalService.deleteGoal(currentUser.getId(), familyId, goalId);
        return ResponseEntity.ok(ApiResponse.success("Hủy mục tiêu tiết kiệm thành công"));
    }
}