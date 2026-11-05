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

}