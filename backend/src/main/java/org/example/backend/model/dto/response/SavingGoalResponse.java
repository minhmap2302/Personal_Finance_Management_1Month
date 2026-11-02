package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.model.enums.SavingGoalStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Thông tin một mục tiêu tiết kiệm. Số đã tiết kiệm và tiến độ được tính từ các khoản đóng góp, không lưu sẵn.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavingGoalResponse {

    private Long id;
    private String name;
    private BigDecimal targetAmount;
    private LocalDate targetDate;
    private SavingGoalStatus status;

    /** Tổng các khoản đóng góp. */
    private BigDecimal savedAmount;

    /** Còn thiếu bao nhiêu, bằng 0 khi đã đạt hoặc vượt mục tiêu. */
    private BigDecimal remainingAmount;

    /** Phần trăm đã đạt (savedAmount / targetAmount), có thể lớn hơn 100. */
    private BigDecimal progressPercent;

    /** Người tạo mục tiêu. */
    private Long createdById;
    private String createdByUsername;
    private String createdByFullName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}