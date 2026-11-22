package org.example.backend.channel;

import lombok.RequiredArgsConstructor;
import org.example.backend.model.enums.OtpPurpose;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SmtpOtpMailChannel implements OtpMailChannel {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String from;

    @Override
    public void sendOtp(String email, String otp, OtpPurpose purpose) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(purpose == OtpPurpose.REGISTER
                ? "Mã OTP xác minh đăng ký"
                : "Mã OTP đặt lại mật khẩu");
        message.setText("Mã OTP của bạn là: " + otp
                + "\nMã hết hạn sau 10 phút. Không chia sẻ mã này.");
        mailSender.send(message);
    }
}
