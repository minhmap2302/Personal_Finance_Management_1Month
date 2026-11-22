package org.example.backend.model.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResendOtpRequest {
    @NotBlank
    @Email
    @Size(max = 100)
    private String email;
}
