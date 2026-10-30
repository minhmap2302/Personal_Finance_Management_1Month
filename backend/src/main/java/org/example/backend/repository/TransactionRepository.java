package org.example.backend.repository;

import org.example.backend.model.entity.Transaction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Bản tối thiểu, chỉ có phần cần cho việc xóa gia đình và ảnh hóa đơn.
 * Gộp với repository giao dịch khi viết module giao dịch.
 */
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    boolean existsByCategoryId(Long categoryId);

    /** Giao dịch của gia đình, kèm người ghi nhận để kiểm tra quyền mà không cần phiên Hibernate còn mở. */
    @EntityGraph(attributePaths = "user")
    Optional<Transaction> findByIdAndFamilyId(Long id, Long familyId);

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