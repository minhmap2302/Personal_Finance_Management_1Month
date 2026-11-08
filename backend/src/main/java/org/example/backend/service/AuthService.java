package org.example.backend.service;

import org.example.backend.model.dto.request.LoginRequest;
import org.example.backend.model.dto.request.RefreshTokenRequest;
import org.example.backend.model.dto.request.RegisterRequest;
import org.example.backend.model.dto.response.AuthResponse;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.User;

public interface AuthService {

    UserResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    void logout(String authHeader, String rawRefreshToken);

    AuthResponse refreshToken(RefreshTokenRequest request);
}

