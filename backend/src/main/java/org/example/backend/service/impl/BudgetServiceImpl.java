package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ConflictException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.CreateSubBudgetRequest;
import org.example.backend.model.dto.request.CreateTotalBudgetRequest;
import org.example.backend.model.dto.request.UpdateSubBudgetRequest;
import org.example.backend.model.dto.request.UpdateTotalBudgetRequest;
import org.example.backend.model.dto.response.BudgetDetailResponse;
import org.example.backend.model.dto.response.BudgetSummaryResponse;
import org.example.backend.model.dto.response.SubBudgetResponse;
import org.example.backend.model.entity.Budget;
import org.example.backend.model.entity.Category;
import org.example.backend.model.entity.Family;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.enums.BudgetStatus;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.model.enums.SavingGoalStatus;
import org.example.backend.model.projection.CategorySpent;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.CategoryRepository;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.repository.FamilyRepository;
import org.example.backend.service.BudgetService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ ngân sách.
 * - Ngân sách tổng: category = null, parentBudget = null.
 * - Ngân sách con: thuộc một ngân sách tổng, theo một danh mục chi tiêu, dùng khoảng thời gian của ngân sách tổng.
 * Số liệu "đã dùng" luôn được tính từ giao dịch và khoản đóng góp, không lưu trong bảng.
 *
 * Các thao tác ghi chạy ở mức cô lập READ_COMMITTED và khóa dòng gia đình. Với REPEATABLE READ mặc định của MySQL,
 * các câu SELECT thường sau khi chờ khóa vẫn đọc theo ảnh chụp cũ nên có thể không thấy dữ liệu vừa được
 * yêu cầu khác commit, làm hỏng việc kiểm tra tổng và chồng lấn.
 */
@Service
@RequiredArgsConstructor
public class BudgetServiceImpl implements BudgetService {

    @Value("${app.timezone}")
    private String timezone;

    /** Độ dài tối đa của một ngân sách tổng (số ngày). */
    private static final int MAX_BUDGET_DAYS = 366;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    /** Từ ngưỡng này (phần trăm giới hạn đã dùng) ngân sách chuyển sang mức cảnh báo. */
    private static final BigDecimal WARNING_PERCENT = BigDecimal.valueOf(80);

    private final BudgetRepository budgetRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final CategoryRepository categoryRepository;

    // =====================================================================
    // Đọc dữ liệu (mọi thành viên của gia đình)
    // =====================================================================

    @Transactional(readOnly = true)
    @Override
    public Page<BudgetSummaryResponse> getBudgets(Long userId, Long familyId, Pageable pageable) {
        requireMember(userId, familyId);
        return budgetRepository.findByFamilyIdAndParentBudgetIsNull(familyId, pageable)
                .map(this::toSummary);
    }

    @Transactional(readOnly = true)
    @Override
    public BudgetDetailResponse getBudget(Long userId, Long familyId, Long budgetId) {
        requireMember(userId, familyId);
        return toDetail(findTotal(familyId, budgetId));
    }

    /** Ngân sách tổng bao phủ ngày được chọn, mặc định là hôm nay (giờ Việt Nam). */
    @Transactional(readOnly = true)
    @Override
    public BudgetDetailResponse getCurrentBudget(Long userId, Long familyId, LocalDate date) {
        requireMember(userId, familyId);
        LocalDate target = date != null ? date : LocalDate.now(ZoneId.of(timezone));
        Budget total = budgetRepository.findTotalCoveringDate(familyId, target)
                .orElseThrow(() -> new ResourceNotFoundException("Không có ngân sách tổng nào bao phủ ngày này"));
        return toDetail(total);
    }

    // =====================================================================
    // Ngân sách tổng (chủ gia đình và quản lý)
    // =====================================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public BudgetDetailResponse createTotalBudget(Long userId, Long familyId, CreateTotalBudgetRequest request) {
        requireManager(userId, familyId);
        Family family = lockFamily(familyId);

        validateDateRange(request.getStartDate(), request.getEndDate());
        checkNoOverlap(familyId, request.getStartDate(), request.getEndDate(), -1L);

        Budget total = Budget.builder()
                .family(family)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .amount(request.getAmount())
                .build();
        budgetRepository.save(total);

