package org.example.backend.mail;

import org.springframework.mail.javamail.JavaMailSender;

/**
 * Kênh gửi mã OTP đăng ký, dùng tài khoản Gmail của app.mail.otp.*.
 * Là một kiểu riêng để khi inject không cần @Qualifier và không thể lẫn với kênh cảnh báo.
 */
public class OtpMailChannel extends MailChannel {

    public OtpMailChannel(JavaMailSender sender, String fromAddress, String fromName, boolean configured) {
        super("otp", sender, fromAddress, fromName, configured);
    }
}