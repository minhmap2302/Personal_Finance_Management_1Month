package org.example.backend.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

/**
 * Tạo hai kênh email, mỗi kênh một kiểu riêng và một tài khoản Gmail riêng:
 * OtpMailChannel (mã xác thực đăng ký) và AlertMailChannel (cảnh báo ngân sách).
 * Nơi dùng chỉ cần inject đúng kiểu, không cần @Qualifier.
 *
 * Không đặt thuộc tính spring.mail.* ở bất kỳ đâu, vì khi đó Spring Boot sẽ tự tạo thêm một JavaMailSender thứ ba.
 * Tài khoản nào chưa điền trong .env thì ứng dụng vẫn khởi động bình thường, kênh đó chỉ từ chối gửi
 * (để mỗi người chạy máy mình chỉ cần tài khoản của mình).
 */
@Slf4j
@Configuration
@EnableConfigurationProperties(AppMailProperties.class)
public class MailConfig {

    private static final String DEFAULT_FROM_NAME = "FinHome";

    @Bean
    public OtpMailChannel otpMailChannel(AppMailProperties props) {
        AppMailProperties.Account account = props.otp();
        warnIfNotConfigured("otp", account);
        return new OtpMailChannel(buildSender(props, account), account.username(),
                fromNameOf(account), account.configured());
    }

    @Bean
    public AlertMailChannel alertMailChannel(AppMailProperties props) {
        AppMailProperties.Account account = props.alert();
        warnIfNotConfigured("alert", account);
        return new AlertMailChannel(buildSender(props, account), account.username(),
                fromNameOf(account), account.configured());
    }

    private JavaMailSenderImpl buildSender(AppMailProperties props, AppMailProperties.Account account) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(props.host());
        sender.setPort(props.port());
        sender.setUsername(account.username());
        sender.setPassword(account.password());
        sender.setDefaultEncoding(StandardCharsets.UTF_8.name());

        // Gmail cổng 587 dùng STARTTLS. Đặt thời gian chờ để một lần gửi lỗi không treo request.
        String timeoutMs = String.valueOf(props.timeout().toMillis());
        Properties smtp = sender.getJavaMailProperties();
        smtp.put("mail.transport.protocol", "smtp");
        smtp.put("mail.smtp.auth", "true");
        smtp.put("mail.smtp.starttls.enable", "true");
        smtp.put("mail.smtp.starttls.required", "true");
        smtp.put("mail.smtp.connectiontimeout", timeoutMs);
        smtp.put("mail.smtp.timeout", timeoutMs);
        smtp.put("mail.smtp.writetimeout", timeoutMs);
        return sender;
    }

    private String fromNameOf(AppMailProperties.Account account) {
        return StringUtils.hasText(account.fromName()) ? account.fromName() : DEFAULT_FROM_NAME;
    }

    private void warnIfNotConfigured(String name, AppMailProperties.Account account) {
        if (!account.configured()) {
            log.warn("[MAIL] Kênh '{}' chưa được cấu hình (thiếu username hoặc app password), kênh này sẽ không gửi được email", name);
        }
    }
}