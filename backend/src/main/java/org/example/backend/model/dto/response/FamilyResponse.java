package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.model.enums.FamilyRole;

import java.time.LocalDateTime;

/**
 * Thông tin một gia đình kèm vai trò của người đang đăng nhập trong gia đình đó.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyResponse {

    private Long id;
    private String name;

    /** Vai trò của người đang đăng nhập trong gia đình này. */
    private FamilyRole myRole;

    private long memberCount;
    private LocalDateTime createdAt;
}