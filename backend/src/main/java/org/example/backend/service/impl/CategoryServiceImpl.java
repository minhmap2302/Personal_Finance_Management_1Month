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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
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
    public Page<CategoryResponse> getCategories(User currentUser, Long familyId, String keyword, CategoryType type,
                                                boolean includeArchived, Pageable pageable) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        // Admin chỉ thấy danh mục hệ thống (visibleFamilyId = null), không bao giờ thấy danh mục tùy chỉnh của gia đình.
        Long visibleFamilyId = null;
        if (currentUser.getRole() != SystemRole.ADMIN) {
            if (familyId == null) {
                throw new BadRequestException("Thiếu familyId khi truy cập danh mục gia đình");
            }
            familyAccessChecker.requireMember(currentUser.getId(), familyId);
            visibleFamilyId = familyId;
        }

        return categoryRepository
                .search(visibleFamilyId, normalizedKeyword, type, includeArchived, pageable)
                .map(CategoryResponse::fromEntity);
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
            String newName = request.getName() != null ? normalizeName(request.getName()) : category.getName();
            CategoryType newType = request.getType() != null ? request.getType() : category.getType();

            boolean typeChanged = !Objects.equals(category.getType(), newType);
            if (typeChanged) {
                ensureTypeChangeAllowed(categoryId);
            }
            if (typeChanged || !Objects.equals(category.getName(), newName)) {
                validateNameAndType(newName, newType, null, categoryId);
            }
            category.setName(newName);
            category.setType(newType);
            return CategoryResponse.fromEntity(categoryRepository.save(category));
        }

        if (familyId == null) {
            throw new BadRequestException("Thiếu familyId");
        }

        familyAccessChecker.requireRole(currentUser.getId(), familyId, FamilyRole.MANAGER,
                "Chỉ OWNER hoặc MANAGER mới được sửa danh mục gia đình");

        requireBelongsToFamily(category, familyId);

        String newName = request.getName() != null ? normalizeName(request.getName()) : category.getName();
        CategoryType newType = request.getType() != null ? request.getType() : category.getType();

        if (!Objects.equals(category.getType(), newType)) {
            ensureTypeChangeAllowed(categoryId);
        }

        validateNameAndType(newName, newType, familyId, categoryId);
        category.setName(newName);
        category.setType(newType);
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

        requireBelongsToFamily(category, familyId);

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

        requireBelongsToFamily(category, familyId);

        if (isCategoryUsedByTransactionsOrBudgets(categoryId)) {
            category.setActive(false);
            categoryRepository.save(category);
            return;
        }

        categoryRepository.delete(category);
    }

    private void requireAdmin(User currentUser) {
        if (currentUser == null || currentUser.getRole() != SystemRole.ADMIN) {
            throw new ForbiddenException("Bạn không có quyền quản lý danh mục hệ thống");
        }
    }

    /**
     * Danh mục của gia đình khác được coi như không tồn tại (404), không trả 403,
     * để người dùng không dò ra được id danh mục của gia đình khác.
     */
    private void requireBelongsToFamily(Category category, Long familyId) {
        if (category.getFamily() == null || !category.getFamily().getId().equals(familyId)) {
            throw new ResourceNotFoundException("Không tìm thấy danh mục");
        }
    }

    /** Loại thu/chi chỉ được đổi khi danh mục chưa được giao dịch hoặc ngân sách nào sử dụng. */
    private void ensureTypeChangeAllowed(Long categoryId) {
        if (isCategoryUsedByTransactionsOrBudgets(categoryId)) {
            throw new BadRequestException("Không được đổi loại danh mục sau khi đã được sử dụng");
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