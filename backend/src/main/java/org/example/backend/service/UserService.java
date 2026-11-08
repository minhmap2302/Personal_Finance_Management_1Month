package org.example.backend.service;

import org.example.backend.model.dto.request.ChangePasswordRequest;
import org.example.backend.model.dto.request.UpdateProfileRequest;
import org.example.backend.model.dto.response.UserResponse;

public interface UserService {

    UserResponse getCurrentProfile(Long userId);

    UserResponse updateProfile(Long userId, UpdateProfileRequest request);

    void changePassword(Long userId, ChangePasswordRequest request);
}

