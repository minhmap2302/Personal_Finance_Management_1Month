package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.model.dto.response.DashboardResponse;
import org.example.backend.model.entity.Budget;
import org.example.backend.model.entity.Category;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.Transaction;
import org.example.backend.model.entity.SavingGoal;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.projection.CategorySpent;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.CategoryRepository;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.repository.SavingGoalRepository;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.service.DashboardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Triển khai dashboard cho người dùng.
 * Lấy dữ liệu từ các repository khác nhau và gộp lại thành một object duy nhất dễ dùng cho frontend.
 * Công thức quan trọng:
 * - Thu chi không bao gồm khoản đóng góp tiết kiệm.
 * - Khoản đóng góp tiết kiệm chỉ được cộng vào phần ngân sách đã dùng, không được tính vào thu chi.
 */
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    /** Múi giờ Việt Nam để lấy dữ liệu theo thời gian người dùng đang nhìn. */
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final FamilyMemberRepository familyMemberRepository;
    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final SavingGoalRepository savingGoalRepository;
    private final CategoryRepository categoryRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(Long userId, Long familyId, LocalDate startDate, LocalDate endDate) {
        // Người dùng phải thuộc gia đình mới được xem dashboard của gia đình đó.
        FamilyMember member = familyMemberRepository.findByUserIdAndFamilyId(userId, familyId)
                .orElseThrow(() -> new ForbiddenException("Bạn không thuộc gia đình này"));

        // Nếu client không gửi khoảng thời gian, mặc định lấy từ đầu tháng đến ngày hiện tại.
        LocalDate effectiveStart = (startDate != null) ? startDate : LocalDate.now(ZONE).withDayOfMonth(1);
        LocalDate effectiveEnd = (endDate != null) ? endDate : LocalDate.now(ZONE);

        if (effectiveStart.isAfter(effectiveEnd)) {
            throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc");
        }

        // Thu chi chỉ tính từ các giao dịch thực tế, không bao gồm khoản đóng góp tiết kiệm.
        BigDecimal totalIncome = zeroIfNull(transactionRepository.sumByType(familyId, CategoryType.INCOME, effectiveStart, effectiveEnd));
        BigDecimal totalExpense = zeroIfNull(transactionRepository.sumByType(familyId, CategoryType.EXPENSE, effectiveStart, effectiveEnd));

        // Khoản đóng góp tiết kiệm được tách riêng vì không phải thu chi, chỉ tính vào phần ngân sách / tiết kiệm.
        BigDecimal totalSavedInPeriod = zeroIfNull(savingGoalRepository.sumSavedAmountByFamilyAndDateRange(familyId, effectiveStart, effectiveEnd));

        DashboardResponse.Summary summary = DashboardResponse.Summary.builder()
                .familyId(familyId)
                .startDate(effectiveStart)
                .endDate(effectiveEnd)
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netBalance(totalIncome.subtract(totalExpense))
                .totalSavedInPeriod(totalSavedInPeriod)
                .build();

        List<DashboardResponse.CategoryBreakdown> expenseByCategory = buildExpenseBreakdown(familyId, effectiveStart, effectiveEnd, totalExpense);
        List<DashboardResponse.TrendPoint> trend = buildTrend(familyId, effectiveStart, effectiveEnd);
        // Tình hình ngân sách hiện tại lấy theo ngày hiện tại theo múi giờ Việt Nam.
        DashboardResponse.BudgetStatus budget = buildBudgetStatus(familyId, LocalDate.now(ZONE));
        List<DashboardResponse.SavingGoalProgress> savingGoals = buildSavingGoals(familyId);
        List<DashboardResponse.RecentTransaction> recentTransactions = buildRecentTransactions(familyId);

        return DashboardResponse.builder()
                .overview(DashboardResponse.Overview.builder()
                        .summary(summary)
                        .expenseByCategory(expenseByCategory)
                        .trend(trend)
                        .build())
                .budgetAndSavings(DashboardResponse.BudgetAndSavings.builder()
                        .budget(budget)
                        .savingGoals(savingGoals)
                        .recentTransactions(recentTransactions)
                        .build())
                .build();
    }

    /**
     * Gom chi tiêu theo danh mục để phục vụ biểu đồ cơ cấu chi tiêu.
     * Tỷ lệ phần trăm tính theo tổng chi tiêu của kỳ.
     */
    private List<DashboardResponse.CategoryBreakdown> buildExpenseBreakdown(Long familyId, LocalDate startDate, LocalDate endDate, BigDecimal totalExpense) {
        List<CategorySpent> entries = budgetRepository.sumExpensesByCategory(familyId, CategoryType.EXPENSE, startDate, endDate);
        if (entries.isEmpty()) {
            return List.of();
        }

        List<Long> categoryIds = entries.stream().map(CategorySpent::getCategoryId).toList();
        Map<Long, String> categoryNameById = categoryRepository.findAllById(categoryIds).stream()
                .collect(java.util.stream.Collectors.toMap(Category::getId, Category::getName));

        return entries.stream()
                .map(entry -> {
                    BigDecimal amount = zeroIfNull(entry.getTotalAmount());
                    BigDecimal percent = totalExpense.compareTo(ZERO) > 0
                            ? amount.multiply(HUNDRED).divide(totalExpense, 2, RoundingMode.HALF_UP)
                            : ZERO;
                    return DashboardResponse.CategoryBreakdown.builder()
                            .categoryId(entry.getCategoryId())
                            .categoryName(categoryNameById.getOrDefault(entry.getCategoryId(), "Khác"))
                            .amount(amount)
                            .percent(percent)
                            .build();
                })
                .toList();
    }

    /**
     * Tạo chuỗi dữ liệu theo từng ngày trong khoảng thời gian được chọn.
     * Mỗi điểm dữ liệu bao gồm thu, chi và chênh lệch net theo ngày.
     */
    private List<DashboardResponse.TrendPoint> buildTrend(Long familyId, LocalDate startDate, LocalDate endDate) {
        Map<LocalDate, DashboardResponse.TrendPoint> map = new LinkedHashMap<>();
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            map.put(cursor, DashboardResponse.TrendPoint.builder()
                    .date(cursor)
                    .income(ZERO)
                    .expense(ZERO)
                    .net(ZERO)
                    .build());
            cursor = cursor.plusDays(1);
        }

        List<Transaction> transactions = transactionRepository.findAllByFamilyIdAndDateBetween(familyId, startDate, endDate);
        for (Transaction transaction : transactions) {
            DashboardResponse.TrendPoint point = map.computeIfAbsent(transaction.getTransactionDate(), date -> DashboardResponse.TrendPoint.builder()
                    .date(date)
                    .income(ZERO)
                    .expense(ZERO)
                    .net(ZERO)
                    .build());

            if (transaction.getCategory().getType() == CategoryType.INCOME) {
                point.setIncome(point.getIncome().add(transaction.getAmount()));
            } else if (transaction.getCategory().getType() == CategoryType.EXPENSE) {
                point.setExpense(point.getExpense().add(transaction.getAmount()));
            }
            point.setNet(point.getIncome().subtract(point.getExpense()));
        }

        return new ArrayList<>(map.values());
    }

    /**
     * Lấy ngân sách hiện tại (ngân sách tổng đang áp dụng cho ngày hiện tại).
     * Tính cả số chi tiêu thực tế và số tiết kiệm đã dùng trong kỳ ngân sách.
     */
    private DashboardResponse.BudgetStatus buildBudgetStatus(Long familyId, LocalDate targetDate) {
        Optional<Budget> current = budgetRepository.findTotalCoveringDate(familyId, targetDate);
        if (current.isEmpty()) {
            return null;
        }

        Budget total = current.get();
        BigDecimal spent = zeroIfNull(budgetRepository.sumExpenses(familyId, CategoryType.EXPENSE, total.getStartDate(), total.getEndDate()));
        BigDecimal saved = zeroIfNull(savingGoalRepository.sumSavedAmountByFamilyAndDateRange(familyId, total.getStartDate(), total.getEndDate()));
        BigDecimal used = spent.add(saved);
        BigDecimal remaining = total.getAmount().subtract(used);
        BigDecimal usedPercent = percent(used, total.getAmount());

        List<Budget> subBudgets = budgetRepository.findByParentBudgetIdOrderByIdAsc(total.getId());
        List<DashboardResponse.BudgetItem> subBudgetItems = subBudgets.stream()
                .map(sub -> {
                    BigDecimal subSpent = zeroIfNull(budgetRepository.sumExpensesForCategory(
                            familyId,
                            sub.getCategory().getId(),
                            total.getStartDate(),
                            total.getEndDate()));
                    BigDecimal subRemaining = sub.getAmount().subtract(subSpent);
                    BigDecimal subUsedPercent = percent(subSpent, sub.getAmount());
                    return DashboardResponse.BudgetItem.builder()
                            .categoryId(sub.getCategory().getId())
                            .categoryName(sub.getCategory().getName())
                            .amount(sub.getAmount())
                            .spent(subSpent)
                            .remaining(subRemaining)
                            .usedPercent(subUsedPercent)
                            .alertLevel(alertLevel(subUsedPercent))
                            .build();
                })
                .toList();

        return DashboardResponse.BudgetStatus.builder()
                .budgetId(total.getId())
                .startDate(total.getStartDate())
                .endDate(total.getEndDate())
                .totalAmount(total.getAmount())
                .spent(spent)
                .saved(saved)
                .used(used)
                .remaining(remaining)
                .usedPercent(usedPercent)
                .alertLevel(alertLevel(usedPercent))
                .subBudgets(subBudgetItems)
                .build();
    }

    /**
     * Tạo tiến độ từng mục tiêu tiết kiệm trong gia đình.
     * Dữ liệu này phục vụ vòng tròn hoặc thanh tiến độ trên màn hình dashboard.
     */
    private List<DashboardResponse.SavingGoalProgress> buildSavingGoals(Long familyId) {
        return savingGoalRepository.findByFamilyIdOrderByCreatedAtDesc(familyId).stream()
                .map(goal -> {
                    BigDecimal savedAmount = zeroIfNull(savingGoalRepository.sumSavedAmountByGoalId(goal.getId()));
                    BigDecimal remainingAmount = goal.getTargetAmount().subtract(savedAmount);
                    BigDecimal progressPercent = percent(savedAmount, goal.getTargetAmount());
                    return DashboardResponse.SavingGoalProgress.builder()
                            .id(goal.getId())
                            .name(goal.getName())
                            .targetAmount(goal.getTargetAmount())
                            .savedAmount(savedAmount)
                            .remainingAmount(remainingAmount)
                            .progressPercent(progressPercent)
                            .status(goal.getStatus().name())
                            .targetDate(goal.getTargetDate())
                            .build();
                })
                .toList();
    }

    /**
     * Trả về 10 giao dịch gần nhất để hiển thị trên dashboard.
     * Đặc biệt hữu ích cho phần "Giao dịch gần đây".
     */
    private List<DashboardResponse.RecentTransaction> buildRecentTransactions(Long familyId) {
        return transactionRepository.findTop10ByFamilyIdOrderByTransactionDateDescIdDesc(familyId).stream()
                .map(transaction -> DashboardResponse.RecentTransaction.builder()
                        .id(transaction.getId())
                        .categoryId(transaction.getCategory().getId())
                        .categoryName(transaction.getCategory().getName())
                        .categoryType(transaction.getCategory().getType())
                        .description(transaction.getDescription())
                        .amount(transaction.getAmount())
                        .transactionDate(transaction.getTransactionDate())
                        .userName(displayName(transaction.getUser()))
                        .build())
                .toList();
    }

    /**
     * Cấp cảnh báo ngân sách theo ngưỡng:
     * - 80% trở lên: cảnh báo vàng
     * - 100% trở lên: cảnh báo đỏ
     * - dưới 80%: bình thường
     */
    private String alertLevel(BigDecimal usedPercent) {
        if (usedPercent.compareTo(BigDecimal.valueOf(100)) >= 0) {
            return "RED";
        }
        if (usedPercent.compareTo(BigDecimal.valueOf(80)) >= 0) {
            return "YELLOW";
        }
        return "GREEN";
    }

    /**
     * Tính phần trăm, làm tròn 2 chữ số thập phân để hiển thị UI ổn định.
     */
    private BigDecimal percent(BigDecimal used, BigDecimal totalAmount) {
        if (totalAmount == null || totalAmount.compareTo(ZERO) <= 0) {
            return ZERO;
        }
        return used.multiply(HUNDRED).divide(totalAmount, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : ZERO;
    }

    private String displayName(org.example.backend.model.entity.User user) {
        if (user == null) {
            return "Unknown";
        }
        return user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName()
                : user.getUsername();
    }
}
