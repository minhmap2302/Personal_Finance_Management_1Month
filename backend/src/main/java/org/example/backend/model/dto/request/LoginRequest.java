package org.example.backend.model.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    private String username;

    private String usernameOrEmail;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;

    @AssertTrue(message = "Tên đăng nhập hoặc email không được để trống")
    public boolean isIdentifierPresent() {
        return (username != null && !username.isBlank()) || (usernameOrEmail != null && !usernameOrEmail.isBlank());
    }

    public String getLoginIdentifier() {
        if (username != null && !username.isBlank()) {
            return username;
        }
        if (usernameOrEmail != null && !usernameOrEmail.isBlank()) {
            return usernameOrEmail;
        }
        return null;
    }
}

