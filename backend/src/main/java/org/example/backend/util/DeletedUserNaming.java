package org.example.backend.util;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Quy ước đặt tên cho người dùng đã xóa tài khoản.
 * Khi xóa, username và email bị ghi đè bằng giá trị theo id nên không bao giờ trùng nhau,
 * đồng thời giải phóng username và email cũ cho người khác dùng.
 * Các dạng tên này bị chặn khi đăng ký và đổi hồ sơ để không ai chiếm trước.
 */
public final class DeletedUserNaming {

    /** Tên hiển thị thay cho họ tên thật. */
    public static final String DISPLAY_NAME = "Người dùng đã xóa";

    private static final String USERNAME_PREFIX = "deleted_user_";

    /** Tên miền .invalid được dành riêng, không bao giờ là địa chỉ email thật. */
    private static final String EMAIL_DOMAIN = "deleted.invalid";

    // Cột username dùng collation không phân biệt hoa thường nên chặn cả "DELETED_USER_5".
    private static final Pattern RESERVED_USERNAME =
            Pattern.compile("^" + USERNAME_PREFIX + "\\d+$", Pattern.CASE_INSENSITIVE);

    private DeletedUserNaming() {
    }

    public static String username(Long userId) {
        return USERNAME_PREFIX + userId;
    }

    public static String email(Long userId) {
        return "deleted_" + userId + "@" + EMAIL_DOMAIN;
    }

    public static boolean isReservedUsername(String username) {
        return username != null && RESERVED_USERNAME.matcher(username.trim()).matches();
    }

    public static boolean isReservedEmail(String email) {
        return email != null && email.trim().toLowerCase(Locale.ROOT).endsWith("@" + EMAIL_DOMAIN);
    }
}