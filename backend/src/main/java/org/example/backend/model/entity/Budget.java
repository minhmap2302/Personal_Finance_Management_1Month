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
 * Ngân sách của gia đình theo khoảng thời gian tùy chọn (bảng budgets).
 * - Ngân sách tổng: category = null và parentBudget = null.
 * - Ngân sách con: category và parentBudget đều có giá trị, lấy từ ngân sách tổng.
 *
 * Các ngân sách tổng của cùng một gia đình không được chồng lấn khoảng thời gian
 * (kiểm tra ở tầng service). Ngân sách con dùng khoảng thời gian của ngân sách tổng.
 */
@Entity
@Table(
    name = "budgets",
    uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_budget_parent_category",
                    columnNames = {"parent_budget_id", "category_id"}
            )
    },
    indexes = {
            @Index(name = "idx_budget_family_dates", columnList = "family_id, start_date, end_date")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Gia đình sở hữu ngân sách. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    /** Danh mục chi tiêu (phải là EXPENSE), null nếu là ngân sách tổng. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    /** Ngân sách tổng chứa ngân sách con này, null nếu bản thân là ngân sách tổng. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_budget_id")
    private Budget parentBudget;

    /** Ngày bắt đầu (bao gồm). */
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** Ngày kết thúc (bao gồm), không được trước ngày bắt đầu. */
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /** Giới hạn chi theo VND, luôn lớn hơn 0. Vượt giới hạn vẫn được phép nhưng sẽ cảnh báo. */
    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}