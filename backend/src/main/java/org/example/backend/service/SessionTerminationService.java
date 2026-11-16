package org.example.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.model.entity.InvalidatedToken;
import org.example.backend.model.entity.User;
import org.example.backend.repository.InvalidatedTokenRepository;
import org.example.backend.repository.RefreshTokenRepository;
import org.example.backend.security.jwt.JwtService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionTerminationService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final JwtService jwtService;

    public void revokeRefreshTokens(User user) {
        if (user == null || user.getId() == null) {
            return;
        }
        refreshTokenRepository.revokeAllByUser(user);
        log.info("Đã thu hồi toàn bộ refresh token cho userId={}", user.getId());
    }

    public void invalidateAccessToken(String authHeader) {
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            return;
        }

        String token = authHeader.substring(7).trim();
        if (!StringUtils.hasText(token)) {
            return;
        }

        try {
            String jti = jwtService.extractJti(token);
            Instant expiry = jwtService.extractExpirationInstant(token);
            if (!StringUtils.hasText(jti)) {
                return;
            }

            if (!invalidatedTokenRepository.existsById(jti)) {
                invalidatedTokenRepository.save(InvalidatedToken.builder()
                        .id(jti)
                        .expiryTime(expiry)
                        .build());
            }
        } catch (Exception e) {
            log.warn("Không thể lưu access token bị thu hồi vào blacklist: {}", e.getMessage());
        }
    }
}
