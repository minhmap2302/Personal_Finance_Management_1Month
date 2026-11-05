package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.CreateTransactionRequest;
import org.example.backend.model.dto.request.TransactionSearchRequest;
import org.example.backend.model.dto.request.UpdateTransactionRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.TransactionResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.TransactionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * API giao dịch của gia đình. Ảnh hóa đơn nằm ở TransactionReceiptController.
 */
@RestController
@RequestMapping("/api/v1/families/{familyId}/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    public ResponseEntity<ApiResponse<TransactionResponse>> createTransaction(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody CreateTransactionRequest request) {
        TransactionResponse data = transactionService.createTransaction(currentUser.getId(), familyId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo giao dịch thành công", data));
    }

    /**
     * Lịch sử giao dịch của gia đình, mới nhất trước.
     * Lọc bằng tham số: keyword, startDate, endDate (yyyy-MM-dd), categoryId, type, userId, minAmount, maxAmount.
     * Sắp xếp được theo transactionDate, amount, createdAt, id.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> searchTransactions(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @ModelAttribute TransactionSearchRequest search,
            @PageableDefault(size = 20, sort = {"transactionDate", "id"}, direction = Sort.Direction.DESC)
            Pageable pageable) {
        Page<TransactionResponse> data =
                transactionService.searchTransactions(currentUser.getId(), familyId, search, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách giao dịch thành công", data));
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<ApiResponse<TransactionResponse>> getTransaction(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long transactionId) {
        TransactionResponse data = transactionService.getTransaction(currentUser.getId(), familyId, transactionId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin giao dịch thành công", data));
    }
}