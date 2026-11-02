package org.example.backend.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.AdminUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService adminUserService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> dashboard(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(ApiResponse.success("Xin chào Admin", "Bạn đang truy cập khu vực quản trị. User: " + currentUser.getUsername()));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<UserResponse> users = adminUserService.searchUsers(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success("Danh sách người dùng", users));
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserDetail(@PathVariable Long userId) {
        UserResponse response = adminUserService.getUserDetail(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", response));
    }

    @PatchMapping("/users/{userId}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> lockUser(@PathVariable Long userId) {
        UserResponse response = adminUserService.lockUser(userId);
        return ResponseEntity.ok(ApiResponse.success("Khóa tài khoản thành công", response));
    }

    @PatchMapping("/users/{userId}/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> unlockUser(@PathVariable Long userId) {
        UserResponse response = adminUserService.unlockUser(userId);
        return ResponseEntity.ok(ApiResponse.success("Mở khóa tài khoản thành công", response));
    }
}
