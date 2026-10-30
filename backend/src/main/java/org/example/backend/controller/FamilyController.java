package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.CreateFamilyRequest;
import org.example.backend.model.dto.request.UpdateFamilyRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.FamilyResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.FamilyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API gia đình: tạo, xem, đổi tên, xóa.
 */
@RestController
@RequestMapping("/api/v1/families")
@RequiredArgsConstructor
public class FamilyController {

    private final FamilyService familyService;

    @PostMapping
    public ResponseEntity<ApiResponse<FamilyResponse>> createFamily(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateFamilyRequest request) {
        FamilyResponse data = familyService.createFamily(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo gia đình thành công", data));
    }

    /** Các gia đình của tôi, kèm vai trò. Ứng dụng dùng danh sách này để chọn gia đình đang làm việc. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<FamilyResponse>>> getMyFamilies(
            @AuthenticationPrincipal User currentUser) {
        List<FamilyResponse> data = familyService.getMyFamilies(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách gia đình thành công", data));
    }

    @GetMapping("/{familyId}")
    public ResponseEntity<ApiResponse<FamilyResponse>> getFamily(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId) {
        FamilyResponse data = familyService.getFamily(currentUser.getId(), familyId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin gia đình thành công", data));
    }

    @PutMapping("/{familyId}")
    public ResponseEntity<ApiResponse<FamilyResponse>> updateFamilyName(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody UpdateFamilyRequest request) {
        FamilyResponse data = familyService.updateFamilyName(currentUser.getId(), familyId, request);
        return ResponseEntity.ok(ApiResponse.success("Đổi tên gia đình thành công", data));
    }

    @DeleteMapping("/{familyId}")
    public ResponseEntity<ApiResponse<Void>> deleteFamily(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId) {
        familyService.deleteFamily(currentUser.getId(), familyId);
        return ResponseEntity.ok(ApiResponse.success("Xóa gia đình thành công"));
    }
}