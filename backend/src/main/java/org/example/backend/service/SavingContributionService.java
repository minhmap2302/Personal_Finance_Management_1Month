package org.example.backend.service;

import org.example.backend.model.dto.request.SavingContributionRequest;
import org.example.backend.model.dto.response.SavingContributionResponse;

/**
 * Nghiệp vụ khoản đóng góp vào mục tiêu tiết kiệm.
 * Mọi thành viên xem và đóng góp được. Thành viên chỉ sửa, xóa được khoản của mình,
 * quản lý và chủ gia đình sửa, xóa được mọi khoản trong gia đình.
 */
public interface SavingContributionService {

    SavingContributionResponse createContribution(Long userId, Long familyId, Long goalId,
                                                  SavingContributionRequest request);
}