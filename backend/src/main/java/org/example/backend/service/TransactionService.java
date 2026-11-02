package org.example.backend.service;

import org.example.backend.model.dto.request.CreateTransactionRequest;
import org.example.backend.model.dto.request.TransactionSearchRequest;
import org.example.backend.model.dto.request.UpdateTransactionRequest;
import org.example.backend.model.dto.response.TransactionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Nghiệp vụ giao dịch thu chi của gia đình.
 * Mọi thành viên xem và tạo được. Thành viên chỉ sửa, xóa được giao dịch của mình,
 * quản lý và chủ gia đình sửa, xóa được mọi giao dịch trong gia đình.
 */
public interface TransactionService {

    TransactionResponse createTransaction(Long userId, Long familyId, CreateTransactionRequest request);

    TransactionResponse getTransaction(Long userId, Long familyId, Long transactionId);

    /** Lịch sử giao dịch của cả gia đình, có tìm kiếm, lọc theo nhiều điều kiện và phân trang. */
    Page<TransactionResponse> searchTransactions(Long userId, Long familyId, TransactionSearchRequest search,
                                                 Pageable pageable);

    TransactionResponse updateTransaction(Long userId, Long familyId, Long transactionId,
                                          UpdateTransactionRequest request);

    /** Xóa cứng. Ảnh hóa đơn trên Cloudinary không bị xóa theo, chỉ đường dẫn bị bỏ. */
    void deleteTransaction(Long userId, Long familyId, Long transactionId);
}