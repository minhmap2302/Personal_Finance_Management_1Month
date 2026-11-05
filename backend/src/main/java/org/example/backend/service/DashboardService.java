package org.example.backend.service;

import org.example.backend.model.dto.response.DashboardResponse;

import java.time.LocalDate;

/**
 * Service tổng hợp dữ liệu dashboard cho người dùng.
 * Nhiệm vụ chính là ghép các nguồn dữ liệu như giao dịch, ngân sách, mục tiêu tiết kiệm,
 * rồi trả về DTO duy nhất dùng cho màn hình dashboard.
 */
public interface DashboardService {
    /**
     * Tạo dữ liệu dashboard theo gia đình và khoảng thời gian do client yêu cầu.
     */
    DashboardResponse getDashboard(Long userId, Long familyId, LocalDate startDate, LocalDate endDate);
}
