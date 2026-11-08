package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.model.enums.CategoryType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Thông tin một giao dịch. Thu hay chi lấy từ categoryType.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {

    private Long id;

    private Long categoryId;
    private String categoryName;
    private CategoryType categoryType;

    /** Người ghi nhận giao dịch. */
    private Long userId;
    private String username;
    private String userFullName;

    private BigDecimal amount;
    private LocalDate transactionDate;
    private String description;

    /** Đường dẫn ảnh hóa đơn trên Cloudinary, null nếu chưa có. */
    private String receiptImage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}