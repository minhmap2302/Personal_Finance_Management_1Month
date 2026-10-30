package org.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;

/**
 * Quản lý Refresh Token của người dùng (bảng refresh_tokens).
 * Hỗ trợ duy trì phiên đăng nhập (Refresh Token Rotation) và thu hồi phiên khi logout.
 */
@Entity
@Table(
    name = "refresh_tokens",
    uniqueConstraints = {
            @UniqueConstraint(name = "uk_refresh_token_token", columnNames = {"token"})
    },
    indexes = {
            @Index(name = "idx_refresh_token_user", columnList = "user_id"),
            @Index(name = "idx_refresh_token_token", columnList = "token")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Người dùng sở hữu refresh token này. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Chuỗi refresh token duy nhất. */
    @Column(name = "token", nullable = false, length = 512)
    private String token;

    /** Thời điểm hết hạn của refresh token. */
    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

    /** Đã bị thu hồi / đăng xuất hay chưa (true khi logout hoặc khi token rotation). */
    @Column(name = "revoked", nullable = false)
    @Builder.Default
    private boolean revoked = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
