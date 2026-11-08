package org.example.backend.repository;

import org.example.backend.model.entity.Transaction;
import org.example.backend.model.enums.CategoryType;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Locale;

/**
 * Các điều kiện lọc giao dịch. Mỗi hàm là một điều kiện nhỏ, trả về null khi không có giá trị
 * (nghĩa là bỏ qua điều kiện đó) để ghép tùy ý bằng Specification.where(...).and(...).
 * Riêng inFamily luôn được áp dụng để mọi truy vấn đều nằm trong phạm vi một gia đình.
 */
public class TransactionSpecifications {

    /** Ký tự escape cho LIKE, dùng '!' để tránh rắc rối với dấu gạch chéo ngược trong MySQL. */
    private static final char LIKE_ESCAPE = '!';

    private TransactionSpecifications() {
    }

    /** Luôn áp dụng, không bao giờ trả về null. */
    public static Specification<Transaction> inFamily(Long familyId) {
        return (root, query, cb) -> cb.equal(root.get("family").get("id"), familyId);
    }

    /** Tìm theo mô tả, không phân biệt hoa thường. Ký tự % và _ người dùng gõ được hiểu là ký tự thường. */
    public static Specification<Transaction> descriptionContains(String keyword) {
        return (root, query, cb) -> (keyword == null || keyword.isBlank())
                ? null
                : cb.like(cb.lower(root.get("description")),
                "%" + escapeLike(keyword.trim().toLowerCase(Locale.ROOT)) + "%", LIKE_ESCAPE);
    }

    public static Specification<Transaction> dateFrom(LocalDate date) {
        return (root, query, cb) -> date == null
                ? null
                : cb.greaterThanOrEqualTo(root.get("transactionDate"), date);
    }

    public static Specification<Transaction> dateTo(LocalDate date) {
        return (root, query, cb) -> date == null
                ? null
                : cb.lessThanOrEqualTo(root.get("transactionDate"), date);
    }

    public static Specification<Transaction> hasCategory(Long categoryId) {
        return (root, query, cb) -> categoryId == null
                ? null
                : cb.equal(root.get("category").get("id"), categoryId);
    }

    /** Thu hay chi, theo loại của danh mục. */
    public static Specification<Transaction> hasType(CategoryType type) {
        return (root, query, cb) -> type == null
                ? null
                : cb.equal(root.get("category").get("type"), type);
    }

    /** Người ghi nhận giao dịch. Không kiểm tra người đó còn là thành viên, để vẫn lọc được người đã rời gia đình. */
    public static Specification<Transaction> recordedBy(Long userId) {
        return (root, query, cb) -> userId == null
                ? null
                : cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Transaction> amountAtLeast(BigDecimal amount) {
        return (root, query, cb) -> amount == null
                ? null
                : cb.greaterThanOrEqualTo(root.get("amount"), amount);
    }

    public static Specification<Transaction> amountAtMost(BigDecimal amount) {
        return (root, query, cb) -> amount == null
                ? null
                : cb.lessThanOrEqualTo(root.get("amount"), amount);
    }

    private static String escapeLike(String input) {
        return input
                .replace(String.valueOf(LIKE_ESCAPE), LIKE_ESCAPE + "" + LIKE_ESCAPE)
                .replace("%", LIKE_ESCAPE + "%")
                .replace("_", LIKE_ESCAPE + "_");
    }
}