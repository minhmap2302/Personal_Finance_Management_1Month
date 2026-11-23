-- V7: cho phép người dùng bật/tắt cảnh báo ngân sách qua email, mặc định tắt
-- (tài khoản mẫu có email giả nên không được tự động nhận thư).
ALTER TABLE users
    ADD COLUMN email_alert_enabled BOOLEAN NOT NULL DEFAULT FALSE;