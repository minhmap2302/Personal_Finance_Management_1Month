package org.example.backend.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Quy ước đặt tên cho người dùng đã xóa tài khoản.
 * Khi xóa, username và email bị ghi đè bằng giá trị theo id nên không bao giờ trùng nhau,
 * đồng thời giải phóng username và email cũ cho người khác dùng.
 * Các dạng tên này bị chặn khi đăng ký và đổi hồ sơ để không ai chiếm trước.
 *
 * Việc chặn phải so khớp theo cách database so sánh chứ không theo mặt chữ. Cột dùng collation
 * utf8mb4_0900_ai_ci nên "déleted_user_5", "đeleted_user_5" hay "deleted_user_5" có chèn ký tự rộng
 * bằng không (U+200B) đều bằng "deleted_user_5". Nếu chỉ kiểm tra
 * bằng biểu thức chính quy trên chữ gốc thì các dạng đó lọt qua, rồi lệnh ẩn danh hóa vi phạm ràng buộc
 * duy nhất và người dùng đó không xóa được tài khoản.
 */
public final class DeletedUserNaming {

    /** Tên hiển thị thay cho họ tên thật. */
    public static final String DISPLAY_NAME = "Người dùng đã xóa";

    private static final String USERNAME_PREFIX = "deleted_user_";

    /** Tên miền .invalid được dành riêng, không bao giờ là địa chỉ email thật. */
    private static final String EMAIL_DOMAIN = "deleted.invalid";

    /** Áp dụng lên chuỗi đã chuẩn hóa bằng collationKey (chữ thường, không dấu). */
    private static final Pattern RESERVED_USERNAME = Pattern.compile("^" + USERNAME_PREFIX + "\\d+$");

    private DeletedUserNaming() {
    }

    public static String username(Long userId) {
        return USERNAME_PREFIX + userId;
    }

    public static String email(Long userId) {
        return "deleted_" + userId + "@" + EMAIL_DOMAIN;
    }

    public static boolean isReservedUsername(String username) {
        return username != null && RESERVED_USERNAME.matcher(collationKey(username)).matches();
    }

    public static boolean isReservedEmail(String email) {
        return email != null && collationKey(email).endsWith("@" + EMAIL_DOMAIN);
    }

    /**
     * Đưa chuỗi về dạng mà collation utf8mb4_0900_ai_ci coi là bằng nhau, để so khớp với tên bị dành riêng:
     * không phân biệt hoa thường; bỏ dấu (é, ô, ệ...); chữ có gạch ngang mà Unicode không tách được dấu
     * (đ, ð, ł, ŀ) về chữ gốc; dạng tương thích về dạng thường (chữ số và chữ cái rộng toàn phần);
     * bỏ ký tự điều khiển và ký tự định dạng không hiển thị
     * (rộng bằng không, gạch nối mềm...), vì collation bỏ qua chúng khi so sánh.
     *
     * Chưa phủ: chữ số của các hệ chữ khác (Ả Rập, Devanagari...) vì người dùng chủ yếu dùng tiếng Anh và
     * tiếng Việt, cần thì mở rộng sau bằng cách đổi chữ số Unicode về chữ số ASCII; và các dạng hiếm
     * (chữ cái trong vòng tròn hoặc ô vuông, chữ cái đổi dạng ở khối Latin mở rộng...).
     * Cách chắc chắn nhất là chỉ cho phép ký tự ASCII (chữ, số, gạch dưới) trong username và email ngay từ DTO.
     */
    static String collationKey(String input) {
        String s = input.trim().toLowerCase(Locale.ROOT)
                .replace('đ', 'd').replace('ð', 'd')
                .replace('ł', 'l').replace('ŀ', 'l');
        s = Normalizer.normalize(s, Normalizer.Form.NFKD);

        StringBuilder key = new StringBuilder(s.length());
        s.codePoints().forEach(cp -> {
            switch (Character.getType(cp)) {
                case Character.NON_SPACING_MARK,
                     Character.COMBINING_SPACING_MARK,
                     Character.ENCLOSING_MARK,
                     Character.FORMAT,
                     Character.CONTROL -> {
                    // Dấu và ký tự không hiển thị: collation bỏ qua.
                }
                default -> key.appendCodePoint(cp);
            }
        });
        return key.toString();
    }
}