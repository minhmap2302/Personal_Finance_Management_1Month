package org.example.backend.model.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Yêu cầu gửi lời mời vào gia đình. userId lấy từ kết quả tìm kiếm người dùng.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SendInvitationRequest {

    @NotNull(message = "Người được mời không được để trống")
    private Long userId;
}