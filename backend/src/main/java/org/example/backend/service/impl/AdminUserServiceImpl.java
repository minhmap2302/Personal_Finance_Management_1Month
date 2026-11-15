package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.User;
import org.example.backend.repository.RefreshTokenRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.AdminUserService;
import org.example.backend.service.FamilyMemberService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final FamilyMemberService familyMemberService;

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(String keyword, Pageable pageable) {
        return userRepository.searchUsers(keyword == null ? "" : keyword.trim(), pageable)
                .map(UserResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserDetail(Long userId) {
        User user = getUserById(userId);
        return UserResponse.fromEntity(user);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public UserResponse lockUser(Long userId) {
        User user = getUserById(userId);
        if (!user.isEnabled()) {
            return UserResponse.fromEntity(user);
        }

        // Bàn giao quyền chủ gia đình trước. Khóa gia đình giữ đến hết giao dịch, nên các thao tác khác
        // (ví dụ chuyển quyền cho chính người này) chỉ chạy sau khi enabled = false đã commit và sẽ bị từ chối.
        familyMemberService.handOverOwnedFamilies(userId);

        user.setEnabled(false);
        refreshTokenRepository.revokeAllByUser(user);
        return UserResponse.fromEntity(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse unlockUser(Long userId) {
        User user = getUserById(userId);
        if (user.isEnabled()) {
            return UserResponse.fromEntity(user);
        }

        user.setEnabled(true);
        return UserResponse.fromEntity(userRepository.save(user));
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
    }
}