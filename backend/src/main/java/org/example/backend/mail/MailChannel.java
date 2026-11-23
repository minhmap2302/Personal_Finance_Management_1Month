package org.example.backend.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * Một "kênh" gửi email gắn với đúng một tài khoản Gmail (người gửi, mật khẩu và tên hiển thị đi cùng nhau),
 * để không thể gửi nhầm thư OTP bằng tài khoản cảnh báo hoặc ngược lại.
 * Gửi đồng bộ: gọi sẽ chờ SMTP phản hồi (thường 1-3 giây), nơi gọi tự quyết định có chạy @Async hay không.
 */
@Slf4j
@Getter
public abstract class MailChannel {

    private final String name;
    private final JavaMailSender sender;
    private final String fromAddress;
    private final String fromName;
    private final boolean configured;

    protected MailChannel(String name, JavaMailSender sender, String fromAddress, String fromName, boolean configured) {
        this.name = name;
        this.sender = sender;
        this.fromAddress = fromAddress;
        this.fromName = fromName;
        this.configured = configured;
    }

    /**
     * Gửi một email HTML (UTF-8, có dấu tiếng Việt).
     *
     * @throws IllegalStateException nếu kênh chưa có tài khoản hoặc mật khẩu ứng dụng trong .env
     * @throws org.springframework.mail.MailException nếu SMTP từ chối (sai mật khẩu, hết hạn mức ngày, mất kết nối...)
     */
    public void sendHtml(String to, String subject, String htmlBody) {
        if (!configured) {
            throw new IllegalStateException("Kênh email '" + name
                    + "' chưa được cấu hình (thiếu tài khoản hoặc mật khẩu ứng dụng trong .env)");
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            sender.send(message);
            log.info("[MAIL:{}] Đã gửi email tới {}", name, to);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new MailPreparationException("Không soạn được email của kênh '" + name + "'", e);
        }
    }
}