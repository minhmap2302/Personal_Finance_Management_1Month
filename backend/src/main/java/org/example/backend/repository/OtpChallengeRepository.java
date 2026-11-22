package org.example.backend.repository;

import org.example.backend.model.entity.OtpChallenge;
import org.example.backend.model.enums.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, Long> {
    Optional<OtpChallenge> findTopByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
            String email,
            OtpPurpose purpose
    );

    Optional<OtpChallenge> findByResetTokenHashAndPurposeAndConsumedAtIsNotNull(
            String resetTokenHash,
            OtpPurpose purpose
    );
}
