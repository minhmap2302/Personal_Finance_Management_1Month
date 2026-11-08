package org.example.backend.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.repository.FamilyRepository;
import org.springframework.stereotype.Component;

/**
 * Kiểm tra quyền theo gia đình: người dùng phải là thành viên và có vai trò đủ cao.
 * Admin hệ thống không phải thành viên của gia đình nào nên không qua được các kiểm tra này.
 */
@Component
@RequiredArgsConstructor
public class FamilyAccessChecker {

    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyRepository familyRepository;

    /**
     * Người dùng phải là thành viên của gia đình. Người không phải thành viên nhận 404 như gia đình không tồn tại
     * (không phải 403), để không ai dò ra được gia đình nào có thật. Thiếu vai trò (requireRole) mới là 403.
     */
    public FamilyMember requireMember(Long userId, Long familyId) {
        return familyMemberRepository.findByUserIdAndFamilyId(userId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Gia đình không tồn tại"));
    }

    /** Người dùng phải là thành viên và có vai trò từ minimum trở lên. */
    public FamilyMember requireRole(Long userId, Long familyId, FamilyRole minimum, String message) {
        FamilyMember member = requireMember(userId, familyId);
        if (!member.getRole().isAtLeast(minimum)) {
            throw new ForbiddenException(message);
        }
        return member;
    }

    /**
     * Như requireRole nhưng khóa dòng gia đình trước, để các thao tác thay đổi thành viên của cùng một gia đình
     * chạy lần lượt. Chỉ khóa sau khi biết người gọi là thành viên (người ngoài không khóa được gia đình khác),
     * và đọc vai trò sau khi khóa để không dùng dữ liệu cũ. Phải gọi trong giao dịch READ_COMMITTED.
     */
    public FamilyMember requireRoleWithLock(Long userId, Long familyId, FamilyRole minimum, String message) {
        if (!familyMemberRepository.existsByUserIdAndFamilyId(userId, familyId)) {
            throw new ResourceNotFoundException("Gia đình không tồn tại");
        }
        familyRepository.findByIdForUpdate(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Gia đình không tồn tại"));
        return requireRole(userId, familyId, minimum, message);
    }
}