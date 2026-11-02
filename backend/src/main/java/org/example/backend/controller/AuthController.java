package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.LoginRequest;
import org.example.backend.model.dto.request.RefreshTokenRequest;
import org.example.backend.model.dto.request.RegisterRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.AuthResponse;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.RefreshToken;
import org.example.backend.model.entity.User;
import org.example.backend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng ký tài khoản thành công", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @AuthenticationPrincipal User currentUser,
            @RequestBody(required = false) RefreshTokenRequest request) {

        String rawRefreshToken = request != null ? request.getRefreshToken() : null;
        authService.logout(authHeader, rawRefreshToken, currentUser);

        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Làm mới phiên đăng nhập thành công", response));
    }
}
