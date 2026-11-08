package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ConflictException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.ChangePasswordRequest;
import org.example.backend.model.dto.request.UpdateProfileRequest;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.User;
import org.example.backend.repository.RefreshTokenRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentProfile(Long userId) {
        User user = getUserById(userId);
        return UserResponse.fromEntity(user);
    }

    @Override
    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = getUserById(userId);

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String newUsername = request.getUsername().trim();
            if (userRepository.existsByUsernameAndIdNot(newUsername, userId)) {
                throw new ConflictException("Tên đăng nhập '" + newUsername + "' đã được sử dụng bởi tài khoản khác");
            }
            user.setUsername(newUsername);
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();
            if (userRepository.existsByEmailAndIdNot(newEmail, userId)) {
                throw new ConflictException("Email '" + newEmail + "' đã được sử dụng bởi tài khoản khác");
            }
            user.setEmail(newEmail);
        }

        User updatedUser = userRepository.save(user);
        return UserResponse.fromEntity(updatedUser);
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = getUserById(userId);

        // 1. Kiểm tra mật khẩu hiện tại có chính xác không
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác");
        }

        // 2. Kiểm tra xác nhận mật khẩu mới có trùng khớp không
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Xác nhận mật khẩu mới không trùng khớp");
        }

        // 3. Kiểm tra mật khẩu mới không trùng mật khẩu hiện tại
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        // 4. Mã hóa mật khẩu mới và lưu
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // 5. Chính sách bảo mật: thu hồi tất cả refresh token của các phiên khác
        refreshTokenRepository.revokeAllByUser(user);
        log.info("Đã đổi mật khẩu thành công và thu hồi tất cả refresh token cho user ID: {}", userId);
    }

    private User getUserById(Long userId) {
        if (userId == null) {
            throw new BadRequestException("ID người dùng không hợp lệ");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
    }
}

