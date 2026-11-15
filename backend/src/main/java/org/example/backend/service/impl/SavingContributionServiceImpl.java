package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.SavingContributionRequest;
import org.example.backend.model.dto.response.SavingContributionResponse;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.SavingContribution;
import org.example.backend.model.entity.SavingGoal;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.model.enums.SavingGoalStatus;
import org.example.backend.repository.SavingContributionRepository;
import org.example.backend.repository.SavingGoalRepository;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.service.SavingContributionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;

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

    private static final Set<String> SORTABLE_FIELDS = Set.of("contributionDate", "amount", "createdAt", "id");

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

    @Override
    @Transactional(readOnly = true)
    public Page<SavingContributionResponse> getContributions(Long userId, Long familyId, Long goalId,
                                                             Pageable pageable) {
        accessChecker.requireMember(userId, familyId);
        if (!goalRepository.existsByIdAndFamilyId(goalId, familyId)) {
            throw new ResourceNotFoundException("Không tìm thấy mục tiêu tiết kiệm");
        }
        validateSort(pageable);

        return contributionRepository.findBySavingGoalId(goalId, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SavingContributionResponse updateContribution(Long userId, Long familyId, Long goalId,
                                                         Long contributionId, SavingContributionRequest request) {
        FamilyMember member = accessChecker.requireMember(userId, familyId);
        SavingGoal goal = lockGoal(familyId, goalId);
        requireNotCancelled(goal);

        SavingContribution contribution = findContribution(goalId, contributionId);
        checkCanModify(member, userId, contribution, "Bạn chỉ được sửa khoản đóng góp của mình");

        contribution.setAmount(request.getAmount());
        contribution.setContributionDate(request.getContributionDate());
        contribution.setNote(normalizeNote(request.getNote()));

        refreshGoalStatus(goal);
        return toResponse(contribution);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteContribution(Long userId, Long familyId, Long goalId, Long contributionId) {
        FamilyMember member = accessChecker.requireMember(userId, familyId);
        SavingGoal goal = lockGoal(familyId, goalId);
        requireNotCancelled(goal);

        SavingContribution contribution = findContribution(goalId, contributionId);
        checkCanModify(member, userId, contribution, "Bạn chỉ được xóa khoản đóng góp của mình");

        contributionRepository.delete(contribution);
        refreshGoalStatus(goal);
    }

    // =====================================================================
    // Hàm hỗ trợ
    // =====================================================================

    private SavingGoal lockGoal(Long familyId, Long goalId) {
        return goalRepository.findByIdAndFamilyIdForUpdate(goalId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mục tiêu tiết kiệm"));
    }

    private SavingContribution findContribution(Long goalId, Long contributionId) {
        return contributionRepository.findByIdAndSavingGoalId(contributionId, goalId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khoản đóng góp"));
    }

    private void requireNotCancelled(SavingGoal goal) {
        if (goal.getStatus() == SavingGoalStatus.CANCELLED) {
            throw new BadRequestException("Mục tiêu đã hủy, không thể thay đổi khoản đóng góp");
        }
    }

    /** Người đóng góp, quản lý và chủ gia đình được sửa hoặc xóa. */
    private void checkCanModify(FamilyMember member, Long userId, SavingContribution contribution, String message) {
        boolean isContributor = contribution.getUser().getId().equals(userId);
        if (!isContributor && !member.getRole().isAtLeast(FamilyRole.MANAGER)) {
            throw new ForbiddenException(message);
        }
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

    private void validateSort(Pageable pageable) {
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new BadRequestException("Không thể sắp xếp theo trường: " + order.getProperty());
            }
        }
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