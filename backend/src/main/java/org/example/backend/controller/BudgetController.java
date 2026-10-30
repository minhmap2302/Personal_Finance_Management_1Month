package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.CreateSubBudgetRequest;
import org.example.backend.model.dto.request.CreateTotalBudgetRequest;
import org.example.backend.model.dto.request.UpdateSubBudgetRequest;
import org.example.backend.model.dto.request.UpdateTotalBudgetRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.BudgetDetailResponse;
import org.example.backend.model.dto.response.BudgetSummaryResponse;
import org.example.backend.model.dto.response.SubBudgetResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.BudgetService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * API ngân sách của gia đình.
 * Xem: mọi thành viên. Tạo, sửa, xóa: chủ gia đình và quản lý.
 */
@RestController
@RequestMapping("/api/v1/families/{familyId}/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    // ------------------------- Ngân sách tổng -------------------------

    /** Danh sách ngân sách tổng, mới nhất trước. */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BudgetSummaryResponse>>> getBudgets(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PageableDefault(size = 12, sort = "startDate", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<BudgetSummaryResponse> data = budgetService.getBudgets(currentUser.getId(), familyId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách ngân sách thành công", data));
    }

    /** Ngân sách tổng đang áp dụng hôm nay, hoặc vào ngày truyền qua tham số date (yyyy-MM-dd). */
    @GetMapping("/current")
    public ResponseEntity<ApiResponse<BudgetDetailResponse>> getCurrentBudget(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        BudgetDetailResponse data = budgetService.getCurrentBudget(currentUser.getId(), familyId, date);
        return ResponseEntity.ok(ApiResponse.success("Lấy ngân sách hiện tại thành công", data));
    }

    @GetMapping("/{budgetId}")
    public ResponseEntity<ApiResponse<BudgetDetailResponse>> getBudget(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long budgetId) {
        BudgetDetailResponse data = budgetService.getBudget(currentUser.getId(), familyId, budgetId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin ngân sách thành công", data));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BudgetDetailResponse>> createTotalBudget(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody CreateTotalBudgetRequest request) {
        BudgetDetailResponse data = budgetService.createTotalBudget(currentUser.getId(), familyId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo ngân sách tổng thành công", data));
    }

    @PutMapping("/{budgetId}")
    public ResponseEntity<ApiResponse<BudgetDetailResponse>> updateTotalBudget(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long budgetId,
            @Valid @RequestBody UpdateTotalBudgetRequest request) {
        BudgetDetailResponse data =
                budgetService.updateTotalBudget(currentUser.getId(), familyId, budgetId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật ngân sách tổng thành công", data));
    }

    /** Xóa ngân sách tổng và toàn bộ ngân sách con của nó. */
    @DeleteMapping("/{budgetId}")
    public ResponseEntity<ApiResponse<Void>> deleteTotalBudget(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long budgetId) {
        budgetService.deleteTotalBudget(currentUser.getId(), familyId, budgetId);
        return ResponseEntity.ok(ApiResponse.success("Xóa ngân sách tổng thành công"));
    }

    // ------------------------- Ngân sách con -------------------------

    @PostMapping("/{budgetId}/sub-budgets")
    public ResponseEntity<ApiResponse<SubBudgetResponse>> createSubBudget(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long budgetId,
            @Valid @RequestBody CreateSubBudgetRequest request) {
        SubBudgetResponse data =
                budgetService.createSubBudget(currentUser.getId(), familyId, budgetId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo ngân sách con thành công", data));
    }

    @PutMapping("/{budgetId}/sub-budgets/{subBudgetId}")
    public ResponseEntity<ApiResponse<SubBudgetResponse>> updateSubBudget(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long budgetId,
            @PathVariable Long subBudgetId,
            @Valid @RequestBody UpdateSubBudgetRequest request) {
        SubBudgetResponse data =
                budgetService.updateSubBudget(currentUser.getId(), familyId, budgetId, subBudgetId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật ngân sách con thành công", data));
    }

    @DeleteMapping("/{budgetId}/sub-budgets/{subBudgetId}")
    public ResponseEntity<ApiResponse<Void>> deleteSubBudget(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long budgetId,
            @PathVariable Long subBudgetId) {
        budgetService.deleteSubBudget(currentUser.getId(), familyId, budgetId, subBudgetId);
        return ResponseEntity.ok(ApiResponse.success("Xóa ngân sách con thành công"));
    }
}