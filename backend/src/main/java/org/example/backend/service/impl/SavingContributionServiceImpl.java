package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.SavingContributionRequest;
import org.example.backend.model.dto.response.SavingContributionResponse;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.SavingContribution;
import org.example.backend.model.entity.SavingGoal;
import org.example.backend.model.enums.SavingGoalStatus;
import org.example.backend.repository.SavingContributionRepository;
import org.example.backend.repository.SavingGoalRepository;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.service.SavingContributionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Nghiệp vụ khoản đóng góp. Khoản đóng góp không phải thu nhập hay chi tiêu, nhưng được tính vào ngân sách tổng
 * (trừ các mục tiêu đã hủy), việc đó do module ngân sách tự tính khi được lấy.
 * Mỗi lần thêm, sửa, xóa khoản đóng góp, trạng thái mục tiêu được cập nhật lại cho khớp với tổng đóng góp.
 * Mục tiêu đã hủy không nhận thay đổi nào, mục tiêu đã hoàn thành không nhận thêm khoản mới nhưng vẫn sửa, xóa được
 * khoản cũ để chữa nhập nhầm.
 */
@Service
@RequiredArgsConstructor
public class SavingContributionServiceImpl implements SavingContributionService {

    private final SavingGoalRepository goalRepository;
    private final SavingContributionRepository contributionRepository;
    private final FamilyAccessChecker accessChecker;

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SavingContributionResponse createContribution(Long userId, Long familyId, Long goalId,
                                                         SavingContributionRequest request) {
        FamilyMember member = accessChecker.requireMember(userId, familyId);
        SavingGoal goal = lockGoal(familyId, goalId);

        if (goal.getStatus() == SavingGoalStatus.CANCELLED) {
            throw new BadRequestException("Mục tiêu đã hủy, không thể đóng góp");
        }
        if (goal.getStatus() == SavingGoalStatus.COMPLETED) {
            throw new BadRequestException("Mục tiêu đã hoàn thành, không thể đóng góp thêm");
        }

        SavingContribution contribution = contributionRepository.save(SavingContribution.builder()
                .savingGoal(goal)
                .user(member.getUser())
                .amount(request.getAmount())
                .contributionDate(request.getContributionDate())
                .note(normalizeNote(request.getNote()))
                .build());

        refreshGoalStatus(goal);
        return toResponse(contribution);
    }

    // =====================================================================
    // Hàm hỗ trợ
    // =====================================================================

    private SavingGoal lockGoal(Long familyId, Long goalId) {
        return goalRepository.findByIdAndFamilyIdForUpdate(goalId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mục tiêu tiết kiệm"));
    }

    /** Cập nhật trạng thái cho khớp tổng đóng góp: đạt mục tiêu thì COMPLETED, chưa đạt thì ACTIVE. */
    private void refreshGoalStatus(SavingGoal goal) {
        BigDecimal saved = contributionRepository.sumAmountBySavingGoalId(goal.getId());
        if (saved == null) {
            saved = BigDecimal.ZERO;
        }
        goal.setStatus(saved.compareTo(goal.getTargetAmount()) >= 0
                ? SavingGoalStatus.COMPLETED
                : SavingGoalStatus.ACTIVE);
    }

    private String normalizeNote(String note) {
        if (note == null || note.isBlank()) {
            return null;
        }
        return note.trim();
    }

    private SavingContributionResponse toResponse(SavingContribution contribution) {
        return SavingContributionResponse.builder()
                .id(contribution.getId())
                .goalId(contribution.getSavingGoal().getId())
                .userId(contribution.getUser().getId())
                .username(contribution.getUser().getUsername())
                .userFullName(contribution.getUser().getFullName())
                .amount(contribution.getAmount())
                .contributionDate(contribution.getContributionDate())
                .note(contribution.getNote())
                .createdAt(contribution.getCreatedAt())
                .updatedAt(contribution.getUpdatedAt())
                .build();
    }
}