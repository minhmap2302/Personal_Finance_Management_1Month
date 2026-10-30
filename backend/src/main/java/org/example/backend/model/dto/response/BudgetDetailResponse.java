package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Chi tiết ngân sách tổng cùng các ngân sách con và số liệu đã dùng.
 * Mọi số liệu "đã dùng" đều được tính từ giao dịch và khoản đóng góp, không lưu trong bảng budgets.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetDetailResponse {

    private Long id;
    private LocalDate startDate;
    private LocalDate endDate;

    /** Giới hạn của ngân sách tổng. */
    private BigDecimal amount;

    /** Tổng chi tiêu (mọi danh mục chi tiêu, kể cả danh mục chưa có ngân sách con). */
    private BigDecimal spent;

    /** Tổng tiền đã đóng góp vào các mục tiêu tiết kiệm trong khoảng thời gian này. */
    private BigDecimal saved;

    /** Đã dùng = spent + saved. */
    private BigDecimal used;

    /** Còn lại, âm nếu đã vượt giới hạn. */
    private BigDecimal remaining;

    private BigDecimal usedPercent;

    private boolean overBudget;

    /** Tổng số tiền đã phân bổ cho các ngân sách con. */
    private BigDecimal allocated;

    /** Phần chưa phân bổ = amount - allocated. */
    private BigDecimal unallocated;

    private List<SubBudgetResponse> subBudgets;
}