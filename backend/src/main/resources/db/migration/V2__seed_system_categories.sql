-- =====================================================================
-- V2: Danh mục hệ thống mặc định (family_id = NULL).
-- Chỉ admin được thêm, sửa, lưu trữ các danh mục này sau khi hệ thống chạy.
-- =====================================================================
INSERT INTO categories (name, type, family_id, active) VALUES
    ('Food & Dining',      'EXPENSE', NULL, TRUE),
    ('Transportation',     'EXPENSE', NULL, TRUE),
    ('Bills & Utilities',  'EXPENSE', NULL, TRUE),
    ('Entertainment',      'EXPENSE', NULL, TRUE),
    ('Salary',             'INCOME',  NULL, TRUE);