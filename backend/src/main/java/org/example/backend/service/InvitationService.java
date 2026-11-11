package org.example.backend.service;

import org.example.backend.model.dto.request.SendInvitationRequest;
import org.example.backend.model.dto.response.InvitationResponse;
import org.example.backend.model.dto.response.UserSearchResponse;
import org.example.backend.model.enums.InvitationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Nghiệp vụ lời mời vào gia đình.
 */
public interface InvitationService {

    /**
     * Chủ gia đình và quản lý tìm người dùng theo tên đăng nhập để mời, có phân trang.
     * Luôn sắp theo tên đăng nhập, kích thước trang bị giới hạn.
     */
    Page<UserSearchResponse> searchUsers(Long userId, Long familyId, String keyword, Pageable pageable);

    /** Chủ gia đình và quản lý gửi lời mời. */
    InvitationResponse sendInvitation(Long userId, Long familyId, SendInvitationRequest request);

    /** Lời mời gửi cho chính người dùng, theo trạng thái, mới nhất trước. */
    List<InvitationResponse> getMyInvitations(Long userId, InvitationStatus status);

    /** Chi tiết một lời mời gửi cho chính người dùng. */
    InvitationResponse getMyInvitation(Long userId, Long invitationId);

    /** Số lời mời đang chờ, dùng cho chấm đỏ thông báo. */
    long countPendingInvitations(Long userId);

    /** Chấp nhận: người dùng trở thành MEMBER của gia đình. */
    InvitationResponse acceptInvitation(Long userId, Long invitationId);

    InvitationResponse declineInvitation(Long userId, Long invitationId);

    /** Lời mời do chính người dùng gửi trong gia đình (OWNER, MANAGER), phân trang, mới nhất trước. */
    Page<InvitationResponse> getSentInvitations(Long userId, Long familyId, InvitationStatus status, Pageable pageable);

    /** Chi tiết một lời mời do chính người dùng gửi. */
    InvitationResponse getSentInvitation(Long userId, Long familyId, Long invitationId);

    /** Hủy lời mời đang chờ (PENDING -> CANCELLED). */
    InvitationResponse cancelInvitation(Long userId, Long familyId, Long invitationId);

    /** Xóa hẳn lời mời đã xử lý hoặc đã hủy. Lời mời đang chờ phải hủy trước. */
    void deleteSentInvitation(Long userId, Long familyId, Long invitationId);

}