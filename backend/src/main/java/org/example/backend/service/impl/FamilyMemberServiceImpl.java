package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.TransferOwnershipRequest;
import org.example.backend.model.dto.request.UpdateMemberRoleRequest;
import org.example.backend.model.dto.response.FamilyMemberResponse;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.service.FamilyMemberService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Nghiệp vụ thành viên trong gia đình.
 * Các thao tác thay đổi thành viên khóa dòng gia đình và chạy ở READ_COMMITTED để chạy lần lượt,
 * giữ được quy tắc "mỗi gia đình đúng một chủ".
 */
@Service
@RequiredArgsConstructor
public class FamilyMemberServiceImpl implements FamilyMemberService {

    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyAccessChecker accessChecker;

    @Override
    @Transactional(readOnly = true)
    public Page<FamilyMemberResponse> getMembers(Long userId, Long familyId, String keyword, Pageable pageable) {
        accessChecker.requireMember(userId, familyId);
        String normalized = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        return familyMemberRepository.searchMembers(familyId, normalized, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public FamilyMemberResponse updateMemberRole(Long userId, Long familyId, Long targetUserId,
                                                 UpdateMemberRoleRequest request) {
        accessChecker.requireRoleWithLock(userId, familyId, FamilyRole.OWNER,
                "Chỉ chủ gia đình mới được nâng hoặc hạ quản lý");

        if (request.getRole() == FamilyRole.OWNER) {
            throw new BadRequestException("Hãy dùng chức năng chuyển quyền để đổi chủ gia đình");
        }
        if (targetUserId.equals(userId)) {
            throw new BadRequestException("Bạn không thể đổi vai trò của chính mình");
        }

        FamilyMember target = findMember(familyId, targetUserId);
        target.setRole(request.getRole());
        return toResponse(target);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void removeMember(Long userId, Long familyId, Long targetUserId) {
        FamilyMember actor = accessChecker.requireRoleWithLock(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được xóa thành viên");

        if (targetUserId.equals(userId)) {
            throw new BadRequestException("Hãy dùng chức năng rời gia đình để tự rời đi");
        }

        FamilyMember target = findMember(familyId, targetUserId);
        // Chỉ xóa được người có cấp bậc thấp hơn: quản lý xóa thành viên, chủ xóa quản lý và thành viên.
        // Không ai xóa được chủ gia đình.
        if (!actor.getRole().isHigherThan(target.getRole())) {
            throw new ForbiddenException("Bạn không thể xóa người có cấp bậc bằng hoặc cao hơn mình");
        }

        // Giao dịch của người này vẫn được giữ lại (giao dịch tham chiếu đến user, không phải thành viên).
        familyMemberRepository.delete(target);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void leaveFamily(Long userId, Long familyId) {
        FamilyMember member = accessChecker.requireRoleWithLock(userId, familyId, FamilyRole.MEMBER,
                "Bạn không thuộc gia đình này");

        if (member.getRole() == FamilyRole.OWNER) {
            throw new BadRequestException(
                    "Chủ gia đình phải chuyển quyền trước khi rời gia đình. "
                            + "Nếu bạn là người duy nhất, hãy xóa gia đình");
        }

        familyMemberRepository.delete(member);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void transferOwnership(Long userId, Long familyId, TransferOwnershipRequest request) {
        FamilyMember owner = accessChecker.requireRoleWithLock(userId, familyId, FamilyRole.OWNER,
                "Chỉ chủ gia đình mới được chuyển quyền");

        if (request.getNewOwnerUserId().equals(userId)) {
            throw new BadRequestException("Bạn đã là chủ gia đình");
        }

        FamilyMember newOwner = findMember(familyId, request.getNewOwnerUserId());
        newOwner.setRole(FamilyRole.OWNER);
        owner.setRole(FamilyRole.MANAGER);
    }

    private FamilyMember findMember(Long familyId, Long targetUserId) {
        return familyMemberRepository.findByUserIdAndFamilyId(targetUserId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Người này không phải thành viên của gia đình"));
    }

    private FamilyMemberResponse toResponse(FamilyMember member) {
        return FamilyMemberResponse.builder()
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .fullName(member.getUser().getFullName())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}