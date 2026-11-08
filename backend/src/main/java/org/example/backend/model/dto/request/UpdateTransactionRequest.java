package org.example.backend.model.dto.request;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Yêu cầu sửa giao dịch (thay thế toàn bộ). Ảnh hóa đơn không đổi qua yêu cầu này.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTransactionRequest {

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;

    @NotNull(message = "Số tiền không được để trống")
    @Positive(message = "Số tiền phải lớn hơn 0")
    @Digits(integer = 17, fraction = 2, message = "Số tiền không hợp lệ")
    private BigDecimal amount;

    @NotNull(message = "Ngày giao dịch không được để trống")
    private LocalDate transactionDate;

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    private String description;
}