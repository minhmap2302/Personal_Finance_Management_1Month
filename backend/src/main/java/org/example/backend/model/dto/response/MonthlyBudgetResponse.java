package org.example.backend.model.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.model.enums.BudgetStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Builder
public class MonthlyBudgetResponse {
    private Long id;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal amount;
    /** Chi tiêu trong khoảng thời gian của ngân sách. */
    private BigDecimal spent;
    /** Tiền đóng góp vào mục tiêu tiết kiệm trong khoảng thời gian của ngân sách. */
    private BigDecimal saved;
    /** spent + saved. */
    private BigDecimal used;
    private BigDecimal remaining;
    private BigDecimal usedPercent;
    private boolean overBudget;
    private BudgetStatus status;
}