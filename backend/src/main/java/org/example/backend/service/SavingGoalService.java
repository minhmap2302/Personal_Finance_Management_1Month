package org.example.backend.service;

import org.example.backend.model.dto.request.SavingGoalRequest;
import org.example.backend.model.dto.response.SavingGoalResponse;
import org.example.backend.model.enums.SavingGoalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Nghiệp vụ mục tiêu tiết kiệm chung của gia đình.
 * Mọi thành viên xem được. Chủ gia đình và quản lý tạo, sửa, hủy.
 */
public interface SavingGoalService {

    SavingGoalResponse createGoal(Long userId, Long familyId, SavingGoalRequest request);

    /** Danh sách mục tiêu của gia đình, tìm theo tên, lọc theo trạng thái, phân trang. */
    Page<SavingGoalResponse> getGoals(Long userId, Long familyId, String keyword, SavingGoalStatus status,
                                      Pageable pageable);

    SavingGoalResponse getGoal(Long userId, Long familyId, Long goalId);

    /** Mục tiêu đã hủy không sửa được. Sửa số tiền cần đạt có thể làm đổi trạng thái ACTIVE/COMPLETED. */
    SavingGoalResponse updateGoal(Long userId, Long familyId, Long goalId, SavingGoalRequest request);

    /** Chưa có khoản đóng góp nào thì xóa cứng, đã có thì chuyển sang CANCELLED để giữ lịch sử. */
    void deleteGoal(Long userId, Long familyId, Long goalId);
}