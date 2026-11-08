package org.example.backend.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Bảng lưu trữ Access Token bị vô hiệu hóa khi người dùng đăng xuất (bảng invalidated_tokens).
 * Đảm bảo Access Token đã logout không thể tái sử dụng dù chưa đến hạn hết hạn tự nhiên.
 * Khóa chính (id) là JWT ID (jti) hoặc chuỗi token.
 */
@Entity
@Table(name = "invalidated_tokens")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvalidatedToken {

    /** JWT ID (jti) hoặc chuỗi token được vô hiệu hóa khi logout. */
    @Id
    @Column(name = "id", nullable = false, length = 255)
    private String id;

    /** Thời điểm hết hạn của token, dùng cho cron job dọn dẹp các token đã quá hạn. */
    @Column(name = "expiry_time", nullable = false)
    private Instant expiryTime;
}
