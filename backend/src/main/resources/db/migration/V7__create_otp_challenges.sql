CREATE TABLE otp_challenges (
                                id                      BIGINT       NOT NULL AUTO_INCREMENT,
                                email                   VARCHAR(100) NOT NULL,
                                purpose                 VARCHAR(30)  NOT NULL,
                                otp_hash                VARCHAR(64)  NOT NULL,
                                reset_token_hash        VARCHAR(64)  NULL,
                                expires_at              DATETIME(6)  NOT NULL,
                                resend_at               DATETIME(6)  NOT NULL,
                                consumed_at             DATETIME(6)  NULL,
                                attempt_count           INT          NOT NULL DEFAULT 0,
                                send_count              INT          NOT NULL DEFAULT 1,
                                registration_username   VARCHAR(50)  NULL,
                                registration_password   VARCHAR(255) NULL,
                                registration_full_name  VARCHAR(100) NULL,
                                created_at              DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                PRIMARY KEY (id),
                                CONSTRAINT ck_otp_purpose CHECK (purpose IN ('REGISTER', 'FORGOT_PASSWORD'))
) ENGINE = InnoDB;

CREATE INDEX idx_otp_email_purpose_created
    ON otp_challenges (email, purpose, created_at);
