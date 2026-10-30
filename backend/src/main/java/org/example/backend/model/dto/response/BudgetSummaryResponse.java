package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Thông tin tóm tắt của một ngân sách tổng, dùng cho danh sách.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetSummaryResponse {

    private Long id;
    private LocalDate startDate;
    private LocalDate endDate;

    /** Giới hạn của ngân sách tổng. */
    private BigDecimal amount;

    /** Đã dùng = chi tiêu + tiền đã đóng góp vào các mục tiêu tiết kiệm. */
    private BigDecimal used;

    /** Phần trăm đã dùng, có thể lớn hơn 100. */
    private BigDecimal usedPercent;

    /** true khi đã dùng vượt giới hạn (giao diện hiển thị màu đỏ). */
    private boolean overBudget;
}