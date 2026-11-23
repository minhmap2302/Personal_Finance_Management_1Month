package org.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.model.enums.OtpPurpose;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "otp_challenges")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OtpPurpose purpose;

    @Column(name = "otp_hash", nullable = false, length = 64)
    private String otpHash;

    @Column(name = "reset_token_hash", length = 64)
    private String resetTokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "resend_at", nullable = false)
    private Instant resendAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "send_count", nullable = false)
    @Builder.Default
    private int sendCount = 1;

    @Column(name = "registration_username", length = 50)
    private String registrationUsername;

    @Column(name = "registration_password", length = 255)
    private String registrationPassword;

    @Column(name = "registration_full_name", length = 100)
    private String registrationFullName;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
