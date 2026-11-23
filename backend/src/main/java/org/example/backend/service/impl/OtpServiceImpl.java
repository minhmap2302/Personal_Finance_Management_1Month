package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.mail.OtpMailChannel;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ConflictException;
import org.example.backend.model.dto.request.*;
import org.example.backend.model.dto.response.ResetTokenResponse;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.OtpChallenge;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.OtpPurpose;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.OtpChallengeRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.OtpService;
import org.example.backend.service.SessionTerminationService;
import org.example.backend.util.DeletedUserNaming;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OtpServiceImpl implements OtpService {

    private static final int OTP_TTL_SECONDS = 600;
    private static final int RESEND_SECONDS = 60;
    private static final int RESET_TOKEN_TTL_SECONDS = 900;
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_SENDS = 5;

    private final OtpChallengeRepository otpChallengeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpMailChannel otpChannel;
    private final SessionTerminationService sessionTerminationService;

    @Override
    @Transactional
    public void requestRegistration(RegisterRequest request) {
        validateRegistrationRequest(request);
        createChallenge(
                request.getEmail(),
                OtpPurpose.REGISTER,
                request.getUsername(),
                passwordEncoder.encode(request.getPassword()),
                request.getFullName()
        );
    }

    @Override
    @Transactional
    public UserResponse verifyRegistration(VerifyOtpRequest request) {
        OtpChallenge challenge = requireActiveChallenge(request.getEmail(), OtpPurpose.REGISTER);
        validateOtp(challenge, request.getOtp());

        validateRegistrationChallenge(challenge);

        User user = User.builder()
                .username(challenge.getRegistrationUsername())
                .email(challenge.getEmail())
                .password(challenge.getRegistrationPassword())
                .fullName(challenge.getRegistrationFullName())
                .role(SystemRole.USER)
                .enabled(true)
                .build();

        User saved = userRepository.save(user);
        challenge.setConsumedAt(Instant.now());
        otpChallengeRepository.save(challenge);
        return UserResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void resendRegistration(ResendOtpRequest request) {
        OtpChallenge challenge = requireActiveChallenge(request.getEmail(), OtpPurpose.REGISTER);
        resendChallenge(challenge);

        String otp = generateOtp();
        challenge.setOtpHash(hash(otp));
        challenge.setExpiresAt(Instant.now().plusSeconds(OTP_TTL_SECONDS));
        otpChallengeRepository.save(challenge);
        sendOtp(challenge.getEmail(), otp, OtpPurpose.REGISTER);
    }

    @Override
    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            otpChallengeRepository.findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
                            request.getEmail(), OtpPurpose.FORGOT_PASSWORD)
                    .ifPresent(challenge -> invalidateChallenge(challenge));
            createChallenge(request.getEmail(), OtpPurpose.FORGOT_PASSWORD, null, null, null);
        }
    }

    @Override
    @Transactional
    public ResetTokenResponse verifyPasswordReset(VerifyOtpRequest request) {
        OtpChallenge challenge = requireActiveChallenge(request.getEmail(), OtpPurpose.FORGOT_PASSWORD);
        validateOtp(challenge, request.getOtp());

        String resetToken = UUID.randomUUID() + "-" + UUID.randomUUID();
        Instant now = Instant.now();
        challenge.setResetTokenHash(hash(resetToken));
        challenge.setConsumedAt(now);
        challenge.setExpiresAt(now.plusSeconds(RESET_TOKEN_TTL_SECONDS));
        otpChallengeRepository.save(challenge);
        return new ResetTokenResponse(resetToken, RESET_TOKEN_TTL_SECONDS);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenHash = hash(request.getResetToken());
        OtpChallenge challenge = otpChallengeRepository
                .findByResetTokenHashAndPurposeAndConsumedAtIsNotNull(tokenHash, OtpPurpose.FORGOT_PASSWORD)
                .orElseThrow(() -> new BadRequestException("Reset token không hợp lệ"));

        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Reset token đã hết hạn");
        }

        User user = userRepository.findByEmail(challenge.getEmail())
                .orElseThrow(() -> new BadRequestException("Tài khoản không tồn tại"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setTokensValidFrom(Instant.now());
        userRepository.save(user);
        sessionTerminationService.revokeRefreshTokens(user);

        challenge.setResetTokenHash(null);
        otpChallengeRepository.save(challenge);
    }

    private void validateRegistrationRequest(RegisterRequest request) {
        if (DeletedUserNaming.isReservedUsername(request.getUsername())
                || DeletedUserNaming.isReservedEmail(request.getEmail())) {
            throw new BadRequestException("Thông tin đăng ký không được phép sử dụng");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Tên đăng nhập đã tồn tại");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email đã được sử dụng");
        }
    }

    private void validateRegistrationChallenge(OtpChallenge challenge) {
        if (DeletedUserNaming.isReservedUsername(challenge.getRegistrationUsername())
                || DeletedUserNaming.isReservedEmail(challenge.getEmail())) {
            throw new BadRequestException("Thông tin đăng ký không được phép sử dụng");
        }
        if (userRepository.existsByUsername(challenge.getRegistrationUsername())) {
            throw new ConflictException("Tên đăng nhập đã tồn tại");
        }
        if (userRepository.existsByEmail(challenge.getEmail())) {
            throw new ConflictException("Email đã được sử dụng");
        }
    }

    private void createChallenge(
            String email,
            OtpPurpose purpose,
            String username,
            String encodedPassword,
            String fullName
    ) {
        otpChallengeRepository.findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(email, purpose)
                .ifPresent(this::invalidateChallenge);

        String otp = generateOtp();
        OtpChallenge challenge = OtpChallenge.builder()
                .email(email)
                .purpose(purpose)
                .otpHash(hash(otp))
                .expiresAt(Instant.now().plusSeconds(OTP_TTL_SECONDS))
                .resendAt(Instant.now().plusSeconds(RESEND_SECONDS))
                .sendCount(1)
                .registrationUsername(username)
                .registrationPassword(encodedPassword)
                .registrationFullName(fullName)
                .build();

        otpChallengeRepository.save(challenge);
        sendOtp(email, otp, purpose);
    }

    private void resendChallenge(OtpChallenge challenge) {
        if (challenge.getResendAt().isAfter(Instant.now())) {
            throw new BadRequestException("Vui lòng chờ trước khi gửi lại OTP");
        }
        if (challenge.getSendCount() >= MAX_SENDS) {
            throw new BadRequestException("Đã vượt quá số lần gửi OTP");
        }
        challenge.setSendCount(challenge.getSendCount() + 1);
        challenge.setAttemptCount(0);
        challenge.setResendAt(Instant.now().plusSeconds(RESEND_SECONDS));
    }

    private OtpChallenge requireActiveChallenge(String email, OtpPurpose purpose) {
        OtpChallenge challenge = otpChallengeRepository
                .findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> new BadRequestException("OTP không tồn tại hoặc đã được sử dụng"));

        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("OTP đã hết hạn");
        }
        return challenge;
    }

    private void validateOtp(OtpChallenge challenge, String otp) {
        if (challenge.getAttemptCount() >= MAX_ATTEMPTS) {
            throw new BadRequestException("Bạn đã nhập sai OTP quá nhiều lần");
        }
        if (!MessageDigest.isEqual(hash(otp).getBytes(StandardCharsets.UTF_8),
                challenge.getOtpHash().getBytes(StandardCharsets.UTF_8))) {
            challenge.setAttemptCount(challenge.getAttemptCount() + 1);
            otpChallengeRepository.save(challenge);
            throw new BadRequestException("OTP không chính xác");
        }
    }

    private void invalidateChallenge(OtpChallenge challenge) {
        challenge.setConsumedAt(Instant.now());
        otpChallengeRepository.save(challenge);
    }

    private void sendOtp(String email, String otp, OtpPurpose purpose) {
        String subject = purpose == OtpPurpose.REGISTER
                ? "Mã OTP xác minh đăng ký"
                : "Mã OTP đặt lại mật khẩu";
        String html = "<p>Mã OTP của bạn là: <b>" + otp + "</b></p>"
                + "<p>Mã hết hạn sau 10 phút. Không chia sẻ mã này.</p>";
        otpChannel.sendHtml(email, subject, html);
    }

    private String generateOtp() {
        int otp = new SecureRandom().nextInt(1_000_000);
        return String.format("%06d", otp);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Không thể mã hóa dữ liệu OTP", e);
        }
    }
}
