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
}