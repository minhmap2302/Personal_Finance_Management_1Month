package org.example.backend.service;

import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ConflictException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.ChangePasswordRequest;
import org.example.backend.model.dto.request.UpdateProfileRequest;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.RefreshTokenRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("$2a$10$oldEncodedPassword")
                .fullName("Nguyễn Văn A")
                .role(SystemRole.USER)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Lấy hồ sơ cá nhân thành công: thông tin chính xác, không chứa dữ liệu nhạy cảm")
    void shouldReturnUserProfile_whenUserExists() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        UserResponse response = userService.getCurrentProfile(1L);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("testuser", response.getUsername());
        assertEquals("test@example.com", response.getEmail());
        assertEquals("Nguyễn Văn A", response.getFullName());
        assertEquals(SystemRole.USER, response.getRole());
    }

    @Test
    @DisplayName("Lấy hồ sơ cá nhân thất bại khi ID không tồn tại (404 Not Found)")
    void shouldThrowResourceNotFound_whenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getCurrentProfile(99L));
    }

    @Test
    @DisplayName("Cập nhật hồ sơ thành công: chỉ cập nhật các trường được gửi, giữ nguyên những trường còn lại")
    void shouldUpdateProfileSuccessfully_whenValidPartialData() {
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .username("newuser")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.existsByUsernameAndIdNot("newuser", 1L)).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        UserResponse response = userService.updateProfile(1L, request);

        assertNotNull(response);
        assertEquals("newuser", testUser.getUsername());
        assertEquals("Nguyễn Văn A", testUser.getFullName());
        assertEquals("test@example.com", testUser.getEmail());
        verify(userRepository).save(testUser);
    }

    @Test
    @DisplayName("Cập nhật hồ sơ thất bại khi username bị trùng với người dùng khác (409 Conflict)")
    void shouldThrowConflict_whenUsernameAlreadyUsedByAnotherUser() {
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .username("existinguser")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.existsByUsernameAndIdNot("existinguser", 1L)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> userService.updateProfile(1L, request));
        assertTrue(ex.getMessage().contains("Tên đăng nhập"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cập nhật hồ sơ thất bại khi email bị trùng với người dùng khác (409 Conflict)")
    void shouldThrowConflict_whenEmailAlreadyUsedByAnotherUser() {
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .email("existing@example.com")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.existsByEmailAndIdNot("existing@example.com", 1L)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> userService.updateProfile(1L, request));
        assertTrue(ex.getMessage().contains("Email"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đổi mật khẩu thành công: mật khẩu mới được mã hóa, thu hồi toàn bộ refresh token")
    void shouldChangePasswordSuccessfully_whenValidRequest() {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("oldPlainPassword")
                .newPassword("newPlainPassword123")
                .confirmPassword("newPlainPassword123")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("oldPlainPassword", testUser.getPassword())).thenReturn(true);
        when(passwordEncoder.matches("newPlainPassword123", testUser.getPassword())).thenReturn(false);
        when(passwordEncoder.encode("newPlainPassword123")).thenReturn("$2a$10$newEncodedPassword");

        userService.changePassword(1L, request);

        assertEquals("$2a$10$newEncodedPassword", testUser.getPassword());
        verify(userRepository).save(testUser);
        // Thu hồi toàn bộ refresh token
        verify(refreshTokenRepository).revokeAllByUser(testUser);
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi mật khẩu hiện tại không chính xác (400 Bad Request)")
    void shouldThrowBadRequest_whenCurrentPasswordIncorrect() {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("wrongOldPassword")
                .newPassword("newPlainPassword123")
                .confirmPassword("newPlainPassword123")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongOldPassword", testUser.getPassword())).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> userService.changePassword(1L, request));
        assertEquals("Mật khẩu hiện tại không chính xác", ex.getMessage());
        verify(userRepository, never()).save(any());
        verify(refreshTokenRepository, never()).revokeAllByUser(any());
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi xác nhận mật khẩu mới không khớp (400 Bad Request)")
    void shouldThrowBadRequest_whenConfirmPasswordMismatch() {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("oldPlainPassword")
                .newPassword("newPlainPassword123")
                .confirmPassword("mismatchedPassword")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("oldPlainPassword", testUser.getPassword())).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> userService.changePassword(1L, request));
        assertEquals("Xác nhận mật khẩu mới không trùng khớp", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi mật khẩu mới trùng mật khẩu cũ")
    void shouldThrowBadRequest_whenNewPasswordSameAsOld() {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("oldPlainPassword")
                .newPassword("oldPlainPassword")
                .confirmPassword("oldPlainPassword")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("oldPlainPassword", testUser.getPassword())).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> userService.changePassword(1L, request));
        assertEquals("Mật khẩu mới không được trùng với mật khẩu hiện tại", ex.getMessage());
        verify(userRepository, never()).save(any());
    }
}

