package org.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.model.enums.CategoryType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Danh mục thu nhập hoặc chi tiêu (bảng categories).
 * - family = null: danh mục hệ thống, chỉ admin được quản lý.
 * - family != null: danh mục tùy chỉnh của gia đình, chủ gia đình và quản lý được quản lý.
 *
 * Lưu ý: ràng buộc duy nhất cho danh mục hệ thống (family null) cần index hàm trong migration:
 * CREATE UNIQUE INDEX uk_category_family_name_type ON categories ((COALESCE(family_id, 0)), name, type);
 */
@Entity
@Table(
    name = "categories",
    uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_category_family_name_type",
                    columnNames = {"family_id", "name", "type"}
            )
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /** Loại danh mục, không được đổi sau khi đã được sử dụng. */
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private CategoryType type;

    /** Gia đình sở hữu danh mục, null nếu là danh mục hệ thống. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_id")
    private Family family;

    /** false nghĩa là đã lưu trữ: không chọn được cho dữ liệu mới nhưng dữ liệu cũ vẫn giữ nguyên. */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}