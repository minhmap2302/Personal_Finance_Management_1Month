package org.example.backend.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteAccountRequest {

    /** Mật khẩu hiện tại, để xác nhận đúng chủ tài khoản đang xóa. */
    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}