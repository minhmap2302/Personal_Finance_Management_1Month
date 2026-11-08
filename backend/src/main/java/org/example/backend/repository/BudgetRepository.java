package org.example.backend.repository;

import org.example.backend.model.entity.Budget;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.enums.SavingGoalStatus;
import org.example.backend.model.projection.CategorySpent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    // ------------------------- Truy vấn ngân sách -------------------------

    Page<Budget> findByFamilyIdAndParentBudgetIsNull(Long familyId, Pageable pageable);

    Optional<Budget> findByIdAndFamilyIdAndParentBudgetIsNull(Long id, Long familyId);

    /** Ngân sách tổng bao phủ một ngày. Các ngân sách tổng không chồng lấn nên tối đa một kết quả. */
    @Query("select b from Budget b "
            + "where b.family.id = :familyId and b.parentBudget is null "
            + "and b.startDate <= :date and b.endDate >= :date")
    Optional<Budget> findTotalCoveringDate(@Param("familyId") Long familyId,
                                           @Param("date") LocalDate date);

    @EntityGraph(attributePaths = "category")
    List<Budget> findByParentBudgetIdOrderByIdAsc(Long parentBudgetId);

    Optional<Budget> findByIdAndParentBudgetId(Long id, Long parentBudgetId);

    boolean existsByParentBudgetIdAndCategoryId(Long parentBudgetId, Long categoryId);

    boolean existsByCategoryId(Long categoryId);

    /**
     * Đếm các ngân sách tổng của gia đình có khoảng thời gian chồng lấn với [startDate, endDate].
     * Truyền excludeId (hoặc -1 khi tạo mới) để bỏ qua chính ngân sách đang sửa.
     */
    @Query("select count(b) from Budget b "
            + "where b.family.id = :familyId and b.parentBudget is null "
            + "and b.startDate <= :endDate and b.endDate >= :startDate "
            + "and b.id <> :excludeId")
    long countOverlappingTotals(@Param("familyId") Long familyId,
                                @Param("startDate") LocalDate startDate,
                                @Param("endDate") LocalDate endDate,
                                @Param("excludeId") Long excludeId);

    /** Tổng số tiền các ngân sách con của một ngân sách tổng. Trả về null nếu chưa có ngân sách con. */
    @Query("select sum(b.amount) from Budget b where b.parentBudget.id = :parentId")
    BigDecimal sumSubBudgetAmounts(@Param("parentId") Long parentId);

    // ------------------- Số liệu đã dùng (tính từ dữ liệu gốc) -------------------
    // Các hàm sum trả về null khi không có dòng nào, service sẽ đổi thành 0.

    /** Tổng chi tiêu của gia đình trong khoảng thời gian. */
    @Query("select sum(t.amount) from Transaction t "
            + "where t.family.id = :familyId and t.category.type = :type "
            + "and t.transactionDate between :startDate and :endDate")
    BigDecimal sumExpenses(@Param("familyId") Long familyId,
                           @Param("type") CategoryType type,
                           @Param("startDate") LocalDate startDate,
                           @Param("endDate") LocalDate endDate);

    /** Tổng chi tiêu của gia đình theo từng danh mục trong khoảng thời gian. */
    @Query("select t.category.id as categoryId, sum(t.amount) as totalAmount from Transaction t "
            + "where t.family.id = :familyId and t.category.type = :type "
            + "and t.transactionDate between :startDate and :endDate "
            + "group by t.category.id")
    List<CategorySpent> sumExpensesByCategory(@Param("familyId") Long familyId,
                                              @Param("type") CategoryType type,
                                              @Param("startDate") LocalDate startDate,
                                              @Param("endDate") LocalDate endDate);

    /** Tổng chi tiêu của một danh mục trong khoảng thời gian. */
    @Query("select sum(t.amount) from Transaction t "
            + "where t.family.id = :familyId and t.category.id = :categoryId "
            + "and t.transactionDate between :startDate and :endDate")
    BigDecimal sumExpensesForCategory(@Param("familyId") Long familyId,
                                      @Param("categoryId") Long categoryId,
                                      @Param("startDate") LocalDate startDate,
                                      @Param("endDate") LocalDate endDate);

    /**
     * Tổng tiền đóng góp vào các mục tiêu tiết kiệm của gia đình trong khoảng thời gian,
     * bỏ qua các mục tiêu có trạng thái excludedStatus (truyền CANCELLED để không tính mục tiêu đã hủy).
     */
    @Query("select sum(c.amount) from SavingContribution c "
            + "where c.savingGoal.family.id = :familyId "
            + "and c.savingGoal.status <> :excludedStatus "
            + "and c.contributionDate between :startDate and :endDate")
    BigDecimal sumContributions(@Param("familyId") Long familyId,
                                @Param("excludedStatus") SavingGoalStatus excludedStatus,
                                @Param("startDate") LocalDate startDate,
                                @Param("endDate") LocalDate endDate);

    // ------------------------- Xóa hàng loạt khi xóa gia đình -------------------------

    /** Xóa các ngân sách con của gia đình (phải xóa trước ngân sách tổng). */
    @Modifying(flushAutomatically = true)
    @Query("delete from Budget b where b.family.id = :familyId and b.parentBudget is not null")
    int deleteSubBudgetsOfFamily(@Param("familyId") Long familyId);

    /** Xóa mọi ngân sách của gia đình. Gọi sau deleteSubBudgetsOfFamily. */
    @Modifying(flushAutomatically = true)
    @Query("delete from Budget b where b.family.id = :familyId")
    int deleteAllBudgetsOfFamily(@Param("familyId") Long familyId);
}