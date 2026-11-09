package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.exception.UnauthorizedException;
import org.example.backend.model.dto.request.ChangePasswordRequest;
import org.example.backend.model.dto.request.DeleteAccountRequest;
import org.example.backend.model.dto.request.UpdateProfileRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@AuthenticationPrincipal User currentUser) {
        UserResponse response = userService.getCurrentProfile(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin người dùng thành công", response));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse response = userService.updateProfile(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin hồ sơ thành công", response));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công"));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody DeleteAccountRequest request) {
        userService.deleteAccount(currentUser.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa tài khoản"));
    }
}

