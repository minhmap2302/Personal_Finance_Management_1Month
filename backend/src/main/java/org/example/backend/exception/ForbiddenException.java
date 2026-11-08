package org.example.backend.exception;

/**
 * Người dùng đã đăng nhập nhưng không có quyền thực hiện thao tác (HTTP 403).
 * Cần thêm handler tương ứng vào GlobalExceptionHandler.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}