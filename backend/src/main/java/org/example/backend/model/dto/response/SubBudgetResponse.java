package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.model.enums.BudgetStatus;

import java.math.BigDecimal;

/**
 * Thông tin một ngân sách con (theo danh mục) kèm số đã chi.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubBudgetResponse {

    private Long id;
    private Long categoryId;
    private String categoryName;

    /** Giới hạn của ngân sách con. */
    private BigDecimal amount;

    /** Tổng chi tiêu của danh mục trong khoảng thời gian của ngân sách. */
    private BigDecimal spent;

    /** Còn lại, âm nếu đã vượt giới hạn. */
    private BigDecimal remaining;

    private BigDecimal usedPercent;

    private boolean overBudget;

    /** Mức cảnh báo theo số tiền đã dùng: NORMAL, WARNING (từ 80%), EXCEEDED (vượt 100%). */
    private BudgetStatus status;
}