package org.example.backend.controller;

import org.example.backend.exception.ConflictException;
import org.example.backend.exception.GlobalExceptionHandler;
import org.example.backend.exception.UnauthorizedException;
import org.example.backend.model.dto.request.LoginRequest;
import org.example.backend.model.dto.request.RefreshTokenRequest;
import org.example.backend.model.dto.request.RegisterRequest;
import org.example.backend.model.dto.response.AuthResponse;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/auth/register - Đăng ký thành công trả về 201 Created")
    void register_success() throws Exception {
        UserResponse mockResponse = UserResponse.builder()
                .id(1L)
                .email("test@example.com")
                .username("testuser")
                .createdAt(LocalDateTime.now())
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(mockResponse);

        String json = """
                {
                    "email": "test@example.com",
                    "username": "testuser",
                    "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("test@example.com"))
                .andExpect(jsonPath("$.data.username").value("testuser"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register - Dữ liệu không hợp lệ trả về 400 Bad Request")
    void register_validationError() throws Exception {
        String invalidJson = """
                {
                    "email": "invalid-email",
                    "username": "a",
                    "password": ""
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors").exists());
    }

    @Test
    @DisplayName("POST /api/v1/auth/register - Trùng email trả về 409 Conflict")
    void register_conflict() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new ConflictException("Email 'test@example.com' đã được sử dụng"));

        String json = """
                {
                    "email": "test@example.com",
                    "username": "testuser",
                    "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Email 'test@example.com' đã được sử dụng"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login - Đăng nhập thành công trả về 200 OK và JWT")
    void login_success() throws Exception {
        UserResponse user = UserResponse.builder()
                .id(1L)
                .email("test@example.com")
                .username("testuser")
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock.jwt.token")
                .refreshToken("mock.refresh.token")
                .tokenType("Bearer")
                .user(user)
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        String json = """
                {
                    "usernameOrEmail": "test@example.com",
                    "password": "password123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock.jwt.token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login - Sai mật khẩu trả về 401 Unauthorized")
    void login_badCredentials() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        String json = """
                {
                    "usernameOrEmail": "test@example.com",
                    "password": "wrongpassword"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Tên đăng nhập hoặc mật khẩu không chính xác"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/logout - Đăng xuất thành công trả về 200 OK")
    void logout_success() throws Exception {
        // Standalone MockMvc không resolve @AuthenticationPrincipal → Spring MVC tạo User rỗng
        // → controller gọi overload 3 tham số
        doNothing().when(authService).logout(any(), any(), any());

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer sample.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng xuất thành công"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh - Làm mới token thành công")
    void refresh_success() throws Exception {
        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("new.access.token")
                .refreshToken("new.refresh.token")
                .tokenType("Bearer")
                .build();

        when(authService.refreshToken(any(RefreshTokenRequest.class))).thenReturn(authResponse);

        String json = """
                {
                    "refreshToken": "valid-refresh-token"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new.access.token"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh - Token hết hạn hoặc không hợp lệ trả về 401 Unauthorized")
    void refresh_unauthorized() throws Exception {
        when(authService.refreshToken(any(RefreshTokenRequest.class)))
                .thenThrow(new UnauthorizedException("Refresh token đã hết hạn. Vui lòng đăng nhập lại"));

        String json = """
                {
                    "refreshToken": "expired-refresh-token"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Refresh token đã hết hạn. Vui lòng đăng nhập lại"));
    }
}
