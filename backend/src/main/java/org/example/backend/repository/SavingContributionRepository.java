package org.example.backend.repository;

import org.example.backend.model.entity.SavingContribution;
import org.example.backend.model.projection.GoalSavedAmount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SavingContributionRepository extends JpaRepository<SavingContribution, Long> {

    /** Lịch sử đóng góp của một mục tiêu, kèm người đóng góp. */
    @EntityGraph(attributePaths = "user")
    Page<SavingContribution> findBySavingGoalId(Long savingGoalId, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Optional<SavingContribution> findByIdAndSavingGoalId(Long id, Long savingGoalId);

    /** Mục tiêu đã có khoản đóng góp nào chưa (quyết định xóa cứng hay chuyển sang đã hủy). */
    boolean existsBySavingGoalId(Long savingGoalId);

    /** Tổng đóng góp của một mục tiêu. Trả về null nếu chưa có khoản nào. */
    @Query("select sum(c.amount) from SavingContribution c where c.savingGoal.id = :goalId")
    BigDecimal sumAmountBySavingGoalId(@Param("goalId") Long goalId);

    /** Tổng đóng góp của nhiều mục tiêu trong một lần truy vấn (mục tiêu chưa có đóng góp sẽ không có dòng). */
    @Query("select c.savingGoal.id as goalId, sum(c.amount) as totalAmount from SavingContribution c "
            + "where c.savingGoal.id in :goalIds group by c.savingGoal.id")
    List<GoalSavedAmount> sumAmountsBySavingGoalIds(@Param("goalIds") Collection<Long> goalIds);
}