package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Thông tin một khoản đóng góp vào mục tiêu tiết kiệm.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavingContributionResponse {

    private Long id;
    private Long goalId;

    /** Người đóng góp. */
    private Long userId;
    private String username;
    private String userFullName;

    private BigDecimal amount;
    private LocalDate contributionDate;
    private String note;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}