package org.example.backend.util;

import org.example.backend.exception.BadRequestException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.Set;

/**
 * Giới hạn cách sắp xếp và kích thước trang mà client được phép yêu cầu.
 * Trường sắp xếp lạ trả 400 (thay vì lọt xuống JPA rồi thành 500), kích thước trang bị chặn trên,
 * và luôn thêm id làm tiêu chí phụ để phân trang ổn định khi nhiều dòng cùng giá trị sắp xếp.
 */
public final class PageableSanitizer {

    private PageableSanitizer() {
    }

    public static Pageable sanitize(Pageable pageable, Set<String> allowedSorts, int maxSize) {
        for (Sort.Order order : pageable.getSort()) {
            if (!allowedSorts.contains(order.getProperty())) {
                throw new BadRequestException("Không hỗ trợ sắp xếp theo '" + order.getProperty() + "'");
            }
        }
        Sort sort = pageable.getSort();
        if (sort.getOrderFor("id") == null) {
            sort = sort.and(Sort.by("id"));
        }
        return PageRequest.of(pageable.getPageNumber(), Math.min(pageable.getPageSize(), maxSize), sort);
    }
}