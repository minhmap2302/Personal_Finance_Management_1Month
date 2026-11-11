package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.SavingContributionRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.SavingContributionResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.SavingContributionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * API khoản đóng góp vào mục tiêu tiết kiệm.
 */
@RestController
@RequestMapping("/api/v1/families/{familyId}/saving-goals/{goalId}/contributions")
@RequiredArgsConstructor
public class SavingContributionController {

    private final SavingContributionService contributionService;

    @PostMapping
    public ResponseEntity<ApiResponse<SavingContributionResponse>> createContribution(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long goalId,
            @Valid @RequestBody SavingContributionRequest request) {
        SavingContributionResponse data =
                contributionService.createContribution(currentUser.getId(), familyId, goalId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đóng góp thành công", data));
    }

    /** Lịch sử đóng góp của mục tiêu, mới nhất trước. Sắp xếp được theo contributionDate, amount, createdAt, id. */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<SavingContributionResponse>>> getContributions(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long goalId,
            @PageableDefault(size = 20, sort = {"contributionDate", "id"}, direction = Sort.Direction.DESC)
            Pageable pageable) {
        Page<SavingContributionResponse> data =
                contributionService.getContributions(currentUser.getId(), familyId, goalId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử đóng góp thành công", data));
    }

    @PutMapping("/{contributionId}")
    public ResponseEntity<ApiResponse<SavingContributionResponse>> updateContribution(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long goalId,
            @PathVariable Long contributionId,
            @Valid @RequestBody SavingContributionRequest request) {
        SavingContributionResponse data = contributionService.updateContribution(
                currentUser.getId(), familyId, goalId, contributionId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật khoản đóng góp thành công", data));
    }

    @DeleteMapping("/{contributionId}")
    public ResponseEntity<ApiResponse<Void>> deleteContribution(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long goalId,
            @PathVariable Long contributionId) {
        contributionService.deleteContribution(currentUser.getId(), familyId, goalId, contributionId);
        return ResponseEntity.ok(ApiResponse.success("Xóa khoản đóng góp thành công"));
    }
}