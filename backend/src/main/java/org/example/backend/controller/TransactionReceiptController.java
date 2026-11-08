package org.example.backend.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.entity.User;
import org.example.backend.service.TransactionReceiptService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API ảnh hóa đơn của giao dịch. Đường dẫn ảnh được trả về trong dữ liệu giao dịch (trường receiptImage).
 */
@RestController
@RequestMapping("/api/v1/families/{familyId}/transactions/{transactionId}/receipt")
@RequiredArgsConstructor
public class TransactionReceiptController {

    private final TransactionReceiptService receiptService;

    /** Tải lên hoặc thay ảnh hóa đơn (multipart/form-data, phần "file"). Trả về đường dẫn ảnh. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadReceipt(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long transactionId,
            @RequestParam MultipartFile file) {
        String url = receiptService.uploadReceipt(currentUser.getId(), familyId, transactionId, file);
        return ResponseEntity.ok(ApiResponse.success("Tải ảnh hóa đơn thành công", url));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteReceipt(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @PathVariable Long transactionId) {
        receiptService.deleteReceipt(currentUser.getId(), familyId, transactionId);
        return ResponseEntity.ok(ApiResponse.success("Xóa ảnh hóa đơn thành công"));
    }
}