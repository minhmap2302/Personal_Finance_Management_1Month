package org.example.backend.controller;

import org.example.backend.exception.GlobalExceptionHandler;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.CreateCategoryRequest;
import org.example.backend.model.dto.request.UpdateCategoryRequest;
import org.example.backend.model.dto.response.CategoryResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.service.CategoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class CategoryControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private CategoryController categoryController;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .role(SystemRole.USER)
                .enabled(true)
                .build();

        HandlerMethodArgumentResolver userResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().isAssignableFrom(User.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return mockUser;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(categoryController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(userResolver)
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/categories/system - Tạo danh mục hệ thống thành công")
    void createSystemCategory_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(1L)
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .familyId(null)
                .active(true)
                .system(true)
                .build();

        when(categoryService.createSystemCategory(eq(mockUser), any(CreateCategoryRequest.class)))
                .thenReturn(response);

        String json = """
                {
                    "name": "Ăn uống",
                    "type": "EXPENSE"
                }
                """;

        mockMvc.perform(post("/api/v1/categories/system")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Ăn uống"))
                .andExpect(jsonPath("$.data.type").value("EXPENSE"));
    }

    @Test
    @DisplayName("POST /api/v1/categories/system - Không đăng nhập trả về 401")
    void createSystemCategory_unauthorized() throws Exception {
        MockMvc unauthorizedMvc = buildMockMvcWithUser(null);

        String json = """
                {
                    "name": "Ăn uống",
                    "type": "EXPENSE"
                }
                """;

        unauthorizedMvc.perform(post("/api/v1/categories/system")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("POST /api/v1/categories/families/{familyId} - Tạo danh mục gia đình thành công")
    void createFamilyCategory_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(2L)
                .name("Đi chợ")
                .type(CategoryType.EXPENSE)
                .familyId(99L)
                .active(true)
                .system(false)
                .build();

        when(categoryService.createFamilyCategory(eq(mockUser), eq(99L), any(CreateCategoryRequest.class)))
                .thenReturn(response);

        String json = """
                {
                    "name": "Đi chợ",
                    "type": "EXPENSE"
                }
                """;

        mockMvc.perform(post("/api/v1/categories/families/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.familyId").value(99))
                .andExpect(jsonPath("$.data.name").value("Đi chợ"));
    }

    @Test
    @DisplayName("GET /api/v1/categories - Lấy danh sách danh mục thành công")
    void getCategories_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(1L)
                .name("Tiền lương")
                .type(CategoryType.INCOME)
                .familyId(null)
                .active(true)
                .system(true)
                .build();

        Page<CategoryResponse> page = new PageImpl<>(List.of(response), PageRequest.of(0, 10), 1);
        when(categoryService.getCategories(eq(mockUser), eq(10L), eq(""), eq(CategoryType.INCOME), eq(false), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/categories")
                        .param("familyId", "10")
                        .param("type", "INCOME")
                        .param("keyword", "")
                        .param("includeArchived", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].name").value("Tiền lương"));
    }

    @Test
    @DisplayName("PUT /api/v1/categories/{categoryId} - Cập nhật danh mục thành công")
    void updateCategory_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(1L)
                .name("Mua sắm")
                .type(CategoryType.EXPENSE)
                .familyId(5L)
                .active(true)
                .system(false)
                .build();

        when(categoryService.updateCategory(eq(mockUser), eq(1L), eq(5L), any(UpdateCategoryRequest.class)))
                .thenReturn(response);

        String json = """
                {
                    "name": "Mua sắm",
                    "type": "EXPENSE"
                }
                """;

        mockMvc.perform(put("/api/v1/categories/1")
                        .param("familyId", "5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Mua sắm"));
    }

    @Test
    @DisplayName("DELETE /api/v1/categories/{categoryId} - Xóa danh mục thành công")
    void deleteCategory_success() throws Exception {
        doNothing().when(categoryService).deleteCategory(eq(mockUser), eq(1L), eq(5L));

        mockMvc.perform(delete("/api/v1/categories/1")
                        .param("familyId", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa danh mục thành công"));
    }

    @Test
    @DisplayName("PATCH /api/v1/categories/{categoryId}/restore - Khôi phục danh mục thành công")
    void restoreCategory_success() throws Exception {
        CategoryResponse response = CategoryResponse.builder()
                .id(1L)
                .name("Ăn uống")
                .type(CategoryType.EXPENSE)
                .familyId(5L)
                .active(true)
                .system(false)
                .build();

        when(categoryService.restoreCategory(eq(mockUser), eq(1L), eq(5L)))
                .thenReturn(response);

        mockMvc.perform(patch("/api/v1/categories/1/restore")
                        .param("familyId", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Ăn uống"));
    }

    @Test
    @DisplayName("PUT /api/v1/categories/{categoryId} - Không đăng nhập trả về 401")
    void updateCategory_unauthorized() throws Exception {
        MockMvc unauthorizedMvc = buildMockMvcWithUser(null);

        String json = """
                {
                    "name": "Mua sắm",
                    "type": "EXPENSE"
                }
                """;

        unauthorizedMvc.perform(put("/api/v1/categories/1")
                        .param("familyId", "5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("DELETE /api/v1/categories/{categoryId} - Không đăng nhập trả về 401")
    void deleteCategory_unauthorized() throws Exception {
        MockMvc unauthorizedMvc = buildMockMvcWithUser(null);

        unauthorizedMvc.perform(delete("/api/v1/categories/1")
                        .param("familyId", "5"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("GET /api/v1/categories - Truy cập không có người dùng trả về 401")
    void getCategories_unauthorized() throws Exception {
        MockMvc unauthorizedMvc = buildMockMvcWithUser(null);

        unauthorizedMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @DisplayName("GET /api/v1/categories - Danh mục không tồn tại khi service ném exception")
    void getCategories_notFound() throws Exception {
        when(categoryService.getCategories(eq(mockUser), eq(10L), eq(""), eq(CategoryType.EXPENSE), eq(false), any(Pageable.class)))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy danh mục"));

        mockMvc.perform(get("/api/v1/categories")
                        .param("familyId", "10")
                        .param("type", "EXPENSE"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy danh mục"));
    }

    private MockMvc buildMockMvcWithUser(User user) {
        HandlerMethodArgumentResolver userResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().isAssignableFrom(User.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return user;
            }
        };

        return MockMvcBuilders.standaloneSetup(categoryController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(userResolver)
                .build();
    }
}
