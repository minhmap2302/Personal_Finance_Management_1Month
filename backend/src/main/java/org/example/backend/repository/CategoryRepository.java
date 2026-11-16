package org.example.backend.repository;

import org.example.backend.model.entity.Category;
import org.example.backend.model.enums.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long>, JpaSpecificationExecutor<Category> {

    /** Danh mục hệ thống theo id. Danh mục của gia đình có id này coi như không tồn tại. */
    Optional<Category> findByIdAndFamilyIsNull(Long id);

    /** Danh mục của đúng gia đình này theo id. Danh mục hệ thống hoặc của gia đình khác coi như không tồn tại. */
    Optional<Category> findByIdAndFamilyId(Long id, Long familyId);

    boolean existsByFamilyIsNullAndNameIgnoreCaseAndType(String name, CategoryType type);

    boolean existsByFamilyIsNullAndNameIgnoreCaseAndTypeAndIdNot(String name, CategoryType type, Long id);

    boolean existsByFamilyIdAndNameIgnoreCaseAndType(Long familyId, String name, CategoryType type);

    boolean existsByFamilyIdAndNameIgnoreCaseAndTypeAndIdNot(Long familyId, String name, CategoryType type, Long id);
}