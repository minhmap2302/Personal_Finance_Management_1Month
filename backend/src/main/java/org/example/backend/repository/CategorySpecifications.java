package org.example.backend.repository;

import org.example.backend.model.entity.Category;
import org.example.backend.model.enums.CategoryType;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

/**
 * Các điều kiện lọc danh mục, ghép bằng Specification.where(...).and(...).
 * Khi không có giá trị để lọc, mỗi hàm trả về điều kiện "không lọc gì" (không trả null),
 * vì Specification.and(null) ném IllegalArgumentException ở các bản Spring Data mới.
 */
public final class CategorySpecifications {

    /** Ký tự escape cho LIKE, dùng '!' (như TransactionSpecifications) để tránh rắc rối với dấu gạch chéo ngược trong MySQL. */
    private static final char LIKE_ESCAPE = '!';

    private CategorySpecifications() {
    }

    /** Điều kiện luôn đúng, dùng khi không có gì để lọc. */
    private static Specification<Category> all() {
        return (root, query, cb) -> cb.conjunction();
    }

    /**
     * Danh mục hệ thống, cộng thêm danh mục của gia đình nếu có familyId.
     * familyId = null (admin) chỉ trả danh mục hệ thống. Điều kiện này luôn được áp dụng.
     */
    public static Specification<Category> visibleTo(Long familyId) {
        return (root, query, cb) -> familyId == null
                ? cb.isNull(root.get("family"))
                : cb.or(cb.isNull(root.get("family")),
                cb.equal(root.get("family").get("id"), familyId));
    }

    /** Tên chứa từ khóa, không phân biệt hoa thường. Ký tự %, _ và ! người dùng gõ được hiểu là ký tự thường. */
    public static Specification<Category> nameContains(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return all();
        }
        String pattern = "%" + escapeLike(keyword.toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("name")), pattern, LIKE_ESCAPE);
    }

    public static Specification<Category> hasType(CategoryType type) {
        if (type == null) {
            return all();
        }
        return (root, query, cb) -> cb.equal(root.get("type"), type);
    }

    /** Mặc định chỉ lấy danh mục đang hoạt động, includeArchived = true thì lấy cả danh mục đã lưu trữ. */
    public static Specification<Category> activeOnly(boolean includeArchived) {
        if (includeArchived) {
            return all();
        }
        return (root, query, cb) -> cb.isTrue(root.<Boolean>get("active"));
    }

    private static String escapeLike(String value) {
        return value
                .replace(String.valueOf(LIKE_ESCAPE), LIKE_ESCAPE + "" + LIKE_ESCAPE)
                .replace("%", LIKE_ESCAPE + "%")
                .replace("_", LIKE_ESCAPE + "_");
    }
}