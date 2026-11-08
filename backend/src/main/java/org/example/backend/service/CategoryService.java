package org.example.backend.service;

import org.example.backend.model.dto.request.CreateCategoryRequest;
import org.example.backend.model.dto.request.UpdateCategoryRequest;
import org.example.backend.model.dto.response.CategoryResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CategoryService {

    /**
     * Danh sách danh mục, có tìm theo tên, lọc theo loại và phân trang.
     * Admin chỉ thấy danh mục hệ thống. Người dùng thường thấy danh mục hệ thống và danh mục của gia đình mình.
     */
    Page<CategoryResponse> getCategories(User currentUser, Long familyId, String keyword, CategoryType type,
                                         boolean includeArchived, Pageable pageable);

    CategoryResponse createSystemCategory(User currentUser, CreateCategoryRequest request);

    CategoryResponse createFamilyCategory(User currentUser, Long familyId, CreateCategoryRequest request);

    CategoryResponse updateCategory(User currentUser, Long categoryId, Long familyId, UpdateCategoryRequest request);

    CategoryResponse restoreCategory(User currentUser, Long categoryId, Long familyId);

    void deleteCategory(User currentUser, Long categoryId, Long familyId);
}