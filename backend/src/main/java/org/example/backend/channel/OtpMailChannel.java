package org.example.backend.channel;

import org.example.backend.model.enums.OtpPurpose;

public interface OtpMailChannel {
    void sendOtp(String email, String otp, OtpPurpose purpose);
}
