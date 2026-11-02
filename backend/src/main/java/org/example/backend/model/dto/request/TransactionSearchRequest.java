package org.example.backend.model.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.model.enums.CategoryType;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Điều kiện tìm kiếm và lọc giao dịch (tham số query). Điều kiện nào để trống thì bỏ qua.
 */
@Getter
@Setter
@NoArgsConstructor
public class TransactionSearchRequest {

    /** Tìm theo mô tả, không phân biệt hoa thường. */
    private String keyword;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    private Long categoryId;

    /** INCOME hoặc EXPENSE, theo loại của danh mục. */
    private CategoryType type;

    /** Người ghi nhận giao dịch (lọc theo một thành viên). Vẫn lọc được người đã rời gia đình. */
    private Long userId;

    private BigDecimal minAmount;

    private BigDecimal maxAmount;
}