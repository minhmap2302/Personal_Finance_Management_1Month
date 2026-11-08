package org.example.backend.repository;

import org.example.backend.model.entity.Transaction;
import org.example.backend.model.enums.CategoryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository cho giao dịch của gia đình.
 */
public interface TransactionRepository
        extends JpaRepository<Transaction, Long>, JpaSpecificationExecutor<Transaction> {

    /** Giao dịch của gia đình, kèm người ghi nhận và danh mục. */
    @EntityGraph(attributePaths = {"user", "category"})
    Optional<Transaction> findByIdAndFamilyId(Long id, Long familyId);

    /** Tìm kiếm theo Specification (xem TransactionSpecifications), tải kèm người ghi nhận và danh mục để tránh truy vấn lặp. */
    @Override
    @EntityGraph(attributePaths = {"user", "category"})
    Page<Transaction> findAll(Specification<Transaction> spec, Pageable pageable);

    /** Danh mục đã được giao dịch nào sử dụng chưa (dùng khi xóa danh mục). */
    boolean existsByCategoryId(Long categoryId);

    /** Tổng số tiền giao dịch theo loại danh mục trong khoảng thời gian. */
    @Query("select coalesce(sum(t.amount), 0) from Transaction t "
            + "where t.family.id = :familyId and t.category.type = :type "
            + "and t.transactionDate between :startDate and :endDate")
    BigDecimal sumByType(@Param("familyId") Long familyId,
                         @Param("type") CategoryType type,
                         @Param("startDate") LocalDate startDate,
                         @Param("endDate") LocalDate endDate);

    /** Tất cả giao dịch của gia đình trong khoảng thời gian, lấy kèm danh mục để hiển thị nhanh. */
    @EntityGraph(attributePaths = {"category", "user"})
    @Query("select t from Transaction t where t.family.id = :familyId and t.transactionDate between :startDate and :endDate")
    List<Transaction> findAllByFamilyIdAndDateBetween(@Param("familyId") Long familyId,
                                                     @Param("startDate") LocalDate startDate,
                                                     @Param("endDate") LocalDate endDate);

    /** 10 giao dịch gần nhất của gia đình, sắp xếp theo ngày và id giảm dần. */
    @EntityGraph(attributePaths = {"user", "category"})
    @Query("select t from Transaction t where t.family.id = :familyId order by t.transactionDate desc, t.id desc")
    List<Transaction> findTop10ByFamilyIdOrderByTransactionDateDescIdDesc(@Param("familyId") Long familyId, Pageable pageable);

    default List<Transaction> findTop10ByFamilyIdOrderByTransactionDateDescIdDesc(Long familyId) {
        return findTop10ByFamilyIdOrderByTransactionDateDescIdDesc(familyId, Pageable.ofSize(10));
    }

    /**
     * Chỉ đổi đường dẫn ảnh hóa đơn (null nghĩa là bỏ ảnh), không ghi đè các cột khác.
     * Cột updated_at do MySQL tự cập nhật (ON UPDATE CURRENT_TIMESTAMP).
     */
    @Transactional
    @Modifying
    @Query("update Transaction t set t.receiptImage = :url where t.id = :id")
    int updateReceiptImage(@Param("id") Long id, @Param("url") String url);

    /** Xóa mọi giao dịch của gia đình (bước đầu tiên khi xóa gia đình). */
    @Modifying(flushAutomatically = true)
    @Query("delete from Transaction t where t.family.id = :familyId")
    int deleteAllByFamilyId(@Param("familyId") Long familyId);
}
