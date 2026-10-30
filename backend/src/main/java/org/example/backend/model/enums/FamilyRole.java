package org.example.backend.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Vai trò của thành viên trong một gia đình.
 * Cấp bậc: OWNER > MANAGER > MEMBER.
 */
@Getter
@RequiredArgsConstructor
public enum FamilyRole {
    OWNER(3),
    MANAGER(2),
    MEMBER(1);

    /** Cấp bậc càng cao thì quyền càng lớn. */
    private final int level;

    /** Kiểm tra vai trò hiện tại có cấp bậc bằng hoặc cao hơn vai trò khác. */
    public boolean isAtLeast(FamilyRole other) {
        return this.level >= other.level;
    }

    /** Kiểm tra vai trò hiện tại có cấp bậc cao hơn hẳn vai trò khác. */
    public boolean isHigherThan(FamilyRole other) {
        return this.level > other.level;
    }
}