package org.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Giao dịch thu hoặc chi của gia đình (bảng transactions).
 * Số tiền luôn dương, thu hay chi được xác định bởi loại của danh mục.
 */
@Entity
@Table(
    name = "transactions",
    indexes = {
            @Index(name = "idx_transaction_family_date", columnList = "family_id, transaction_date"),
            @Index(name = "idx_transaction_family_category_date", columnList = "family_id, category_id, transaction_date")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Gia đình sở hữu giao dịch. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    /** Người ghi nhận giao dịch (vẫn giữ lại khi người này rời gia đình). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Danh mục hệ thống hoặc danh mục của cùng gia đình, phải đang hoạt động khi tạo mới. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    /** Số tiền theo VND, luôn lớn hơn 0. */
    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "description", length = 255)
    private String description;

    /** Đường dẫn ảnh hóa đơn trên Cloudinary, có thể để trống. */
    @Column(name = "receipt_image", length = 500)
    private String receiptImage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}