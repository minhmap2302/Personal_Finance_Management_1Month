package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.model.enums.FamilyRole;

import java.time.LocalDateTime;

/**
 * Thông tin một thành viên trong gia đình.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyMemberResponse {

    private Long userId;
    private String username;
    private String fullName;
    private FamilyRole role;
    private LocalDateTime joinedAt;
}