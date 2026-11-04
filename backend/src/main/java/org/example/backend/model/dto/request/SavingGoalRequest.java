package org.example.backend.model.dto.request;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
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
 * Yêu cầu tạo hoặc sửa mục tiêu tiết kiệm (sửa là thay thế toàn bộ).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SavingGoalRequest {

    @NotBlank(message = "Tên mục tiêu không được để trống")
    @Size(max = 100, message = "Tên mục tiêu tối đa 100 ký tự")
    private String name;

    @NotNull(message = "Số tiền cần đạt không được để trống")
    @Positive(message = "Số tiền cần đạt phải lớn hơn 0")
    @Digits(integer = 17, fraction = 2, message = "Số tiền không hợp lệ")
    private BigDecimal targetAmount;

    /** Ngày dự kiến hoàn thành, có thể để trống. */
    private LocalDate targetDate;
}