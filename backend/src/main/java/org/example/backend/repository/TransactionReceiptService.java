package org.example.backend.repository;

import org.springframework.web.multipart.MultipartFile;

/**
 * Nghiệp vụ ảnh hóa đơn của giao dịch.
 * Tải lên, thay, xóa: người ghi nhận giao dịch, quản lý và chủ gia đình.
 * Mọi thành viên xem được ảnh qua đường dẫn nằm trong dữ liệu giao dịch.
 */
public interface TransactionReceiptService {

    /** Tải ảnh lên Cloudinary và lưu đường dẫn vào giao dịch, thay đường dẫn cũ nếu đã có. Trả về đường dẫn mới. */
    String uploadReceipt(Long userId, Long familyId, Long transactionId, MultipartFile file);

    /** Bỏ ảnh hóa đơn khỏi giao dịch. */
    void deleteReceipt(Long userId, Long familyId, Long transactionId);
}