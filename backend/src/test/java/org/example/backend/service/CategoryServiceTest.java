package org.example.backend.service;

import org.example.backend.exception.ConflictException;
import org.example.backend.model.dto.request.CreateCategoryRequest;
import org.example.backend.model.dto.request.UpdateCategoryRequest;
import org.example.backend.model.dto.response.CategoryResponse;
import org.example.backend.model.entity.Category;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.CategoryRepository;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.service.impl.CategoryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private BudgetRepository budgetRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private FamilyAccessChecker familyAccessChecker;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    private User currentUser;
    private Category category;

    @BeforeEach
    void setUp() {
        currentUser = User.builder()
                .id(1L)
                .email("admin@example.com")
                .username("admin")
                .role(SystemRole.ADMIN)
                .enabled(true)
                .build();

        category = Category.builder()
                .id(10L)
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .family(null)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("createSystemCategory - thành công")
    void createSystemCategory_success() {
        CreateCategoryRequest request = CreateCategoryRequest.builder()
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .build();

        when(categoryRepository.existsByFamilyIsNullAndNameIgnoreCaseAndType("Ăn uống", CategoryType.EXPENSE))
                .thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(category);

        CategoryResponse response = categoryService.createSystemCategory(currentUser, request);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("Ăn uống", response.getName());
        assertEquals(CategoryType.EXPENSE, response.getType());
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("createSystemCategory - trùng tên sẽ ném ConflictException")
    void createSystemCategory_conflict() {
        CreateCategoryRequest request = CreateCategoryRequest.builder()
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .build();

        when(categoryRepository.existsByFamilyIsNullAndNameIgnoreCaseAndType("Ăn uống", CategoryType.EXPENSE))
                .thenReturn(true);

        assertThrows(ConflictException.class, () -> categoryService.createSystemCategory(currentUser, request));
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    @DisplayName("getCategories - trả về page danh mục")
    void getCategories_success() {
        PageRequest pageable = PageRequest.of(0, 10);
        Page<Category> page = new PageImpl<>(List.of(category), pageable, 1);

        when(categoryRepository.search(null, "", CategoryType.EXPENSE, false, pageable))
                .thenReturn(page);

        Page<CategoryResponse> result = categoryService.getCategories(currentUser, null, "", CategoryType.EXPENSE, false, pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Ăn uống", result.getContent().get(0).getName());
    }

    @Test
    @DisplayName("updateCategory - thành công")
    void updateCategory_success() {
        UpdateCategoryRequest request = UpdateCategoryRequest.builder()
                .name("Ăn uống mới")
                .type(CategoryType.EXPENSE)
                .build();

        Category existing = Category.builder()
                .id(10L)
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .family(null)
                .active(true)
                .build();

        when(categoryRepository.findById(10L)).thenReturn(Optional.of(existing));
        when(categoryRepository.existsByFamilyIsNullAndNameIgnoreCaseAndTypeAndIdNot("Ăn uống mới", CategoryType.EXPENSE, 10L))
                .thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(existing);

        CategoryResponse response = categoryService.updateCategory(currentUser, 10L, null, request);

        assertNotNull(response);
        assertEquals("Ăn uống", response.getName());
    }
}
