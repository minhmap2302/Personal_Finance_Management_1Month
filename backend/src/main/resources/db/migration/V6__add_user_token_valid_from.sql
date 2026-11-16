-- =====================================================================
-- V6: Mốc thu hồi access token theo từng người dùng.
-- Access token có iat <= tokens_valid_from bị từ chối (null = chưa thu hồi lần nào).
-- Đặt khi khóa tài khoản để token cũ không dùng lại được kể cả sau khi mở khóa.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN tokens_valid_from DATETIME(6) NULL;

-- ---------------------------------------------------------------------
-- Cập nhật dữ liệu có sẵn (V5 và mọi tài khoản đang bị khóa): các tài khoản đang bị khóa
-- (enabled = FALSE, gồm "Vũ Văn Minh" và tài khoản đã xóa) cũng được đặt mốc, giống như
-- khi admin khóa bằng chức năng khóa tài khoản, để token cũ không sống lại khi mở khóa.
--
-- Mốc đặt lùi 1 ngày so với lúc chạy migration (cùng kiểu DATE_SUB như V5) thay vì NOW():
-- MySQL ghi NOW() theo múi giờ của phiên, còn Hibernate đọc Instant theo cấu hình riêng,
-- nên nếu lệch múi giờ mà mốc nằm ở tương lai thì token cấp sau khi mở khóa sẽ bị từ chối
-- oan cho đến khi mốc đó trôi qua. Mốc ở quá khứ thì an toàn với mọi múi giờ.
-- ---------------------------------------------------------------------
UPDATE users
SET tokens_valid_from = DATE_SUB(NOW(6), INTERVAL 1 DAY)
WHERE enabled = FALSE;