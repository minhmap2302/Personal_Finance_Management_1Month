package org.example.backend.service;

import org.example.backend.model.dto.request.CreateCategoryRequest;
import org.example.backend.model.dto.request.UpdateCategoryRequest;
import org.example.backend.model.dto.response.CategoryResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;

import java.util.List;

public interface CategoryService {

    List<CategoryResponse> getCategories(User currentUser, Long familyId, String keyword, CategoryType type,
                                        boolean includeArchived, int page, int size);

    CategoryResponse createSystemCategory(User currentUser, CreateCategoryRequest request);

    CategoryResponse createFamilyCategory(User currentUser, Long familyId, CreateCategoryRequest request);

    CategoryResponse updateCategory(User currentUser, Long categoryId, Long familyId, UpdateCategoryRequest request);

    CategoryResponse restoreCategory(User currentUser, Long categoryId, Long familyId);

    void deleteCategory(User currentUser, Long categoryId, Long familyId);
}
