-- =====================================================================
-- V4: Ảnh hóa đơn của giao dịch và index lọc giao dịch theo thành viên.
-- receipt_image lưu đường dẫn (URL https) của ảnh trên Cloudinary, không lưu ảnh trong database.
-- =====================================================================

ALTER TABLE transactions
    ADD COLUMN receipt_image VARCHAR(500) NULL AFTER description;

-- Lọc lịch sử giao dịch của gia đình theo một thành viên.
CREATE INDEX idx_transaction_family_user_date ON transactions (family_id, user_id, transaction_date);