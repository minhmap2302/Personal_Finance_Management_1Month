package org.example.backend.service;

import org.example.backend.model.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminUserService {
    Page<UserResponse> searchUsers(String keyword, Pageable pageable);

    UserResponse getUserDetail(Long userId);

    UserResponse lockUser(Long userId);

    UserResponse unlockUser(Long userId);
}
