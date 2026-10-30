package org.example.backend.service;

import org.example.backend.model.dto.request.SendInvitationRequest;
import org.example.backend.model.dto.response.InvitationResponse;
import org.example.backend.model.dto.response.UserSearchResponse;
import org.example.backend.model.enums.InvitationStatus;

import java.util.List;

/**
 * Nghiệp vụ lời mời vào gia đình.
 */
public interface InvitationService {

    /** Chủ gia đình và quản lý tìm người dùng theo tên đăng nhập để mời. */
    List<UserSearchResponse> searchUsers(Long userId, Long familyId, String keyword);

    /** Chủ gia đình và quản lý gửi lời mời. */
    InvitationResponse sendInvitation(Long userId, Long familyId, SendInvitationRequest request);

    /** Lời mời gửi cho chính người dùng, theo trạng thái, mới nhất trước. */
    List<InvitationResponse> getMyInvitations(Long userId, InvitationStatus status);

    /** Số lời mời đang chờ, dùng cho chấm đỏ thông báo. */
    long countPendingInvitations(Long userId);

    /** Chấp nhận: người dùng trở thành MEMBER của gia đình. */
    InvitationResponse acceptInvitation(Long userId, Long invitationId);

    InvitationResponse declineInvitation(Long userId, Long invitationId);
}