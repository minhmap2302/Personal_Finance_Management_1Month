package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.SavingContributionRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.SavingContributionResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.SavingContributionService;
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
}