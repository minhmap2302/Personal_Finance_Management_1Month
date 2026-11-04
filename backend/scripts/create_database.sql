-- Chạy một lần thủ công trước khi khởi động ứng dụng (Flyway cần database đã tồn tại).
CREATE DATABASE IF NOT EXISTS family_finance_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;