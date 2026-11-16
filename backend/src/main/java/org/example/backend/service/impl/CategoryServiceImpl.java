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
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.CategoryRepository;
import org.example.backend.repository.CategorySpecifications;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.service.CategoryService;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.util.PageableSanitizer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

/**
 * Nghiệp vụ danh mục.
 * - Danh mục hệ thống (family = null): chỉ admin quản lý, không khóa dòng gia đình nào.
 * - Danh mục tùy chỉnh: OWNER và MANAGER của gia đình quản lý, các thao tác ghi khóa dòng gia đình
 *   (READ_COMMITTED) để hai yêu cầu cùng lúc không cùng vượt qua bước kiểm tra trùng tên.
 * Phạm vi do người gọi khai báo bằng familyId: có familyId là danh mục của gia đình, không có là danh mục hệ thống.
 * Quyền được kiểm tra trước khi tải danh mục, và tải theo đúng phạm vi đó, nên không ai dò ra được
 * id danh mục của nơi khác.
 */
@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private static final Set<String> ALLOWED_SORTS = Set.of("name", "type", "id");
    private static final int MAX_PAGE_SIZE = 50;

    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final FamilyAccessChecker familyAccessChecker;

    // =====================================================================
    // Đọc dữ liệu
    // =====================================================================

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

        Specification<Category> spec = Specification
                .where(CategorySpecifications.visibleTo(visibleFamilyId))
                .and(CategorySpecifications.nameContains(normalizedKeyword))
                .and(CategorySpecifications.hasType(type))
                .and(CategorySpecifications.activeOnly(includeArchived));

        return categoryRepository
                .findAll(spec, PageableSanitizer.sanitize(pageable, ALLOWED_SORTS, MAX_PAGE_SIZE))
                .map(CategoryResponse::fromEntity);
    }

    // =====================================================================
    // Tạo
    // =====================================================================

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
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public CategoryResponse createFamilyCategory(User currentUser, Long familyId, CreateCategoryRequest request) {
        FamilyMember member = familyAccessChecker.requireRoleWithLock(
                currentUser.getId(), familyId, FamilyRole.MANAGER,
                "Chỉ OWNER hoặc MANAGER mới được tạo danh mục gia đình");

        validateNameAndType(request.getName(), request.getType(), familyId, null);

        Category category = Category.builder()
                .name(normalizeName(request.getName()))
                .type(request.getType())
                .family(member.getFamily())
                .active(true)
                .build();
        return CategoryResponse.fromEntity(categoryRepository.save(category));
    }

    // =====================================================================
    // Sửa, khôi phục, xóa
    // =====================================================================

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public CategoryResponse updateCategory(User currentUser, Long categoryId, Long familyId,
                                           UpdateCategoryRequest request) {
        Category category = loadManageable(currentUser, categoryId, familyId,
                "Chỉ OWNER hoặc MANAGER mới được sửa danh mục gia đình");

        String newName = request.getName() != null ? normalizeName(request.getName()) : category.getName();
        CategoryType newType = request.getType() != null ? request.getType() : category.getType();

        if (newType != category.getType()) {
            ensureTypeChangeAllowed(categoryId);
        }
        validateNameAndType(newName, newType, familyId, categoryId);

        category.setName(newName);
        category.setType(newType);
        return CategoryResponse.fromEntity(category);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public CategoryResponse restoreCategory(User currentUser, Long categoryId, Long familyId) {
        Category category = loadManageable(currentUser, categoryId, familyId,
                "Chỉ OWNER hoặc MANAGER mới được khôi phục danh mục gia đình");

        if (Boolean.TRUE.equals(category.getActive())) {
            throw new ConflictException("Danh mục này đang hoạt động");
        }

        category.setActive(true);
        return CategoryResponse.fromEntity(category);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteCategory(User currentUser, Long categoryId, Long familyId) {
        Category category = loadManageable(currentUser, categoryId, familyId,
                "Chỉ OWNER hoặc MANAGER mới được xóa danh mục gia đình");

        if (isCategoryUsedByTransactionsOrBudgets(categoryId)) {
            category.setActive(false);
            return;
        }
        categoryRepository.delete(category);
    }

    // =====================================================================
    // Hàm dùng chung
    // =====================================================================

    /**
     * Kiểm tra quyền rồi mới tải danh mục, theo đúng phạm vi người gọi khai báo.
     * - Không có familyId: danh mục hệ thống, phải là admin.
     * - Có familyId: danh mục của gia đình, phải là OWNER hoặc MANAGER (khóa dòng gia đình).
     * Danh mục không nằm trong phạm vi đó (của gia đình khác, hoặc sai loại phạm vi) báo 404 như không tồn tại.
     */
    private Category loadManageable(User currentUser, Long categoryId, Long familyId, String forbiddenMessage) {
        if (familyId == null) {
            requireAdmin(currentUser);
            return categoryRepository.findByIdAndFamilyIsNull(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
        }
        familyAccessChecker.requireRoleWithLock(currentUser.getId(), familyId, FamilyRole.MANAGER, forbiddenMessage);
        return categoryRepository.findByIdAndFamilyId(categoryId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục"));
    }

    private void requireAdmin(User currentUser) {
        if (currentUser.getRole() != SystemRole.ADMIN) {
            throw new ForbiddenException("Bạn không có quyền quản lý danh mục hệ thống");
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
        return input == null ? null : input.trim();
    }

    private boolean isCategoryUsedByTransactionsOrBudgets(Long categoryId) {
        return transactionRepository.existsByCategoryId(categoryId)
                || budgetRepository.existsByCategoryId(categoryId);
    }
}