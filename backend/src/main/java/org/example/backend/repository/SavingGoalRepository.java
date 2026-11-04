package org.example.backend.repository;

import jakarta.persistence.LockModeType;
import org.example.backend.model.entity.SavingGoal;
import org.example.backend.model.enums.SavingGoalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SavingGoalRepository extends JpaRepository<SavingGoal, Long> {

    List<SavingGoal> findByFamilyIdOrderByCreatedAtDesc(Long familyId);

    @Query("select coalesce(sum(c.amount), 0) from SavingContribution c where c.savingGoal.id = :goalId")
    BigDecimal sumSavedAmountByGoalId(@Param("goalId") Long goalId);

    @Query("select coalesce(sum(c.amount), 0) from SavingContribution c where c.savingGoal.family.id = :familyId and c.contributionDate between :startDate and :endDate")
    BigDecimal sumSavedAmountByFamilyAndDateRange(@Param("familyId") Long familyId,
                                                 @Param("startDate") LocalDate startDate,
                                                 @Param("endDate") LocalDate endDate);
    /** Mục tiêu của gia đình, kèm người tạo. */
    @EntityGraph(attributePaths = "createdBy")
    Optional<SavingGoal> findByIdAndFamilyId(Long id, Long familyId);

    boolean existsByIdAndFamilyId(Long id, Long familyId);

    /**
     * Lấy mục tiêu của gia đình và khóa dòng, để các thay đổi đồng thời trên cùng một mục tiêu
     * (đóng góp, sửa, hủy) chạy lần lượt và trạng thái luôn khớp với tổng đóng góp.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from SavingGoal g where g.id = :id and g.family.id = :familyId")
    Optional<SavingGoal> findByIdAndFamilyIdForUpdate(@Param("id") Long id, @Param("familyId") Long familyId);

    /**
     * Danh sách mục tiêu của gia đình, lọc theo trạng thái (null thì bỏ qua) và tìm theo tên.
     * keyword đã được chuyển về chữ thường và escape ký tự đặc biệt của LIKE bằng '!', rỗng nghĩa là không tìm theo tên.
     */
    @Query(value = "select g from SavingGoal g join fetch g.createdBy "
            + "where g.family.id = :familyId "
            + "and (:status is null or g.status = :status) "
            + "and (:keyword = '' or lower(g.name) like concat('%', :keyword, '%') escape '!')",
            countQuery = "select count(g) from SavingGoal g "
                    + "where g.family.id = :familyId "
                    + "and (:status is null or g.status = :status) "
                    + "and (:keyword = '' or lower(g.name) like concat('%', :keyword, '%') escape '!')")
    Page<SavingGoal> search(@Param("familyId") Long familyId,
                            @Param("status") SavingGoalStatus status,
                            @Param("keyword") String keyword,
                            Pageable pageable);
}