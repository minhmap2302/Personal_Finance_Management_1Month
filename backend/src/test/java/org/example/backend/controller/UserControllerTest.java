package org.example.backend.controller;

import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ConflictException;
import org.example.backend.exception.GlobalExceptionHandler;
import org.example.backend.model.dto.request.ChangePasswordRequest;
import org.example.backend.model.dto.request.UpdateProfileRequest;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.service.UserService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .fullName("Nguyễn Văn A")
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

        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(userResolver)
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/users/me - Lấy thông tin người dùng hiện tại thành công")
    void getCurrentUser_success() throws Exception {
        UserResponse response = UserResponse.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .fullName("Nguyễn Văn A")
                .role(SystemRole.USER)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build();

        when(userService.getCurrentProfile(1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("testuser"))
                .andExpect(jsonPath("$.data.email").value("test@example.com"))
                .andExpect(jsonPath("$.data.fullName").value("Nguyễn Văn A"));
    }

    @Test
    @DisplayName("PUT /api/v1/users/me - Cập nhật hồ sơ thành công")
    void updateProfile_success() throws Exception {
        UserResponse response = UserResponse.builder()
                .id(1L)
                .username("testuser")
                .email("newemail@example.com")
                .fullName("Nguyễn Văn B")
                .role(SystemRole.USER)
                .enabled(true)
                .build();

        when(userService.updateProfile(eq(1L), any(UpdateProfileRequest.class))).thenReturn(response);

        String json = """
                {
                    "fullName": "Nguyễn Văn B",
                    "email": "newemail@example.com"
                }
                """;

        mockMvc.perform(put("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("newemail@example.com"))
                .andExpect(jsonPath("$.data.fullName").value("Nguyễn Văn B"));
    }

    @Test
    @DisplayName("PUT /api/v1/users/me - Email trùng lặp trả về 409 Conflict")
    void updateProfile_conflictEmail() throws Exception {
        when(userService.updateProfile(eq(1L), any(UpdateProfileRequest.class)))
                .thenThrow(new ConflictException("Email 'existing@example.com' đã được sử dụng bởi tài khoản khác"));

        String json = """
                {
                    "fullName": "Nguyễn Văn B",
                    "email": "existing@example.com"
                }
                """;

        mockMvc.perform(put("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Email 'existing@example.com' đã được sử dụng bởi tài khoản khác"));
    }

    @Test
    @DisplayName("PUT /api/v1/users/me/password - Đổi mật khẩu thành công")
    void changePassword_success() throws Exception {
        doNothing().when(userService).changePassword(eq(1L), any(ChangePasswordRequest.class));

        String json = """
                {
                    "currentPassword": "oldPassword123",
                    "newPassword": "newPassword123",
                    "confirmPassword": "newPassword123"
                }
                """;

        mockMvc.perform(put("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đổi mật khẩu thành công"));
    }

    @Test
    @DisplayName("PUT /api/v1/users/me/password - Sai mật khẩu hiện tại trả về 400 Bad Request")
    void changePassword_wrongCurrentPassword() throws Exception {
        doThrow(new BadRequestException("Mật khẩu hiện tại không chính xác"))
                .when(userService).changePassword(eq(1L), any(ChangePasswordRequest.class));

        String json = """
                {
                    "currentPassword": "wrongOldPassword",
                    "newPassword": "newPassword123",
                    "confirmPassword": "newPassword123"
                }
                """;

        mockMvc.perform(put("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Mật khẩu hiện tại không chính xác"));
    }

    @Test
    @DisplayName("PUT /api/v1/users/me/password - Xác nhận mật khẩu mới không khớp trả về 400 Bad Request")
    void changePassword_mismatchConfirmPassword() throws Exception {
        doThrow(new BadRequestException("Xác nhận mật khẩu mới không trùng khớp"))
                .when(userService).changePassword(eq(1L), any(ChangePasswordRequest.class));

        String json = """
                {
                    "currentPassword": "oldPassword123",
                    "newPassword": "newPassword123",
                    "confirmPassword": "differentPassword"
                }
                """;

        mockMvc.perform(put("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Xác nhận mật khẩu mới không trùng khớp"));
    }
}

