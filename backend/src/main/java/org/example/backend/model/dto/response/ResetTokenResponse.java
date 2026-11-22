package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ResetTokenResponse {
    private String resetToken;
    private long expiresIn;
}
