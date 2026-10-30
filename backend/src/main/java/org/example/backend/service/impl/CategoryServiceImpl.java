package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ConflictException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.CreateCategoryRequest;
import org.example.backend.model.dto.request.UpdateCategoryRequest;
import org.example.backend.model.dto.response.CategoryResponse;
import org.example.backend.model.entity.Category;
import org.example.backend.model.entity.Family;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.CategoryRepository;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.service.CategoryService;
import org.example.backend.service.FamilyAccessChecker;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final FamilyAccessChecker familyAccessChecker;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories(User currentUser, Long familyId, String keyword, CategoryType type,
                                               boolean includeArchived, int page, int size) {
        if (page < 0 || size <= 0) {
            throw new BadRequestException("Trang hoặc kích thước trang không hợp lệ");
        }

        if (currentUser.getRole() == SystemRole.ADMIN) {
            List<Category> categories = categoryRepository.findByFamilyIsNullOrderByNameAsc();
            return filterAndPage(categories, keyword, type, includeArchived, page, size);
        }

        if (familyId == null) {
            throw new BadRequestException("Thiếu familyId khi truy cập danh mục gia đình");
        }

        familyAccessChecker.requireMember(currentUser.getId(), familyId);

        List<Category> categories = new ArrayList<>();
        categories.addAll(categoryRepository.findByFamilyIsNullOrderByNameAsc());
        categories.addAll(categoryRepository.findByFamilyIdOrderByNameAsc(familyId));

        return filterAndPage(categories, keyword, type, includeArchived, page, size);
    }

    @Override
    @Transactional
    public CategoryResponse createSystemCategory(User currentUser, CreateCategoryRequest request) {
        requireAdmin(currentUser);
        validateNameAndType(request.getName(), request.getType(), null, null);
        Category category = Category.builder()
                .name(normalizeName(request.getName()))
                .type(request.getType())
                .family(null)
                .active(true)
                .build();
        return CategoryResponse.fromEntity(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public CategoryResponse createFamilyCategory(User currentUser, Long familyId, CreateCategoryRequest request) {
        if (familyId == null) {
            throw new BadRequestException("Thiếu familyId");
        }

        FamilyMember member = familyAccessChecker.requireRole(currentUser.getId(), familyId, FamilyRole.MANAGER,
                "Chỉ OWNER hoặc MANAGER mới được tạo danh mục gia đình");

        validateNameAndType(request.getName(), request.getType(), familyId, null);

        Family family = member.getFamily();
        Category category = Category.builder()
                .name(normalizeName(request.getName()))
                .type(request.getType())
                .family(family)
                .active(true)
                .build();
        return CategoryResponse.fromEntity(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(User currentUser, Long categoryId, Long familyId, UpdateCategoryRequest request) {
        if (categoryId == null) {
            throw new BadRequestException("Thiếu categoryId");
        }
        if (request == null) {
            throw new BadRequestException("Dữ liệu cập nhật không hợp lệ");
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        if (category.getFamily() == null) {
            requireAdmin(currentUser);
            if (request.getType() != null && category.getActive() != null && !category.getActive()) {
                // no-op, keep type immutable if already used; validation below will catch if type changed
            }
            String newName = request.getName() != null ? normalizeName(request.getName()) : category.getName();
            CategoryType newType = request.getType() != null ? request.getType() : category.getType();
            if (!Objects.equals(category.getName(), newName) || !Objects.equals(category.getType(), newType)) {
                validateNameAndType(newName, newType, null, categoryId);
            }
            category.setName(newName);
            category.setType(newType);
            if (request.getActive() != null) {
                category.setActive(request.getActive());
            }
            return CategoryResponse.fromEntity(categoryRepository.save(category));
        }

        if (familyId == null) {
            throw new BadRequestException("Thiếu familyId");
        }

        familyAccessChecker.requireRole(currentUser.getId(), familyId, FamilyRole.MANAGER,
                "Chỉ OWNER hoặc MANAGER mới được sửa danh mục gia đình");

        if (!category.getFamily().getId().equals(familyId)) {
            throw new ForbiddenException("Danh mục không thuộc gia đình này");
        }

        String newName = request.getName() != null ? normalizeName(request.getName()) : category.getName();
        if (request.getType() != null && !Objects.equals(category.getType(), request.getType())) {
            throw new BadRequestException("Không được đổi loại danh mục sau khi đã được sử dụng");
        }

        validateNameAndType(newName, category.getType(), familyId, categoryId);
        category.setName(newName);
        if (request.getActive() != null) {
            category.setActive(request.getActive());
        }
        return CategoryResponse.fromEntity(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public CategoryResponse restoreCategory(User currentUser, Long categoryId, Long familyId) {
        if (categoryId == null) {
            throw new BadRequestException("Thiếu categoryId");
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        if (category.getFamily() == null) {
            requireAdmin(currentUser);
            if (Boolean.TRUE.equals(category.getActive())) {
                throw new BadRequestException("Danh mục hệ thống này đang ở trạng thái hoạt động");
            }
            category.setActive(true);
            return CategoryResponse.fromEntity(categoryRepository.save(category));
        }

        if (familyId == null) {
            throw new BadRequestException("Thiếu familyId");
        }

        familyAccessChecker.requireRole(currentUser.getId(), familyId, FamilyRole.MANAGER,
                "Chỉ OWNER hoặc MANAGER mới được khôi phục danh mục gia đình");

        if (!category.getFamily().getId().equals(familyId)) {
            throw new ForbiddenException("Danh mục không thuộc gia đình này");
        }

        if (Boolean.TRUE.equals(category.getActive())) {
            throw new BadRequestException("Danh mục này đang hoạt động");
        }

        category.setActive(true);
        return CategoryResponse.fromEntity(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public void deleteCategory(User currentUser, Long categoryId, Long familyId) {
        if (categoryId == null) {
            throw new BadRequestException("Thiếu categoryId");
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));

        if (category.getFamily() == null) {
            requireAdmin(currentUser);
            if (isCategoryUsedByTransactionsOrBudgets(categoryId)) {
                category.setActive(false);
                categoryRepository.save(category);
                return;
            }
            categoryRepository.delete(category);
            return;
        }

        if (familyId == null) {
            throw new BadRequestException("Thiếu familyId");
        }

        familyAccessChecker.requireRole(currentUser.getId(), familyId, FamilyRole.MANAGER,
                "Chỉ OWNER hoặc MANAGER mới được xóa danh mục gia đình");

        if (!category.getFamily().getId().equals(familyId)) {
            throw new ForbiddenException("Danh mục không thuộc gia đình này");
        }

        if (isCategoryUsedByTransactionsOrBudgets(categoryId)) {
            category.setActive(false);
            categoryRepository.save(category);
            return;
        }

        categoryRepository.delete(category);
    }

    private List<CategoryResponse> filterAndPage(List<Category> source, String keyword, CategoryType type,
                                               boolean includeArchived, int page, int size) {
        List<Category> filtered = source.stream()
                .filter(c -> includeArchived || Boolean.TRUE.equals(c.getActive()))
                .filter(c -> keyword == null || keyword.isBlank() ||
                        c.getName().toLowerCase().contains(keyword.toLowerCase().trim()))
                .filter(c -> type == null || c.getType() == type)
                .toList();

        int fromIndex = page * size;
        if (fromIndex >= filtered.size()) {
            return List.of();
        }

        int toIndex = Math.min(fromIndex + size, filtered.size());
        return filtered.subList(fromIndex, toIndex).stream()
                .map(CategoryResponse::fromEntity)
                .toList();
    }

    private void requireAdmin(User currentUser) {
        if (currentUser == null || currentUser.getRole() != SystemRole.ADMIN) {
            throw new ForbiddenException("Bạn không có quyền quản lý danh mục hệ thống");
        }
    }

    private void validateNameAndType(String name, CategoryType type, Long familyId, Long excludeId) {
        String normalized = normalizeName(name);
        if (normalized == null || normalized.isBlank()) {
            throw new BadRequestException("Tên danh mục không được để trống");
        }
        if (type == null) {
            throw new BadRequestException("Loại danh mục không được để trống");
        }

        if (familyId == null) {
            boolean exists = excludeId == null
                    ? categoryRepository.existsByFamilyIsNullAndNameIgnoreCaseAndType(normalized, type)
                    : categoryRepository.existsByFamilyIsNullAndNameIgnoreCaseAndTypeAndIdNot(normalized, type, excludeId);
            if (exists) {
                throw new ConflictException("Danh mục hệ thống với tên và loại này đã tồn tại");
            }
            return;
        }

        boolean exists = excludeId == null
                ? categoryRepository.existsByFamilyIdAndNameIgnoreCaseAndType(familyId, normalized, type)
                : categoryRepository.existsByFamilyIdAndNameIgnoreCaseAndTypeAndIdNot(familyId, normalized, type, excludeId);
        if (exists) {
            throw new ConflictException("Danh mục này đã tồn tại trong gia đình với tên và loại tương tự");
        }
    }

    private String normalizeName(String input) {
        if (input == null) {
            return null;
        }
        return input.trim();
    }

    private boolean isCategoryUsedByTransactionsOrBudgets(Long categoryId) {
        return transactionRepository.existsByCategoryId(categoryId)
                || budgetRepository.existsByCategoryId(categoryId);
    }
}
