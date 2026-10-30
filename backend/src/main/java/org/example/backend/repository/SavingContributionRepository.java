package org.example.backend.repository;

import org.example.backend.model.entity.SavingContribution;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavingContributionRepository extends JpaRepository<SavingContribution, Long> {
}
