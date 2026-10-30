package org.example.backend.service;

import org.example.backend.model.dto.request.CreateSubBudgetRequest;
import org.example.backend.model.dto.request.CreateTotalBudgetRequest;
import org.example.backend.model.dto.request.UpdateSubBudgetRequest;
import org.example.backend.model.dto.request.UpdateTotalBudgetRequest;
import org.example.backend.model.dto.response.BudgetDetailResponse;
import org.example.backend.model.dto.response.BudgetSummaryResponse;
import org.example.backend.model.dto.response.SubBudgetResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

/**
 * Nghiệp vụ ngân sách của gia đình. Xem: mọi thành viên. Tạo, sửa, xóa: chủ gia đình và quản lý.
 */
public interface BudgetService {

    Page<BudgetSummaryResponse> getBudgets(Long userId, Long familyId, Pageable pageable);

    BudgetDetailResponse getBudget(Long userId, Long familyId, Long budgetId);

    /** Ngân sách tổng bao phủ ngày được chọn, mặc định là hôm nay (giờ Việt Nam). */
    BudgetDetailResponse getCurrentBudget(Long userId, Long familyId, LocalDate date);

    BudgetDetailResponse createTotalBudget(Long userId, Long familyId, CreateTotalBudgetRequest request);

    BudgetDetailResponse updateTotalBudget(Long userId, Long familyId, Long budgetId,
                                           UpdateTotalBudgetRequest request);

    /** Xóa ngân sách tổng sẽ xóa luôn các ngân sách con. */
    void deleteTotalBudget(Long userId, Long familyId, Long budgetId);

    SubBudgetResponse createSubBudget(Long userId, Long familyId, Long totalBudgetId,
                                      CreateSubBudgetRequest request);

    SubBudgetResponse updateSubBudget(Long userId, Long familyId, Long totalBudgetId, Long subBudgetId,
                                      UpdateSubBudgetRequest request);

    void deleteSubBudget(Long userId, Long familyId, Long totalBudgetId, Long subBudgetId);
}