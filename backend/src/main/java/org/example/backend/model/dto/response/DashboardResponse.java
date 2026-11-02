package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.backend.model.enums.CategoryType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO dashboard được chia thành 2 nhóm chính theo yêu cầu nghiệp vụ:
 * 1. overview: thu chi, chi tiêu theo danh mục, xu hướng theo thời gian.
 * 2. budgetAndSavings: ngân sách hiện tại, tiết kiệm, giao dịch gần đây.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    /** Nhóm 1: Thu chi + danh mục + xu hướng thời gian. */
    private Overview overview;

    /** Nhóm 2: Ngân sách + tiết kiệm + giao dịch gần đây. */
    private BudgetAndSavings budgetAndSavings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Overview {
        private Summary summary;
        private List<CategoryBreakdown> expenseByCategory;
        private List<TrendPoint> trend;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BudgetAndSavings {
        private BudgetStatus budget;
        private List<SavingGoalProgress> savingGoals;
        private List<RecentTransaction> recentTransactions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Long familyId;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal totalIncome;
        private BigDecimal totalExpense;
        private BigDecimal netBalance;
        private BigDecimal totalSavedInPeriod;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryBreakdown {
        private Long categoryId;
        private String categoryName;
        private BigDecimal amount;
        private BigDecimal percent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private LocalDate date;
        private BigDecimal income;
        private BigDecimal expense;
        private BigDecimal net;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BudgetStatus {
        private Long budgetId;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal totalAmount;
        private BigDecimal spent;
        private BigDecimal saved;
        private BigDecimal used;
        private BigDecimal remaining;
        private BigDecimal usedPercent;
        private String alertLevel;
        private List<BudgetItem> subBudgets;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BudgetItem {
        private Long categoryId;
        private String categoryName;
        private BigDecimal amount;
        private BigDecimal spent;
        private BigDecimal remaining;
        private BigDecimal usedPercent;
        private String alertLevel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SavingGoalProgress {
        private Long id;
        private String name;
        private BigDecimal targetAmount;
        private BigDecimal savedAmount;
        private BigDecimal remainingAmount;
        private BigDecimal progressPercent;
        private String status;
        private LocalDate targetDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentTransaction {
        private Long id;
        private Long categoryId;
        private String categoryName;
        private CategoryType categoryType;
        private String description;
        private BigDecimal amount;
        private LocalDate transactionDate;
        private String userName;
    }
}
