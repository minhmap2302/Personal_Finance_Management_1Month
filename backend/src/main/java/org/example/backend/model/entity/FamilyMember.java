package org.example.backend.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.model.enums.FamilyRole;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Thành viên của gia đình (bảng family_members).
 * Bảng trung gian giữa users và families, lưu vai trò của người dùng trong từng gia đình.
 * Mỗi người dùng chỉ có một bản ghi trong mỗi gia đình.
 */
@Entity
@Table(
    name = "family_members",
    uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_family_member_user_family",
                    columnNames = {"user_id", "family_id"}
            )
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "family_id", nullable = false)
    private Family family;

    /** Vai trò trong gia đình (OWNER, MANAGER, MEMBER). Mỗi gia đình chỉ có một OWNER. */
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    @Builder.Default
    private FamilyRole role = FamilyRole.MEMBER;

    /** Thời điểm tham gia gia đình. */
    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}