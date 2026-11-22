package org.example.backend.mail;

import org.springframework.mail.javamail.JavaMailSender;

/**
 * Kênh gửi cảnh báo ngân sách, dùng tài khoản Gmail của app.mail.alert.*.
 * Là một kiểu riêng để khi inject không cần @Qualifier và không thể lẫn với kênh OTP.
 */
public class AlertMailChannel extends MailChannel {

    public AlertMailChannel(JavaMailSender sender, String fromAddress, String fromName, boolean configured) {
        super("alert", sender, fromAddress, fromName, configured);
    }
}