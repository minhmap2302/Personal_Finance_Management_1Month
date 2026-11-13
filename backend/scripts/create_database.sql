-- Tạo database cho dự án (chạy lại nhiều lần không lỗi).
-- Docker: file này được mount vào /docker-entrypoint-initdb.d và tự chạy khi MySQL khởi tạo volume mới.
-- Chạy tay: mysql -u root -p < backend/scripts/create_database.sql
-- Tên database phải trùng DB_NAME trong .env (mặc định family_finance_db).
-- Flyway tạo bảng sau khi database đã tồn tại.
CREATE DATABASE IF NOT EXISTS family_finance_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;