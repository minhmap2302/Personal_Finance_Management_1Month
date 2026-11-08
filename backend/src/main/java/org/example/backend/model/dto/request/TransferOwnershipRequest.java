package org.example.backend.model.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Yêu cầu chuyển quyền chủ gia đình cho một thành viên khác.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TransferOwnershipRequest {

    @NotNull(message = "Chủ gia đình mới không được để trống")
    private Long newOwnerUserId;
}