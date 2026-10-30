package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import org.example.backend.service.AuthService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final long REFRESH_TOKEN_VALIDITY_DAYS = 7;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Tên đăng nhập '" + request.getUsername() + "' đã tồn tại");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email '" + request.getEmail() + "' đã được sử dụng");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(SystemRole.USER) // Luôn gán USER ở backend
                .enabled(true)
                .build();

        User savedUser = userRepository.save(user);
        return UserResponse.fromEntity(savedUser);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getLoginIdentifier();
        if (!StringUtils.hasText(identifier)) {
            throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
        }

        User user = userRepository.findByUsernameOrEmail(identifier)
                .orElseThrow(() -> new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        if (!user.isEnabled()) {
            throw new DisabledException("Tài khoản của bạn đã bị vô hiệu hóa hoặc bị khóa");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
        }

        String accessToken = jwtService.generateToken(user);
        String rawRefreshToken = generateSecureRefreshToken();
        String hashedRefreshToken = JwtService.hashToken(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(hashedRefreshToken)
                .expiryDate(Instant.now().plus(REFRESH_TOKEN_VALIDITY_DAYS, ChronoUnit.DAYS))
                .revoked(false)
                .build();

        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getJwtExpirationMs() / 1000)
                .user(UserResponse.fromEntity(user))
                .build();
    }

    @Override
    @Transactional
    public void logout(String authHeader) {
        logout(authHeader, null, null);
    }

    @Override
    @Transactional
    public void logout(String authHeader, String rawRefreshToken, User currentUser) {
        // 1. Thu hồi Access Token (lưu vào bảng invalidated_tokens)
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            try {
                String jti = jwtService.extractJti(token);
                Instant expiry = jwtService.extractExpirationInstant(token);

                String tokenId = (jti != null) ? jti : token;
                if (!invalidatedTokenRepository.existsById(tokenId)) {
                    InvalidatedToken invalidatedToken = InvalidatedToken.builder()
                            .id(tokenId)
                            .expiryTime(expiry)
                            .build();
                    invalidatedTokenRepository.save(invalidatedToken);
                }
            } catch (Exception e) {
                log.warn("Không thể lưu token bị thu hồi: {}", e.getMessage());
            }
        }

        // 2. Thu hồi Refresh Token nếu client gửi lên
        if (StringUtils.hasText(rawRefreshToken)) {
            String hashedToken = JwtService.hashToken(rawRefreshToken);
            refreshTokenRepository.findByToken(hashedToken).ifPresent(rt -> {
                rt.setRevoked(true);
                refreshTokenRepository.save(rt);
            });
        }

        // 3. Nếu có thông tin người dùng hiện tại, thu hồi các refresh token còn lại
        if (currentUser != null && currentUser.getId() != null) {
            userRepository.findById(currentUser.getId()).ifPresent(refreshTokenRepository::revokeAllByUser);
        }
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String rawToken = request.getRefreshToken();
        if (!StringUtils.hasText(rawToken)) {
            throw new UnauthorizedException("Refresh token không được để trống");
        }

        String hashedToken = JwtService.hashToken(rawToken);
        RefreshToken refreshToken = refreshTokenRepository.findByToken(hashedToken)
                .orElseThrow(() -> new UnauthorizedException("Refresh token không hợp lệ hoặc không tồn tại"));

        User user = refreshToken.getUser();

        // Kiểm tra Reuse Detection: nếu token đã revoked được gửi lại -> Thu hồi toàn bộ session của user!
        if (refreshToken.isRevoked()) {
            refreshTokenRepository.revokeAllByUser(user);
            log.warn("Cảnh báo an ninh: Phát hiện tái sử dụng Refresh Token đã bị thu hồi cho user ID: {}", user.getId());
            throw new UnauthorizedException("Refresh token đã bị thu hồi. Toàn bộ phiên đăng nhập đã bị hủy vì lý do an toàn");
        }

        // Kiểm tra hạn sử dụng
        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            throw new UnauthorizedException("Refresh token đã hết hạn. Vui lòng đăng nhập lại");
        }

        // Kiểm tra trạng thái tài khoản
        if (!user.isEnabled()) {
            refreshToken.setRevoked(true);
            refreshTokenRepository.save(refreshToken);
            throw new UnauthorizedException("Tài khoản người dùng đã bị vô hiệu hóa");
        }

        // Áp dụng Token Rotation: Thu hồi token hiện tại
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        // Cấp Access Token mới và Refresh Token mới
        String newAccessToken = jwtService.generateToken(user);
        String newRawRefreshToken = generateSecureRefreshToken();
        String newHashedToken = JwtService.hashToken(newRawRefreshToken);

        RefreshToken newRefreshToken = RefreshToken.builder()
                .user(user)
                .token(newHashedToken)
                .expiryDate(Instant.now().plus(REFRESH_TOKEN_VALIDITY_DAYS, ChronoUnit.DAYS))
                .revoked(false)
                .build();

        refreshTokenRepository.save(newRefreshToken);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getJwtExpirationMs() / 1000)
                .user(UserResponse.fromEntity(user))
                .build();
    }

    private String generateSecureRefreshToken() {
        return UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
    }
}

