package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.exception.UnauthorizedException;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.DashboardResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Controller tổng quan dashboard của người dùng theo từng gia đình đang được chọn.
 * Mỗi gia đình có thể có nhiều thành viên và người dùng có thể chuyển qua lại giữa các gia đình.
 * Endpoint này phục vụ màn hình dashboard tổng hợp: thu chi, ngân sách, mục tiêu tiết kiệm, giao dịch gần đây.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * Lấy dữ liệu dashboard của gia đình đang chọn theo khoảng thời gian tùy chọn.
     * Nếu không truyền startDate/endDate, dùng mặc định từ đầu tháng đến hôm nay.
     */
    @GetMapping("/families/{familyId}/dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (currentUser == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập");
        }

        DashboardResponse data = dashboardService.getDashboard(currentUser.getId(), familyId, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success("Lấy tổng quan dashboard thành công", data));
    }
}
