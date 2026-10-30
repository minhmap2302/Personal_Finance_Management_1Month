-- =====================================================================
-- V3: Bảng token cho xác thực JWT.
-- - refresh_tokens: refresh token của người dùng (xoay vòng khi làm mới, thu hồi khi đăng xuất).
-- - invalidated_tokens: access token bị vô hiệu hóa khi đăng xuất.
-- Cột token dùng collation utf8mb4_bin vì JWT phân biệt chữ hoa chữ thường;
-- collation mặc định không phân biệt hoa thường sẽ coi hai token khác nhau là trùng.
-- =====================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           BIGINT        NOT NULL AUTO_INCREMENT,
    user_id      BIGINT        NOT NULL,
    token        VARCHAR(512)  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    expiry_date  DATETIME(6)   NOT NULL,
    revoked      BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_refresh_token_token UNIQUE (token),
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX idx_refresh_token_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_token_token ON refresh_tokens (token);
-- Phục vụ việc dọn các refresh token đã hết hạn.
CREATE INDEX idx_refresh_token_expiry ON refresh_tokens (expiry_date);

CREATE TABLE IF NOT EXISTS invalidated_tokens (
    id           VARCHAR(255)  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    expiry_time  DATETIME(6)   NOT NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB;

-- Phục vụ job dọn dẹp token đã quá hạn (DELETE ... WHERE expiry_time < now).
CREATE INDEX idx_invalidated_token_expiry ON invalidated_tokens (expiry_time);