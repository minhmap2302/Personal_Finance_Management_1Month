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

}