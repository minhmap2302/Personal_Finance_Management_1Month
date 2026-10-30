package org.example.backend.service;

import org.example.backend.model.dto.request.TransferOwnershipRequest;
import org.example.backend.model.dto.request.UpdateMemberRoleRequest;
import org.example.backend.model.dto.response.FamilyMemberResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Nghiệp vụ thành viên trong gia đình: danh sách, đổi vai trò, xóa, rời đi, chuyển quyền chủ.
 */
public interface FamilyMemberService {

    /** Mọi thành viên xem được. keyword tìm theo tên đăng nhập hoặc họ tên, để trống là lấy tất cả. */
    Page<FamilyMemberResponse> getMembers(Long userId, Long familyId, String keyword, Pageable pageable);

    /** Chỉ chủ gia đình: nâng thành viên lên MANAGER hoặc hạ xuống MEMBER. */
    FamilyMemberResponse updateMemberRole(Long userId, Long familyId, Long targetUserId,
                                          UpdateMemberRoleRequest request);

    /** Chủ gia đình và quản lý, chỉ xóa được người có cấp bậc thấp hơn mình. */
    void removeMember(Long userId, Long familyId, Long targetUserId);

    /** Thành viên và quản lý tự rời. Chủ gia đình phải chuyển quyền trước. */
    void leaveFamily(Long userId, Long familyId);

    /** Chỉ chủ gia đình. Chủ cũ trở thành MANAGER. */
    void transferOwnership(Long userId, Long familyId, TransferOwnershipRequest request);
}