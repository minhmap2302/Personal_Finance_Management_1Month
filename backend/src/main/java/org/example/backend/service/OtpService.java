package org.example.backend.service;

import org.example.backend.model.dto.request.*;
import org.example.backend.model.dto.response.ResetTokenResponse;
import org.example.backend.model.dto.response.UserResponse;

public interface OtpService {
    void requestRegistration(RegisterRequest request);

    UserResponse verifyRegistration(VerifyOtpRequest request);

    void resendRegistration(ResendOtpRequest request);

    void requestPasswordReset(ForgotPasswordRequest request);

    ResetTokenResponse verifyPasswordReset(VerifyOtpRequest request);

    void resetPassword(ResetPasswordRequest request);
}
