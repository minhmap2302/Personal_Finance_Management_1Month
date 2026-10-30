package org.example.backend.repository;

import org.example.backend.model.entity.Category;
import org.example.backend.model.enums.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByFamilyIsNullOrderByNameAsc();

    List<Category> findByFamilyIdOrderByNameAsc(Long familyId);

    Optional<Category> findByIdAndFamilyIsNull(Long id);

    Optional<Category> findByIdAndFamilyId(Long id, Long familyId);

    boolean existsByFamilyIsNullAndNameIgnoreCaseAndType(String name, CategoryType type);

    boolean existsByFamilyIdAndNameIgnoreCaseAndType(Long familyId, String name, CategoryType type);

    boolean existsByFamilyIdAndNameIgnoreCaseAndTypeAndIdNot(Long familyId, String name, CategoryType type, Long id);

    boolean existsByFamilyIsNullAndNameIgnoreCaseAndTypeAndIdNot(String name, CategoryType type, Long id);

    boolean existsByFamilyIsNullAndActiveTrue();

    boolean existsByFamilyIdAndActiveTrue(Long familyId);
}