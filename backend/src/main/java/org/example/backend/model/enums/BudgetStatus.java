package org.example.backend.model.enums;

/**
 * Mức cảnh báo của một ngân sách theo số tiền đã dùng.
 * - NORMAL: đã dùng dưới 80% giới hạn.
 * - WARNING: đã dùng từ 80% đến hết 100% giới hạn (màu cam).
 * - EXCEEDED: đã dùng vượt 100% giới hạn (màu đỏ).
 */
public enum BudgetStatus {
    NORMAL,
    WARNING,
    EXCEEDED
}