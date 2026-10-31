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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @PutMapping("/{transactionId}")
    public ResponseEntity<ApiResponse<TransactionResponse>> updateTransaction(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long transactionId,
            @Valid @RequestBody UpdateTransactionRequest request) {
        TransactionResponse data =
                transactionService.updateTransaction(currentUser.getId(), familyId, transactionId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật giao dịch thành công", data));
    }

    @DeleteMapping("/{transactionId}")
    public ResponseEntity<ApiResponse<Void>> deleteTransaction(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long transactionId) {
        transactionService.deleteTransaction(currentUser.getId(), familyId, transactionId);
        return ResponseEntity.ok(ApiResponse.success("Xóa giao dịch thành công"));
    }
}