package org.example.backend.security.jwt;

import org.example.backend.model.entity.User;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.InvalidatedTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    @Mock
    private InvalidatedTokenRepository invalidatedTokenRepository;

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(invalidatedTokenRepository);
        String base64Secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        ReflectionTestUtils.setField(jwtService, "secretKey", base64Secret);
        ReflectionTestUtils.setField(jwtService, "jwtExpirationMs", 3600000L); // 1 hour

        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .username("testuser")
                .role(SystemRole.USER)
                .password("$2a$10$encoded")
                .enabled(true)
                .build();
    }

    @Test
    @DisplayName("Tạo JWT token và trích xuất username chính xác")
    void shouldGenerateAndExtractUsername() {
        String token = jwtService.generateToken(testUser);

        assertNotNull(token);
        assertFalse(token.isBlank());

        String username = jwtService.extractUsername(token);
        assertEquals("testuser", username);
    }

    @Test
    @DisplayName("Trích xuất các claims: userId, role, jti chính xác")
    void shouldExtractClaimsCorrectly() {
        String token = jwtService.generateToken(testUser);

        Long userId = jwtService.extractUserId(token);
        String role = jwtService.extractRole(token);
        String jti = jwtService.extractJti(token);

        assertEquals(1L, userId);
        assertEquals("USER", role);
        assertNotNull(jti);
        assertFalse(jti.isBlank());
    }

    @Test
    @DisplayName("Kiểm tra tính hợp lệ của token với UserDetails")
    void shouldValidateTokenCorrectly() {
        String token = jwtService.generateToken(testUser);

        boolean isValid = jwtService.isTokenValid(token, testUser);
        assertTrue(isValid);
        assertTrue(jwtService.validateToken(token));
    }

    @Test
    @DisplayName("Token không hợp lệ khi kiểm tra với User khác")
    void shouldBeInvalid_whenCheckedWithDifferentUser() {
        String token = jwtService.generateToken(testUser);

        User anotherUser = User.builder()
                .id(2L)
                .username("anotheruser")
                .email("another@example.com")
                .build();

        boolean isValid = jwtService.isTokenValid(token, anotherUser);
        assertFalse(isValid);
    }

    @Test
    @DisplayName("Từ chối token nếu jti đã bị vô hiệu hóa (Blacklisted trong InvalidatedToken)")
    void shouldRejectToken_whenBlacklisted() {
        String token = jwtService.generateToken(testUser);
        String jti = jwtService.extractJti(token);

        when(invalidatedTokenRepository.existsById(jti)).thenReturn(true);

        boolean isValid = jwtService.validateToken(token);
        assertFalse(isValid);
    }

    @Test
    @DisplayName("Từ chối token khi đã hết hạn")
    void shouldRejectExpiredToken() {
        // Thiết lập expiration âm để giả lập token đã hết hạn
        ReflectionTestUtils.setField(jwtService, "jwtExpirationMs", -1000L);
        String expiredToken = jwtService.generateToken(testUser);

        boolean isValid = jwtService.validateToken(expiredToken);
        assertFalse(isValid);
    }
}

