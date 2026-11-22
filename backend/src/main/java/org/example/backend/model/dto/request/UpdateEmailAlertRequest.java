package org.example.backend.model.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Bật hoặc tắt cảnh báo ngân sách qua email của chính người dùng. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmailAlertRequest {

    @NotNull(message = "Trạng thái cảnh báo email không được để trống")
    private Boolean enabled;
}