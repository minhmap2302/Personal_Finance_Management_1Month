package org.example.backend.model.projection;

import java.math.BigDecimal;

/** Kết quả gom nhóm chi tiêu theo danh mục. */
public interface CategorySpent {
    Long getCategoryId();

    BigDecimal getTotalAmount();
}