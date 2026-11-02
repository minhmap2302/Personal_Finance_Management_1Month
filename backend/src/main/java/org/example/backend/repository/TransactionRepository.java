package org.example.backend.repository;

import org.example.backend.model.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Bản tối thiểu, chỉ có phần cần cho việc xóa gia đình và ảnh hóa đơn.
 * Gộp với repository giao dịch khi viết module giao dịch.
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
