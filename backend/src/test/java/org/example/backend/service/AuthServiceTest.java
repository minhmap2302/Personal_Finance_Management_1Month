package org.example.backend.service;

import org.example.backend.exception.ConflictException;
import org.example.backend.exception.UnauthorizedException;
import org.example.backend.model.dto.request.LoginRequest;
import org.example.backend.model.dto.request.RefreshTokenRequest;
import org.example.backend.model.dto.request.RegisterRequest;
import org.example.backend.model.dto.response.AuthResponse;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.InvalidatedToken;
import org.example.backend.model.entity.RefreshToken;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.InvalidatedTokenRepository;
import org.example.backend.repository.RefreshTokenRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.security.jwt.JwtService;
import org.example.backend.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private InvalidatedTokenRepository invalidatedTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("$2a$10$encodedPassword")
                .fullName("Test User")
                .role(SystemRole.USER)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Đăng ký thành công: mã hóa mật khẩu, gán role USER và lưu thông tin")
    void shouldRegisterUser_whenValidRequest() {
        RegisterRequest request = RegisterRequest.builder()
                .username("newuser")
                .email("new@example.com")
                .password("plainPassword123")
                .fullName("New User")
                .build();

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("plainPassword123")).thenReturn("encodedSecret");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(2L);
            return u;
        });

        UserResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("newuser", response.getUsername());
        assertEquals("new@example.com", response.getEmail());
        assertEquals(SystemRole.USER, response.getRole());
        assertTrue(response.isEnabled());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("encodedSecret", saved.getPassword());
        assertEquals(SystemRole.USER, saved.getRole());
    }

    @Test
    @DisplayName("Đăng ký thất bại khi username đã tồn tại (409 Conflict)")
    void shouldThrowConflict_whenUsernameExists() {
        RegisterRequest request = RegisterRequest.builder()
                .username("existinguser")
                .email("new@example.com")
                .password("password123")
                .build();

        when(userRepository.existsByUsername("existinguser")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("Tên đăng nhập"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đăng ký thất bại khi email đã tồn tại (409 Conflict)")
    void shouldThrowConflict_whenEmailExists() {
        RegisterRequest request = RegisterRequest.builder()
                .username("newuser")
                .email("existing@example.com")
                .password("password123")
                .build();

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("Email"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đăng nhập thành công: trả về access token và lưu bản băm refresh token")
    void shouldLoginSuccessfully_whenValidCredentials() {
        LoginRequest request = LoginRequest.builder()
                .username("testuser")
                .password("plainPassword")
                .build();

        when(userRepository.findByUsernameOrEmail("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("plainPassword", testUser.getPassword())).thenReturn(true);
        when(jwtService.generateToken(testUser)).thenReturn("mocked.access.token");
        when(jwtService.getJwtExpirationMs()).thenReturn(3600000L);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mocked.access.token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals("testuser", response.getUser().getUsername());

        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(tokenCaptor.capture());
        RefreshToken savedToken = tokenCaptor.getValue();
        assertEquals(testUser, savedToken.getUser());
        assertFalse(savedToken.isRevoked());
        // Đảm bảo không lưu raw token mà lưu bản băm SHA-256
        assertEquals(JwtService.hashToken(response.getRefreshToken()), savedToken.getToken());
    }

    @Test
    @DisplayName("Đăng nhập thất bại khi sai mật khẩu (401 BadCredentials)")
    void shouldThrowBadCredentials_whenPasswordIncorrect() {
        LoginRequest request = LoginRequest.builder()
                .username("testuser")
                .password("wrongPassword")
                .build();

        when(userRepository.findByUsernameOrEmail("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongPassword", testUser.getPassword())).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
        verify(jwtService, never()).generateToken(any());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đăng nhập thất bại khi tài khoản không tồn tại")
    void shouldThrowBadCredentials_whenUserNotFound() {
        LoginRequest request = LoginRequest.builder()
                .username("unknown")
                .password("password123")
                .build();

        when(userRepository.findByUsernameOrEmail("unknown")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }

    @Test
    @DisplayName("Đăng nhập thất bại khi tài khoản bị vô hiệu hóa / khóa")
    void shouldThrowDisabledException_whenAccountIsDisabled() {
        testUser.setEnabled(false);
        LoginRequest request = LoginRequest.builder()
                .username("testuser")
                .password("plainPassword")
                .build();

        when(userRepository.findByUsernameOrEmail("testuser")).thenReturn(Optional.of(testUser));

        assertThrows(DisabledException.class, () -> authService.login(request));
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    @DisplayName("Đăng xuất thành công: vô hiệu hóa access token và thu hồi refresh token")
    void shouldLogoutSuccessfully_andRevokeTokens() {
        String authHeader = "Bearer sample.access.token";
        String rawRefreshToken = "sample-refresh-token";
        String hashedToken = JwtService.hashToken(rawRefreshToken);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .id(1L)
                .user(testUser)
                .token(hashedToken)
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .revoked(false)
                .build();

        when(jwtService.extractJti("sample.access.token")).thenReturn("mock-jti");
        when(jwtService.extractExpirationInstant("sample.access.token")).thenReturn(Instant.now().plus(1, ChronoUnit.HOURS));
        when(invalidatedTokenRepository.existsById("mock-jti")).thenReturn(false);
        when(refreshTokenRepository.findByToken(hashedToken)).thenReturn(Optional.of(refreshTokenEntity));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        authService.logout(authHeader, rawRefreshToken, testUser);

        verify(invalidatedTokenRepository).save(any(InvalidatedToken.class));
        assertTrue(refreshTokenEntity.isRevoked());
        verify(refreshTokenRepository).save(refreshTokenEntity);
        verify(refreshTokenRepository).revokeAllByUser(testUser);
    }

    @Test
    @DisplayName("Làm mới token thành công: áp dụng rotation, thu hồi token cũ và sinh token mới")
    void shouldRefreshTokenSuccessfully_whenTokenIsValid() {
        String rawRefreshToken = "valid-raw-refresh-token";
        String hashedToken = JwtService.hashToken(rawRefreshToken);

        RefreshToken oldToken = RefreshToken.builder()
                .id(10L)
                .user(testUser)
                .token(hashedToken)
                .expiryDate(Instant.now().plus(5, ChronoUnit.DAYS))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByToken(hashedToken)).thenReturn(Optional.of(oldToken));
        when(jwtService.generateToken(testUser)).thenReturn("brand.new.access.token");
        when(jwtService.getJwtExpirationMs()).thenReturn(3600000L);

        RefreshTokenRequest request = new RefreshTokenRequest(rawRefreshToken);
        AuthResponse response = authService.refreshToken(request);

        assertNotNull(response);
        assertEquals("brand.new.access.token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertNotEquals(rawRefreshToken, response.getRefreshToken());

        // Token cũ phải chuyển thành revoked = true
        assertTrue(oldToken.isRevoked());
        // Lưu token mới
        verify(refreshTokenRepository, atLeast(2)).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Làm mới token thất bại khi không tìm thấy refresh token trong CSDL")
    void shouldThrowUnauthorized_whenRefreshTokenNotFound() {
        String rawRefreshToken = "non-existent-token";
        String hashedToken = JwtService.hashToken(rawRefreshToken);

        when(refreshTokenRepository.findByToken(hashedToken)).thenReturn(Optional.empty());

        RefreshTokenRequest request = new RefreshTokenRequest(rawRefreshToken);
        assertThrows(UnauthorizedException.class, () -> authService.refreshToken(request));
    }

    @Test
    @DisplayName("Phát hiện Token Reuse: nếu refresh token đã revoked gửi lên -> thu hồi toàn bộ session")
    void shouldThrowUnauthorized_andRevokeAllUserTokens_whenTokenReuseDetected() {
        String rawRefreshToken = "already-revoked-token";
        String hashedToken = JwtService.hashToken(rawRefreshToken);

        RefreshToken revokedToken = RefreshToken.builder()
                .id(10L)
                .user(testUser)
                .token(hashedToken)
                .expiryDate(Instant.now().plus(5, ChronoUnit.DAYS))
                .revoked(true) // Đã bị thu hồi trước đó
                .build();

        when(refreshTokenRepository.findByToken(hashedToken)).thenReturn(Optional.of(revokedToken));

        RefreshTokenRequest request = new RefreshTokenRequest(rawRefreshToken);
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> authService.refreshToken(request));
        assertTrue(ex.getMessage().contains("thu hồi"));

        // Xác nhận đã kích hoạt cơ chế thu hồi tất cả refresh token của user
        verify(refreshTokenRepository).revokeAllByUser(testUser);
    }

    @Test
    @DisplayName("Làm mới token thất bại khi refresh token đã hết hạn")
    void shouldThrowUnauthorized_whenRefreshTokenIsExpired() {
        String rawRefreshToken = "expired-token";
        String hashedToken = JwtService.hashToken(rawRefreshToken);

        RefreshToken expiredToken = RefreshToken.builder()
                .id(10L)
                .user(testUser)
                .token(hashedToken)
                .expiryDate(Instant.now().minus(1, ChronoUnit.DAYS)) // Đã hết hạn
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByToken(hashedToken)).thenReturn(Optional.of(expiredToken));

        RefreshTokenRequest request = new RefreshTokenRequest(rawRefreshToken);
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> authService.refreshToken(request));
        assertTrue(ex.getMessage().contains("hết hạn"));
        assertTrue(expiredToken.isRevoked());
        verify(refreshTokenRepository).save(expiredToken);
    }
}



