package org.example.backend.repository;

import org.example.backend.model.entity.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.InvitationStatus;
import org.example.backend.model.enums.SystemRole;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    boolean existsByFamilyIdAndInvitedUserIdAndStatus(Long familyId, Long invitedUserId, InvitationStatus status);

    long countByInvitedUserIdAndStatus(Long invitedUserId, InvitationStatus status);

    @EntityGraph(attributePaths = {"family", "invitedUser", "invitedBy"})
    List<Invitation> findByInvitedUserIdAndStatusOrderByCreatedAtDesc(Long invitedUserId, InvitationStatus status);

    /**
     * Lấy lời mời của chính người dùng và khóa dòng để chấp nhận/từ chối không bị xử lý hai lần
     * khi bấm liên tiếp. Chỉ trả về lời mời gửi cho đúng người dùng này.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invitation i where i.id = :id and i.invitedUser.id = :userId")
    Optional<Invitation> findForUpdate(@Param("id") Long id, @Param("userId") Long userId);

    /** Trong danh sách userIds, những người đã được gia đình mời và đang ở trạng thái status. */
    @Query("select i.invitedUser.id from Invitation i "
            + "where i.family.id = :familyId and i.status = :status and i.invitedUser.id in :userIds")
    List<Long> findInvitedUserIds(@Param("familyId") Long familyId,
                                  @Param("status") InvitationStatus status,
                                  @Param("userIds") Collection<Long> userIds);

    /**
     * Tìm người dùng có thể mời: đang hoạt động, không phải vai trò excludedRole (admin hệ thống)
     * và chưa là thành viên của gia đình. keyword đã được chuyển về chữ thường.
     */
    @Query("select u from User u "
            + "where u.enabled = true and u.role <> :excludedRole "
            + "and lower(u.username) like concat('%', :keyword, '%') "
            + "and u.id not in (select m.user.id from FamilyMember m where m.family.id = :familyId)")
    List<User> searchInvitableUsers(@Param("keyword") String keyword,
                                    @Param("excludedRole") SystemRole excludedRole,
                                    @Param("familyId") Long familyId,
                                    Pageable pageable);
}