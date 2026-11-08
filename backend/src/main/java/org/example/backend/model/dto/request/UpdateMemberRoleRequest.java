package org.example.backend.model.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.model.enums.FamilyRole;

/**
 * Yêu cầu đổi vai trò của thành viên: MANAGER (nâng) hoặc MEMBER (hạ).
 * Không dùng OWNER, việc đổi chủ thực hiện qua chức năng chuyển quyền.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberRoleRequest {

    @NotNull(message = "Vai trò không được để trống")
    private FamilyRole role;
}