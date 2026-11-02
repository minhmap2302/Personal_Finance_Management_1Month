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
 * Yêu cầu tạo hoặc sửa khoản đóng góp vào mục tiêu tiết kiệm (sửa là thay thế toàn bộ).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SavingContributionRequest {

    @NotNull(message = "Số tiền không được để trống")
    @Positive(message = "Số tiền phải lớn hơn 0")
    @Digits(integer = 17, fraction = 2, message = "Số tiền không hợp lệ")
    private BigDecimal amount;

    @NotNull(message = "Ngày đóng góp không được để trống")
    private LocalDate contributionDate;

    @Size(max = 255, message = "Ghi chú tối đa 255 ký tự")
    private String note;
}