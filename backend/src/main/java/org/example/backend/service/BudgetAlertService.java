package org.example.backend.service;

/**
 * Cảnh báo ngân sách qua email.
 */
public interface BudgetAlertService {

    /**
     * Chạy một lượt cảnh báo: với mỗi gia đình có ngân sách tổng bao phủ hôm nay đang ở mức WARNING hoặc EXCEEDED,
     * gửi email cho chủ gia đình và quản lý đã bật cảnh báo. Mỗi người nhận đúng một email gộp mọi gia đình của họ.
     * Lỗi gửi cho một người không làm dừng lượt chạy.
     */
    void sendDailyAlerts();
}