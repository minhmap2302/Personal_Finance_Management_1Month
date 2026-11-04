package org.example.backend.service;

import org.example.backend.model.dto.request.SavingContributionRequest;
import org.example.backend.model.dto.response.SavingContributionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Nghiệp vụ khoản đóng góp vào mục tiêu tiết kiệm.
 * Mọi thành viên xem và đóng góp được. Thành viên chỉ sửa, xóa được khoản của mình,
 * quản lý và chủ gia đình sửa, xóa được mọi khoản trong gia đình.
 */
public interface SavingContributionService {

    SavingContributionResponse createContribution(Long userId, Long familyId, Long goalId,
                                                  SavingContributionRequest request);

    /** Lịch sử đóng góp của một mục tiêu: ai đã đóng góp bao nhiêu và khi nào. */
    Page<SavingContributionResponse> getContributions(Long userId, Long familyId, Long goalId, Pageable pageable);

    SavingContributionResponse updateContribution(Long userId, Long familyId, Long goalId, Long contributionId,
                                                  SavingContributionRequest request);

    void deleteContribution(Long userId, Long familyId, Long goalId, Long contributionId);
}