        return toDetail(total);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public BudgetDetailResponse updateTotalBudget(Long userId, Long familyId, Long budgetId,
                                                  UpdateTotalBudgetRequest request) {
        requireManager(userId, familyId);
        lockFamily(familyId);

        Budget total = findTotal(familyId, budgetId);
        validateDateRange(request.getStartDate(), request.getEndDate());
        checkNoOverlap(familyId, request.getStartDate(), request.getEndDate(), total.getId());

        List<Budget> subBudgets = budgetRepository.findByParentBudgetIdOrderByIdAsc(total.getId());
        BigDecimal allocated = sumAmounts(subBudgets);
        if (request.getAmount().compareTo(allocated) < 0) {
            throw new BadRequestException("Ngân sách tổng không được thấp hơn tổng các ngân sách con ("
                    + allocated.toPlainString() + "). Hãy giảm ngân sách con trước");
        }

        total.setStartDate(request.getStartDate());
        total.setEndDate(request.getEndDate());
        total.setAmount(request.getAmount());

        // Ngân sách con dùng khoảng thời gian của ngân sách tổng.
        for (Budget sub : subBudgets) {
            sub.setStartDate(request.getStartDate());
            sub.setEndDate(request.getEndDate());
        }

        return toDetail(total);
    }

    /** Xóa ngân sách tổng sẽ xóa luôn các ngân sách con. Giao diện nên yêu cầu xác nhận trước. */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public void deleteTotalBudget(Long userId, Long familyId, Long budgetId) {
        requireManager(userId, familyId);
        lockFamily(familyId);

        Budget total = findTotal(familyId, budgetId);
        List<Budget> subBudgets = budgetRepository.findByParentBudgetIdOrderByIdAsc(total.getId());
        budgetRepository.deleteAll(subBudgets);
        budgetRepository.delete(total);
    }

