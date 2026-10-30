package org.example.backend.service;

import org.example.backend.exception.ConflictException;
import org.example.backend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private BudgetRepository budgetRepository;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    private User currentUser;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        currentUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .username("testuser")
                .build();

        testCategory = Category.builder()
                .id(10L)
                .user(currentUser)
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Tạo danh mục thành công")
    void createCategory_success() {
        CategoryCreateRequest request = CategoryCreateRequest.builder()
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .build();

        when(categoryRepository.existsByNameIgnoreCaseAndUserIdAndType("Ăn uống", 1L, CategoryType.EXPENSE))
                .thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(testCategory);

        CategoryResponse response = categoryService.createCategory(request, currentUser);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("Ăn uống", response.getName());
        assertEquals(CategoryType.EXPENSE, response.getType());
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("Tạo danh mục thất bại do trùng tên và loại của cùng user")
    void createCategory_conflict() {
        CategoryCreateRequest request = CategoryCreateRequest.builder()
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .build();

        when(categoryRepository.existsByNameIgnoreCaseAndUserIdAndType("Ăn uống", 1L, CategoryType.EXPENSE))
                .thenReturn(true);

        assertThrows(ConflictException.class, () -> categoryService.createCategory(request, currentUser));
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    @DisplayName("Lấy danh sách danh mục theo user không lọc")
    void getCategories_all() {
        when(categoryRepository.findAllByUserId(1L)).thenReturn(List.of(testCategory));

        List<CategoryResponse> list = categoryService.getCategories(currentUser, null);

        assertEquals(1, list.size());
        assertEquals("Ăn uống", list.get(0).getName());
        verify(categoryRepository).findAllByUserId(1L);
    }

    @Test
    @DisplayName("Lấy danh sách danh mục theo user có lọc theo type")
    void getCategories_filtered() {
        when(categoryRepository.findAllByUserIdAndType(1L, CategoryType.EXPENSE))
                .thenReturn(List.of(testCategory));

        List<CategoryResponse> list = categoryService.getCategories(currentUser, CategoryType.EXPENSE);

        assertEquals(1, list.size());
        verify(categoryRepository).findAllByUserIdAndType(1L, CategoryType.EXPENSE);
    }

    @Test
    @DisplayName("Lấy chi tiết danh mục thành công")
    void getCategoryById_success() {
        when(categoryRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCategory));

        CategoryResponse response = categoryService.getCategoryById(10L, currentUser);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("Ăn uống", response.getName());
    }

    @Test
    @DisplayName("Lấy chi tiết danh mục thất bại khi không thuộc quyền sở hữu")
    void getCategoryById_notFound() {
        when(categoryRepository.findByIdAndUserId(99L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> categoryService.getCategoryById(99L, currentUser));
    }

    @Test
    @DisplayName("Cập nhật danh mục thành công")
    void updateCategory_success() {
        CategoryUpdateRequest request = CategoryUpdateRequest.builder()
                .name("Ăn uống ngoài")
                .type(CategoryType.EXPENSE)
                .build();

        when(categoryRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCategory));
        when(categoryRepository.existsByNameIgnoreCaseAndUserIdAndType("Ăn uống ngoài", 1L, CategoryType.EXPENSE))
                .thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(testCategory);

        CategoryResponse response = categoryService.updateCategory(10L, request, currentUser);

        assertNotNull(response);
        verify(categoryRepository).save(testCategory);
    }

    @Test
    @DisplayName("Xóa danh mục thành công khi không có ràng buộc")
    void deleteCategory_success() {
        when(categoryRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCategory));
        when(transactionRepository.existsByCategoryId(10L)).thenReturn(false);
        when(budgetRepository.existsByCategoryId(10L)).thenReturn(false);

        categoryService.deleteCategory(10L, currentUser);

        verify(categoryRepository).delete(testCategory);
    }

    @Test
    @DisplayName("Xóa danh mục thất bại do có giao dịch tham chiếu (HTTP 409)")
    void deleteCategory_conflictTransaction() {
        when(categoryRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCategory));
        when(transactionRepository.existsByCategoryId(10L)).thenReturn(true);

        assertThrows(ConflictException.class, () -> categoryService.deleteCategory(10L, currentUser));
        verify(categoryRepository, never()).delete(any(Category.class));
    }

    @Test
    @DisplayName("Xóa danh mục thất bại do có ngân sách tham chiếu (HTTP 409)")
    void deleteCategory_conflictBudget() {
        when(categoryRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(testCategory));
        when(transactionRepository.existsByCategoryId(10L)).thenReturn(false);
        when(budgetRepository.existsByCategoryId(10L)).thenReturn(true);

        assertThrows(ConflictException.class, () -> categoryService.deleteCategory(10L, currentUser));
        verify(categoryRepository, never()).delete(any(Category.class));
    }
}
