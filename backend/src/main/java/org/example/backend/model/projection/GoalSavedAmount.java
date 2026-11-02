package org.example.backend.model.projection;

import java.math.BigDecimal;

/**
 * Tổng số tiền đã đóng góp cho một mục tiêu tiết kiệm.
 */
public interface GoalSavedAmount {

    Long getGoalId();

    BigDecimal getTotalAmount();
}