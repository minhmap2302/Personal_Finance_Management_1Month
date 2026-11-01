package org.example.backend.repository;

import org.example.backend.model.entity.Category;
import org.example.backend.model.enums.CategoryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("select c from Category c "
            + "where (c.family is null or c.family.id = :familyId) "
            + "and lower(c.name) like concat('%', :keyword, '%') "
            + "and (:type is null or c.type = :type) "
            + "and (:includeArchived = true or c.active = true)")
    Page<Category> search(@Param("familyId") Long familyId,
                          @Param("keyword") String keyword,
                          @Param("type") CategoryType type,
                          @Param("includeArchived") boolean includeArchived,
                          Pageable pageable);
}