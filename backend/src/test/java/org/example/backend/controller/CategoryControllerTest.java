package org.example.backend.controller;

import org.example.backend.exception.ConflictException;
import org.example.backend.exception.GlobalExceptionHandler;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.response.CategoryResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.security.principal.CustomUserDetails;
import org.example.backend.service.CategoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private CategoryController categoryController;

    private CustomUserDetails mockUserDetails;

    @BeforeEach
    void setUp() {
        User testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .username("testuser")
                .build();
        mockUserDetails = new CustomUserDetails(testUser);

        HandlerMethodArgumentResolver userDetailsResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().isAssignableFrom(CustomUserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return mockUserDetails;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(categoryController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(userDetailsResolver)
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/categories - Tạo danh mục thành công trả về 201 Created")
    void createCategory_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(1L)
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .build();

        when(categoryService.createCategory(any(CategoryCreateRequest.class), any(User.class)))
                .thenReturn(response);

        String json = """
                {
                    "name": "Ăn uống",
                    "type": "EXPENSE"
                }
                """;

        mockMvc.perform(post("/api/v1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Ăn uống"))
                .andExpect(jsonPath("$.data.type").value("EXPENSE"));
    }

    @Test
    @DisplayName("GET /api/v1/categories - Lấy danh sách danh mục thành công")
    void getCategories_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(1L)
                .name("Tiền lương")
                .type(CategoryType.INCOME)
                .build();

        when(categoryService.getCategories(any(User.class), eq(CategoryType.INCOME)))
                .thenReturn(List.of(response));

        mockMvc.perform(get("/api/v1/categories")
                        .param("type", "INCOME"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].name").value("Tiền lương"));
    }

    @Test
    @DisplayName("GET /api/v1/categories/{id} - Lấy chi tiết danh mục thành công")
    void getCategoryById_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(1L)
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .build();

        when(categoryService.getCategoryById(eq(1L), any(User.class)))
                .thenReturn(response);

        mockMvc.perform(get("/api/v1/categories/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/categories/{id} - Danh mục không tồn tại trả về 404")
    void getCategoryById_notFound() throws Exception {
        when(categoryService.getCategoryById(eq(99L), any(User.class)))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy danh mục với ID: 99"));

        mockMvc.perform(get("/api/v1/categories/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("PUT /api/v1/categories/{id} - Cập nhật danh mục thành công")
    void updateCategory_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(1L)
                .name("Mua sắm")
                .type(CategoryType.EXPENSE)
                .build();

        when(categoryService.updateCategory(eq(1L), any(CategoryUpdateRequest.class), any(User.class)))
                .thenReturn(response);

        String json = """
                {
                    "name": "Mua sắm",
                    "type": "EXPENSE"
                }
                """;

        mockMvc.perform(put("/api/v1/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Mua sắm"));
    }

    @Test
    @DisplayName("DELETE /api/v1/categories/{id} - Xóa danh mục thành công")
    void deleteCategory_success() throws Exception {
        doNothing().when(categoryService).deleteCategory(eq(1L), any(User.class));

        mockMvc.perform(delete("/api/v1/categories/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa danh mục thành công"));
    }

    @Test
    @DisplayName("DELETE /api/v1/categories/{id} - Bị ràng buộc giao dịch trả về 409 Conflict")
    void deleteCategory_conflict() throws Exception {
        doThrow(new ConflictException("Không thể xóa danh mục này vì đã có giao dịch sử dụng nó"))
                .when(categoryService).deleteCategory(eq(1L), any(User.class));

        mockMvc.perform(delete("/api/v1/categories/1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Không thể xóa danh mục này vì đã có giao dịch sử dụng nó"));
    }
}
