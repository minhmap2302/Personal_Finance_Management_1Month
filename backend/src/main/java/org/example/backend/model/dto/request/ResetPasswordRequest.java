package org.example.backend.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank
    private String resetToken;

    @NotBlank
    @Size(min = 6, max = 100)
    private String newPassword;
}
