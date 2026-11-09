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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Nghiệp vụ lời mời vào gia đình.
 * Người được mời phải đồng ý, không ai bị thêm thẳng vào gia đình.
 */
@Service
@RequiredArgsConstructor
public class InvitationServiceImpl implements InvitationService {

    /** Số ký tự tối thiểu khi tìm người dùng, tránh liệt kê hàng loạt tài khoản. */
    private static final int MIN_SEARCH_LENGTH = 2;

    /** Số kết quả tối đa mỗi trang khi tìm người dùng. */
    private static final int MAX_PAGE_SIZE = 20;

    /** Số kết quả tối đa mỗi trang khi xem lời mời đã gửi. */
    private static final int MAX_SENT_PAGE_SIZE = 50;

    private final InvitationRepository invitationRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final FamilyAccessChecker accessChecker;

    @Override
    @Transactional(readOnly = true)
    public Page<UserSearchResponse> searchUsers(Long userId, Long familyId, String keyword, Pageable pageable) {
        accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được tìm người để mời");

        String normalized = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() < MIN_SEARCH_LENGTH) {
            throw new BadRequestException("Hãy nhập ít nhất " + MIN_SEARCH_LENGTH + " ký tự để tìm kiếm");
        }

        // Luôn sắp theo tên đăng nhập và giới hạn kích thước trang, để không ai liệt kê hàng loạt tài khoản.
        Pageable safePageable = PageRequest.of(pageable.getPageNumber(),
                Math.min(pageable.getPageSize(), MAX_PAGE_SIZE), Sort.by("username"));

        // Bỏ qua tài khoản admin hệ thống (không được vào gia đình), tài khoản bị khóa và người đã là thành viên.
        Page<User> users = invitationRepository.searchInvitableUsers(
                normalized, SystemRole.ADMIN, familyId, safePageable);
        if (users.isEmpty()) {
            return Page.empty(safePageable);
        }

        Set<Long> alreadyInvited = Set.copyOf(invitationRepository.findInvitedUserIds(
                familyId, InvitationStatus.PENDING, users.getContent().stream().map(User::getId).toList()));

        return users.map(u -> UserSearchResponse.builder()
                .userId(u.getId())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .alreadyInvited(alreadyInvited.contains(u.getId()))
                .build());
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public InvitationResponse sendInvitation(Long userId, Long familyId, SendInvitationRequest request) {
        FamilyMember actor = accessChecker.requireRoleWithLock(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được gửi lời mời");

        User invited = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (invited.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng");
        }

        if (!invited.isEnabled()) {
            throw new BadRequestException("Tài khoản này đã bị khóa");
        }

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

    // ---- Phía người gửi ----

    @Override
    @Transactional(readOnly = true)
    public Page<InvitationResponse> getSentInvitations(Long userId, Long familyId, InvitationStatus status,
                                                       Pageable pageable) {
        accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được xem lời mời đã gửi");

        // Mới nhất trước, thêm id để phân trang ổn định khi nhiều lời mời cùng thời điểm tạo.
        Pageable safePageable = PageRequest.of(pageable.getPageNumber(),
                Math.min(pageable.getPageSize(), MAX_SENT_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));

        Page<Invitation> page = status == null
                ? invitationRepository.findByFamilyIdAndInvitedById(familyId, userId, safePageable)
                : invitationRepository.findByFamilyIdAndInvitedByIdAndStatus(familyId, userId, status, safePageable);

        return page.map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public InvitationResponse getSentInvitation(Long userId, Long familyId, Long invitationId) {
        accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được xem lời mời đã gửi");

        // Lời mời của người khác hoặc của gia đình khác được coi như không tồn tại.
        return invitationRepository.findByIdAndFamilyIdAndInvitedById(invitationId, familyId, userId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lời mời"));
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public InvitationResponse cancelInvitation(Long userId, Long familyId, Long invitationId) {
        accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được hủy lời mời");

        Invitation invitation = findSentForUpdate(userId, familyId, invitationId);
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ConflictException("Chỉ hủy được lời mời đang chờ phản hồi");
        }
        invitation.setStatus(InvitationStatus.CANCELLED);
        return toResponse(invitation);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteSentInvitation(Long userId, Long familyId, Long invitationId) {
        accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được xóa lời mời");

        Invitation invitation = findSentForUpdate(userId, familyId, invitationId);
        if (invitation.getStatus() == InvitationStatus.PENDING) {
            throw new ConflictException("Hãy hủy lời mời đang chờ trước khi xóa");
        }
        invitationRepository.delete(invitation);
    }

    /** Lời mời phải do chính người dùng này gửi trong gia đình này. Khóa dòng để tránh đụng độ với chấp nhận/từ chối. */
    private Invitation findSentForUpdate(Long userId, Long familyId, Long invitationId) {
        return invitationRepository.findSentForUpdate(invitationId, familyId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lời mời"));
    }

    // ---- Phía người được mời ----

    @Override
    @Transactional(readOnly = true)
    public List<InvitationResponse> getMyInvitations(Long userId, InvitationStatus status) {
        // Lời mời đã bị người gửi hủy thì người được mời không còn thấy.
        if (status == InvitationStatus.CANCELLED) {
            return List.of();
        }
        return invitationRepository.findByInvitedUserIdAndStatusOrderByCreatedAtDesc(userId, status).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public InvitationResponse getMyInvitation(Long userId, Long invitationId) {
        // Lời mời của người khác, hoặc đã bị hủy, được coi như không tồn tại.
        return invitationRepository.findByIdAndInvitedUserId(invitationId, userId)
                .filter(i -> i.getStatus() != InvitationStatus.CANCELLED)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lời mời"));
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
        // Lời mời đã hủy thì người được mời coi như không có.
        if (invitation.getStatus() == InvitationStatus.CANCELLED) {
            throw new ResourceNotFoundException("Không tìm thấy lời mời");
        }
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