    // =====================================================================
    // Ngân sách con (chủ gia đình và quản lý)
    // =====================================================================

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public SubBudgetResponse createSubBudget(Long userId, Long familyId, Long totalBudgetId,
                                             CreateSubBudgetRequest request) {
        requireManager(userId, familyId);
        lockFamily(familyId);

        Budget total = findTotal(familyId, totalBudgetId);
        Category category = findUsableExpenseCategory(familyId, request.getCategoryId());

        if (budgetRepository.existsByParentBudgetIdAndCategoryId(total.getId(), category.getId())) {
            throw new ConflictException("Danh mục này đã có ngân sách con trong ngân sách tổng");
        }

        BigDecimal allocated = zeroIfNull(budgetRepository.sumSubBudgetAmounts(total.getId()));
        checkWithinTotal(total, allocated.add(request.getAmount()), allocated);

        Budget sub = Budget.builder()
                .family(total.getFamily())
                .category(category)
                .parentBudget(total)
                .startDate(total.getStartDate())
                .endDate(total.getEndDate())
                .amount(request.getAmount())
                .build();
        budgetRepository.save(sub);

        return toSubResponse(sub, spentForCategory(total, category.getId()));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public SubBudgetResponse updateSubBudget(Long userId, Long familyId, Long totalBudgetId, Long subBudgetId,
                                             UpdateSubBudgetRequest request) {
        requireManager(userId, familyId);
        lockFamily(familyId);

        Budget total = findTotal(familyId, totalBudgetId);
        Budget sub = findSub(total, subBudgetId);

        // Tổng các ngân sách con khác (không tính ngân sách đang sửa).
        BigDecimal allocatedWithoutThis = zeroIfNull(budgetRepository.sumSubBudgetAmounts(total.getId()))
                .subtract(sub.getAmount());
        checkWithinTotal(total, allocatedWithoutThis.add(request.getAmount()), allocatedWithoutThis);

        sub.setAmount(request.getAmount());

        return toSubResponse(sub, spentForCategory(total, sub.getCategory().getId()));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @Override
    public void deleteSubBudget(Long userId, Long familyId, Long totalBudgetId, Long subBudgetId) {
        requireManager(userId, familyId);
        lockFamily(familyId);

        Budget total = findTotal(familyId, totalBudgetId);
        Budget sub = findSub(total, subBudgetId);
        budgetRepository.delete(sub);
    }

    // =====================================================================
    // Quyền truy cập
    // =====================================================================

    /** Người dùng phải là thành viên của gia đình. Admin hệ thống không phải thành viên nên không xem được. */
    private FamilyMember requireMember(Long userId, Long familyId) {
        return familyMemberRepository.findByUserIdAndFamilyId(userId, familyId)
                .orElseThrow(() -> new ForbiddenException("Bạn không thuộc gia đình này"));
    }

    /** Chỉ chủ gia đình và quản lý được thay đổi ngân sách. */
    private FamilyMember requireManager(Long userId, Long familyId) {
        FamilyMember member = requireMember(userId, familyId);
        if (!member.getRole().isAtLeast(FamilyRole.MANAGER)) {
            throw new ForbiddenException("Bạn không có quyền quản lý ngân sách của gia đình này");
        }
        return member;
    }

    // =====================================================================
    // Kiểm tra nghiệp vụ
    // =====================================================================

    private Family lockFamily(Long familyId) {
        return familyRepository.findByIdForUpdate(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gia đình"));
    }

    private Budget findTotal(Long familyId, Long budgetId) {
        return budgetRepository.findByIdAndFamilyIdAndParentBudgetIsNull(budgetId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ngân sách tổng"));
    }

    private Budget findSub(Budget total, Long subBudgetId) {
        return budgetRepository.findByIdAndParentBudgetId(subBudgetId, total.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ngân sách con"));
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new BadRequestException("Ngày kết thúc không được trước ngày bắt đầu");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) + 1 > MAX_BUDGET_DAYS) {
            throw new BadRequestException("Ngân sách không được dài quá " + MAX_BUDGET_DAYS + " ngày");
        }
    }

    private void checkNoOverlap(Long familyId, LocalDate startDate, LocalDate endDate, Long excludeId) {
        if (budgetRepository.countOverlappingTotals(familyId, startDate, endDate, excludeId) > 0) {
            throw new ConflictException("Khoảng thời gian này trùng với một ngân sách tổng khác của gia đình");
        }
    }

    /** Tổng các ngân sách con (sau thay đổi) không được vượt ngân sách tổng. */
    private void checkWithinTotal(Budget total, BigDecimal newAllocated, BigDecimal currentAllocated) {
        if (newAllocated.compareTo(total.getAmount()) > 0) {
            BigDecimal available = total.getAmount().subtract(currentAllocated);
            throw new BadRequestException("Tổng ngân sách con vượt quá ngân sách tổng (còn có thể phân bổ: "
                    + available.toPlainString() + ")");
        }
    }

    /**
     * Danh mục dùng cho ngân sách con phải là danh mục chi tiêu, còn hoạt động,
     * và là danh mục hệ thống hoặc của cùng gia đình.
     */
    private Category findUsableExpenseCategory(Long familyId, Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục không tồn tại"));

        // Danh mục của gia đình khác được coi như không tồn tại để không lộ thông tin.
        if (category.getFamily() != null && !category.getFamily().getId().equals(familyId)) {
            throw new ResourceNotFoundException("Danh mục không tồn tại");
        }
        if (category.getType() != CategoryType.EXPENSE) {
            throw new BadRequestException("Chỉ có thể đặt ngân sách cho danh mục chi tiêu");
        }
        if (!Boolean.TRUE.equals(category.getActive())) {
            throw new BadRequestException("Danh mục đã được lưu trữ, không thể tạo ngân sách mới");
        }
        return category;
    }

    // =====================================================================
    // Tính số liệu và chuyển đổi sang DTO
    // =====================================================================

    private BudgetSummaryResponse toSummary(Budget total) {
        BigDecimal used = spentOf(total).add(savedOf(total));
        return BudgetSummaryResponse.builder()
                .id(total.getId())
                .startDate(total.getStartDate())
                .endDate(total.getEndDate())
                .amount(total.getAmount())
                .used(used)
                .usedPercent(percent(used, total.getAmount()))
                .overBudget(used.compareTo(total.getAmount()) > 0)
                .status(statusOf(used, total.getAmount()))
                .build();
    }

    private BudgetDetailResponse toDetail(Budget total) {
        Long familyId = total.getFamily().getId();
        LocalDate start = total.getStartDate();
        LocalDate end = total.getEndDate();

        BigDecimal spent = spentOf(total);
        BigDecimal saved = savedOf(total);
        BigDecimal used = spent.add(saved);

        List<Budget> subBudgets = budgetRepository.findByParentBudgetIdOrderByIdAsc(total.getId());
        Map<Long, BigDecimal> spentByCategory = budgetRepository
                .sumExpensesByCategory(familyId, CategoryType.EXPENSE, start, end)
                .stream()
                .collect(Collectors.toMap(
                        CategorySpent::getCategoryId,
                        CategorySpent::getTotalAmount));

        List<SubBudgetResponse> subResponses = subBudgets.stream()
                .map(sub -> toSubResponse(sub,
                        spentByCategory.getOrDefault(sub.getCategory().getId(), BigDecimal.ZERO)))
                .toList();

        BigDecimal allocated = sumAmounts(subBudgets);

        return BudgetDetailResponse.builder()
                .id(total.getId())
                .startDate(start)
                .endDate(end)
                .amount(total.getAmount())
                .spent(spent)
                .saved(saved)
                .used(used)
                .remaining(total.getAmount().subtract(used))
                .usedPercent(percent(used, total.getAmount()))
                .overBudget(used.compareTo(total.getAmount()) > 0)
                .status(statusOf(used, total.getAmount()))
                .allocated(allocated)
                .unallocated(total.getAmount().subtract(allocated))
                .subBudgets(subResponses)
                .build();
    }

    private SubBudgetResponse toSubResponse(Budget sub, BigDecimal spent) {
        return SubBudgetResponse.builder()
                .id(sub.getId())
                .categoryId(sub.getCategory().getId())
                .categoryName(sub.getCategory().getName())
                .amount(sub.getAmount())
                .spent(spent)
                .remaining(sub.getAmount().subtract(spent))
                .usedPercent(percent(spent, sub.getAmount()))
                .overBudget(spent.compareTo(sub.getAmount()) > 0)
                .status(statusOf(spent, sub.getAmount()))
                .build();
    }

    /** Tổng chi tiêu của gia đình trong khoảng thời gian của ngân sách. */
    private BigDecimal spentOf(Budget total) {
        return zeroIfNull(budgetRepository.sumExpenses(
                total.getFamily().getId(), CategoryType.EXPENSE, total.getStartDate(), total.getEndDate()));
    }

    /**
     * Tổng tiền đóng góp vào mục tiêu tiết kiệm: tính vào ngân sách tổng như một khoản đã dùng.
     * Mục tiêu đã hủy không được tính.
     */
    private BigDecimal savedOf(Budget total) {
        return zeroIfNull(budgetRepository.sumContributions(
                total.getFamily().getId(), SavingGoalStatus.CANCELLED, total.getStartDate(), total.getEndDate()));
    }

    private BigDecimal spentForCategory(Budget total, Long categoryId) {
        return zeroIfNull(budgetRepository.sumExpensesForCategory(
                total.getFamily().getId(), categoryId, total.getStartDate(), total.getEndDate()));
    }

    private BigDecimal sumAmounts(List<Budget> budgets) {
        return budgets.stream().map(Budget::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** used * 100 / amount, làm tròn 2 chữ số. amount luôn lớn hơn 0 (có CHECK ở database). */
    private BigDecimal percent(BigDecimal used, BigDecimal amount) {
        return used.multiply(HUNDRED).divide(amount, 2, RoundingMode.HALF_UP);
    }

    /**
     * Mức cảnh báo theo số tiền đã dùng so với giới hạn của chính ngân sách đó:
     * ngân sách tổng dùng (chi tiêu + đóng góp tiết kiệm), ngân sách con chỉ dùng chi tiêu của danh mục.
     * So sánh used * 100 với amount * 80 để không phụ thuộc vào việc làm tròn phần trăm.
     */
    private BudgetStatus statusOf(BigDecimal used, BigDecimal amount) {
        if (used.compareTo(amount) > 0) {
            return BudgetStatus.EXCEEDED;
        }
        if (used.multiply(HUNDRED).compareTo(amount.multiply(WARNING_PERCENT)) >= 0) {
            return BudgetStatus.WARNING;
        }
        return BudgetStatus.NORMAL;
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}