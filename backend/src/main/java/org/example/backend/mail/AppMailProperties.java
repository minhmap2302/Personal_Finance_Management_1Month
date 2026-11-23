package org.example.backend.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.StringUtils;

import java.time.Duration;

/**
 * Cấu hình email đọc từ tiền tố app.mail.* trong application.properties.
 * Dùng hai tài khoản Gmail riêng: otp (mã xác thực đăng ký) và alert (cảnh báo ngân sách).
 * Không dùng spring.mail.* vì tiền tố đó của Spring Boot chỉ hỗ trợ một tài khoản.
 */
@ConfigurationProperties(prefix = "app.mail")
public record AppMailProperties(
        @DefaultValue("smtp.gmail.com") String host,
        @DefaultValue("587") int port,
        @DefaultValue("10s") Duration timeout,
        @DefaultValue Account otp,
        @DefaultValue Account alert) {

    /** Một tài khoản Gmail gửi thư. password là Mật khẩu ứng dụng (App Password), không phải mật khẩu đăng nhập. */
    public record Account(String username, String password, @DefaultValue("FinHome") String fromName) {

        /** Có đủ tài khoản và mật khẩu ứng dụng thì mới gửi được. */
        public boolean configured() {
            return StringUtils.hasText(username) && StringUtils.hasText(password);
        }
    }
}