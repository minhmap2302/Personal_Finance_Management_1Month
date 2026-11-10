package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.SavingGoalRequest;
import org.example.backend.model.dto.response.SavingGoalResponse;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.SavingGoal;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.model.enums.SavingGoalStatus;
import org.example.backend.model.projection.GoalSavedAmount;
import org.example.backend.repository.SavingContributionRepository;
import org.example.backend.repository.SavingGoalRepository;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.service.SavingGoalService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ mục tiêu tiết kiệm. Số đã tiết kiệm và tiến độ luôn được tính từ các khoản đóng góp.
 * Trạng thái được lưu nhưng tự khớp với tổng đóng góp: đạt mục tiêu thì COMPLETED, tụt xuống dưới thì quay lại ACTIVE.
 * Mục tiêu CANCELLED chỉ để xem, không đổi nữa.
 * Các thao tác ghi khóa dòng mục tiêu và chạy ở READ_COMMITTED để không lệch trạng thái khi thao tác đồng thời.
 */
@Service
@RequiredArgsConstructor
public class SavingGoalServiceImpl implements SavingGoalService {

    /** Các trường được phép sắp xếp, chặn trường lạ để không gây lỗi 500. */
    private static final Set<String> SORTABLE_FIELDS = Set.of("name", "targetAmount", "targetDate", "createdAt", "id");

    /** Ký tự escape cho LIKE, dùng '!' để tránh rắc rối với dấu gạch chéo ngược trong MySQL. */
    private static final char LIKE_ESCAPE = '!';

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final SavingGoalRepository goalRepository;
    private final SavingContributionRepository contributionRepository;
    private final FamilyAccessChecker accessChecker;

    @Override
    @Transactional
    public SavingGoalResponse createGoal(Long userId, Long familyId, SavingGoalRequest request) {
        FamilyMember member = accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được tạo mục tiêu tiết kiệm");

        SavingGoal goal = goalRepository.save(SavingGoal.builder()
                .family(member.getFamily())
                .createdBy(member.getUser())
                .name(request.getName().trim())
                .targetAmount(request.getTargetAmount())
                .targetDate(request.getTargetDate())
                .build());

        return toResponse(goal, BigDecimal.ZERO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SavingGoalResponse> getGoals(Long userId, Long familyId, String keyword, SavingGoalStatus status,
                                             Pageable pageable) {
        accessChecker.requireMember(userId, familyId);
        validateSort(pageable);

        String normalizedKeyword = keyword == null ? "" : escapeLike(keyword.trim().toLowerCase(Locale.ROOT));
        Page<SavingGoal> goals = goalRepository.search(familyId, status, normalizedKeyword, pageable);

        // Tổng đóng góp của cả trang trong một truy vấn, tránh truy vấn lặp từng mục tiêu.
        Map<Long, BigDecimal> savedByGoal = goals.isEmpty()
                ? Map.of()
                : contributionRepository.sumAmountsBySavingGoalIds(goals.getContent().stream()
                        .map(SavingGoal::getId).toList())
                .stream()
                .collect(Collectors.toMap(GoalSavedAmount::getGoalId, GoalSavedAmount::getTotalAmount));

        return goals.map(goal -> toResponse(goal, savedByGoal.getOrDefault(goal.getId(), BigDecimal.ZERO)));
    }

    @Override
    @Transactional(readOnly = true)
    public SavingGoalResponse getGoal(Long userId, Long familyId, Long goalId) {
        accessChecker.requireMember(userId, familyId);
        SavingGoal goal = goalRepository.findByIdAndFamilyId(goalId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mục tiêu tiết kiệm"));
        return toResponse(goal, savedAmountOf(goal));
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SavingGoalResponse updateGoal(Long userId, Long familyId, Long goalId, SavingGoalRequest request) {
        accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được sửa mục tiêu tiết kiệm");
        SavingGoal goal = lockGoal(familyId, goalId);
        if (goal.getStatus() == SavingGoalStatus.CANCELLED) {
            throw new BadRequestException("Mục tiêu đã hủy, không thể chỉnh sửa");
        }

        goal.setName(request.getName().trim());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setTargetDate(request.getTargetDate());

        // Đổi số tiền cần đạt có thể làm mục tiêu đạt hoặc chưa đạt.
        BigDecimal saved = savedAmountOf(goal);
        goal.setStatus(saved.compareTo(goal.getTargetAmount()) >= 0
                ? SavingGoalStatus.COMPLETED
                : SavingGoalStatus.ACTIVE);

        return toResponse(goal, saved);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteGoal(Long userId, Long familyId, Long goalId) {
        accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được hủy mục tiêu tiết kiệm");
        SavingGoal goal = lockGoal(familyId, goalId);

        if (goal.getStatus() == SavingGoalStatus.CANCELLED) {
            return;
        }
        if (contributionRepository.existsBySavingGoalId(goalId)) {
            goal.setStatus(SavingGoalStatus.CANCELLED);
            return;
        }
        goalRepository.delete(goal);
    }

    // =====================================================================
    // Hàm hỗ trợ
    // =====================================================================

    private SavingGoal lockGoal(Long familyId, Long goalId) {
        return goalRepository.findByIdAndFamilyIdForUpdate(goalId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mục tiêu tiết kiệm"));
    }

    private BigDecimal savedAmountOf(SavingGoal goal) {
        BigDecimal saved = contributionRepository.sumAmountBySavingGoalId(goal.getId());
        return saved != null ? saved : BigDecimal.ZERO;
    }

    private void validateSort(Pageable pageable) {
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new BadRequestException("Không thể sắp xếp theo trường: " + order.getProperty());
            }
        }
    }

    /** Để ký tự % và _ người dùng gõ vào được hiểu là ký tự thường, không phải ký tự đại diện. */
    private String escapeLike(String input) {
        return input
                .replace(String.valueOf(LIKE_ESCAPE), LIKE_ESCAPE + "" + LIKE_ESCAPE)
                .replace("%", LIKE_ESCAPE + "%")
                .replace("_", LIKE_ESCAPE + "_");
    }

    private SavingGoalResponse toResponse(SavingGoal goal, BigDecimal saved) {
        BigDecimal remaining = goal.getTargetAmount().subtract(saved).max(BigDecimal.ZERO);
        // targetAmount luôn lớn hơn 0 (có CHECK ở database).
        BigDecimal percent = saved.multiply(HUNDRED).divide(goal.getTargetAmount(), 2, RoundingMode.HALF_UP);

        return SavingGoalResponse.builder()
                .id(goal.getId())
                .name(goal.getName())
                .targetAmount(goal.getTargetAmount())
                .targetDate(goal.getTargetDate())
                .status(goal.getStatus())
                .savedAmount(saved)
                .remainingAmount(remaining)
                .progressPercent(percent)
                .createdById(goal.getCreatedBy().getId())
                .createdByUsername(goal.getCreatedBy().getUsername())
                .createdByFullName(goal.getCreatedBy().getFullName())
                .createdAt(goal.getCreatedAt())
                .updatedAt(goal.getUpdatedAt())
                .build();
    }
}