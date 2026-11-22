package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.LoginRequest;
import org.example.backend.model.dto.request.LogoutRequest;
import org.example.backend.model.dto.request.RefreshTokenRequest;
import org.example.backend.model.dto.request.RegisterRequest;
import org.example.backend.model.dto.request.VerifyOtpRequest;
import org.example.backend.model.dto.request.ForgotPasswordRequest;
import org.example.backend.model.dto.request.ResendOtpRequest;
import org.example.backend.model.dto.request.ResetPasswordRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.AuthResponse;
import org.example.backend.model.dto.response.ResetTokenResponse;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.service.AuthService;
import org.example.backend.service.OtpService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest request) {
        otpService.requestRegistration(request);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi OTP xác minh đăng ký"));
    }

    @PostMapping("/register/verify")
    public ResponseEntity<ApiResponse<UserResponse>> verifyRegistration(
            @Valid @RequestBody VerifyOtpRequest request) {
        UserResponse response = otpService.verifyRegistration(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Xác minh đăng ký thành công", response));
    }

    @PostMapping("/register/resend")
    public ResponseEntity<ApiResponse<Void>> resendRegistration(
            @Valid @RequestBody ResendOtpRequest request) {
        otpService.resendRegistration(request);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi lại OTP"));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        otpService.requestPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success("Nếu email tồn tại, mã OTP đã được gửi"));
    }

    @PostMapping("/password/verify")
    public ResponseEntity<ApiResponse<ResetTokenResponse>> verifyPasswordOtp(
            @Valid @RequestBody VerifyOtpRequest request) {
        ResetTokenResponse response = otpService.verifyPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success("Xác minh OTP thành công", response));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        otpService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) LogoutRequest request) {

        authService.logout(authHeader, request != null ? request.getRefreshToken() : null);

        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Làm mới phiên đăng nhập thành công", response));
    }
}
