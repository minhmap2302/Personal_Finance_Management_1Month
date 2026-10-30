package org.example.backend.repository;

import org.example.backend.model.entity.SavingGoal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingGoalRepository extends JpaRepository<SavingGoal, Long> {
}