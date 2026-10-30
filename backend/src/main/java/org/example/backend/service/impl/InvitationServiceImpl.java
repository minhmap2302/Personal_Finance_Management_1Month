package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ConflictException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.SendInvitationRequest;
import org.example.backend.model.dto.response.InvitationResponse;
import org.example.backend.model.dto.response.UserSearchResponse;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.Invitation;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.model.enums.InvitationStatus;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.repository.InvitationRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.service.InvitationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ lời mời vào gia đình.
 * Người được mời phải đồng ý, không ai bị thêm thẳng vào gia đình.
 */
@Service
@RequiredArgsConstructor
public class InvitationServiceImpl implements InvitationService {

    /** Số ký tự tối thiểu khi tìm người dùng, tránh liệt kê hàng loạt tài khoản. */
    private static final int MIN_SEARCH_LENGTH = 2;

    /** Số kết quả tối đa khi tìm người dùng. */
    private static final int MAX_SEARCH_RESULTS = 10;

    private final InvitationRepository invitationRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final FamilyAccessChecker accessChecker;

    @Override
    @Transactional(readOnly = true)
    public List<UserSearchResponse> searchUsers(Long userId, Long familyId, String keyword) {
        accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được tìm người để mời");

        String normalized = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() < MIN_SEARCH_LENGTH) {
            throw new BadRequestException("Hãy nhập ít nhất " + MIN_SEARCH_LENGTH + " ký tự để tìm kiếm");
        }

        // Bỏ qua tài khoản admin hệ thống (không được vào gia đình), tài khoản bị khóa và người đã là thành viên.
        List<User> users = invitationRepository.searchInvitableUsers(
                normalized, SystemRole.ADMIN, familyId,
                PageRequest.of(0, MAX_SEARCH_RESULTS, Sort.by("username")));
        if (users.isEmpty()) {
            return List.of();
        }

        Set<Long> alreadyInvited = Set.copyOf(invitationRepository.findInvitedUserIds(
                familyId, InvitationStatus.PENDING, users.stream().map(User::getId).toList()));

        return users.stream()
                .map(u -> UserSearchResponse.builder()
                        .userId(u.getId())
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .alreadyInvited(alreadyInvited.contains(u.getId()))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public InvitationResponse sendInvitation(Long userId, Long familyId, SendInvitationRequest request) {
        FamilyMember actor = accessChecker.requireRoleWithLock(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được gửi lời mời");

        User invited = userRepository.findById(request.getUserId())
                .filter(User::isEnabled)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (invited.getRole() == SystemRole.ADMIN) {
            throw new BadRequestException("Không thể mời tài khoản quản trị hệ thống vào gia đình");
        }
        if (familyMemberRepository.existsByUserIdAndFamilyId(invited.getId(), familyId)) {
            throw new ConflictException("Người này đã là thành viên của gia đình");
        }
        if (invitationRepository.existsByFamilyIdAndInvitedUserIdAndStatus(
                familyId, invited.getId(), InvitationStatus.PENDING)) {
            throw new ConflictException("Đã gửi lời mời cho người này, đang chờ phản hồi");
        }

        Invitation invitation = invitationRepository.save(Invitation.builder()
                .family(actor.getFamily())
                .invitedUser(invited)
                .invitedBy(actor.getUser())
                .build());

        return toResponse(invitation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvitationResponse> getMyInvitations(Long userId, InvitationStatus status) {
        return invitationRepository.findByInvitedUserIdAndStatusOrderByCreatedAtDesc(userId, status).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countPendingInvitations(Long userId) {
        return invitationRepository.countByInvitedUserIdAndStatus(userId, InvitationStatus.PENDING);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public InvitationResponse acceptInvitation(Long userId, Long invitationId) {
        Invitation invitation = findPendingForUpdate(userId, invitationId);
        Long familyId = invitation.getFamily().getId();

        if (familyMemberRepository.existsByUserIdAndFamilyId(userId, familyId)) {
            throw new ConflictException("Bạn đã là thành viên của gia đình này");
        }

        familyMemberRepository.save(FamilyMember.builder()
                .user(invitation.getInvitedUser())
                .family(invitation.getFamily())
                .role(FamilyRole.MEMBER)
                .build());
        invitation.setStatus(InvitationStatus.ACCEPTED);

        return toResponse(invitation);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public InvitationResponse declineInvitation(Long userId, Long invitationId) {
        Invitation invitation = findPendingForUpdate(userId, invitationId);
        invitation.setStatus(InvitationStatus.DECLINED);
        return toResponse(invitation);
    }

    /** Lời mời phải gửi cho đúng người dùng này và còn đang chờ. Khóa dòng để bấm hai lần không xử lý hai lần. */
    private Invitation findPendingForUpdate(Long userId, Long invitationId) {
        Invitation invitation = invitationRepository.findForUpdate(invitationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lời mời"));
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ConflictException("Lời mời này đã được xử lý");
        }
        return invitation;
    }

    private InvitationResponse toResponse(Invitation invitation) {
        return InvitationResponse.builder()
                .id(invitation.getId())
                .familyId(invitation.getFamily().getId())
                .familyName(invitation.getFamily().getName())
                .invitedUsername(invitation.getInvitedUser().getUsername())
                .invitedByUsername(invitation.getInvitedBy().getUsername())
                .invitedByFullName(invitation.getInvitedBy().getFullName())
                .status(invitation.getStatus())
                .createdAt(invitation.getCreatedAt())
                .build();
    }
}