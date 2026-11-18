package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.Transaction;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.service.TransactionReceiptService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Cố ý KHÔNG dùng @Transactional cho cả phương thức: việc gọi Cloudinary mất vài giây, nếu nằm trong giao dịch
 * database thì phải giữ kết nối database suốt thời gian đó. Mỗi lệnh repository tự chạy trong giao dịch riêng,
 * và việc ghi đường dẫn là một lệnh UPDATE ngắn chỉ đổi cột receipt_image.
 * Ảnh cũ trên Cloudinary không bị xóa khi thay hoặc bỏ ảnh.
 */
@Service
@RequiredArgsConstructor
public class TransactionReceiptServiceImpl implements TransactionReceiptService {

    private final TransactionRepository transactionRepository;
    private final FamilyAccessChecker accessChecker;
    private final CloudinaryService cloudinaryService;

    @Override
    public String uploadReceipt(Long userId, Long familyId, Long transactionId, MultipartFile file) {
        findEditableTransaction(userId, familyId, transactionId);

        String url = cloudinaryService.upload(file, "receipts/" + familyId);
        saveReceiptUrl(transactionId, familyId, url);
        return url;
    }

    @Override
    public void deleteReceipt(Long userId, Long familyId, Long transactionId) {
        Transaction transaction = findEditableTransaction(userId, familyId, transactionId);
        if (transaction.getReceiptImage() == null) {
            throw new ResourceNotFoundException("Giao dịch này chưa có ảnh hóa đơn");
        }
        saveReceiptUrl(transactionId, familyId, null);
    }

    /**
     * Ghi đường dẫn ảnh (null là bỏ ảnh). Nếu không dòng nào được đổi, tức giao dịch vừa bị xóa trong lúc đang
     * tải ảnh lên, thì báo 404 thay vì báo thành công giả. Ảnh vừa tải lên khi đó thành ảnh mồ côi
     * (xem giới hạn về việc không xóa ảnh trên Cloudinary).
     */
    private void saveReceiptUrl(Long transactionId, Long familyId, String url) {
        if (transactionRepository.updateReceiptImage(transactionId, familyId, url) == 0) {
            throw new ResourceNotFoundException("Không tìm thấy giao dịch");
        }
    }

    /** Giao dịch phải thuộc gia đình, và người dùng phải là người ghi nhận hoặc là quản lý trở lên. */
    private Transaction findEditableTransaction(Long userId, Long familyId, Long transactionId) {
        FamilyMember member = accessChecker.requireMember(userId, familyId);
        Transaction transaction = transactionRepository.findByIdAndFamilyId(transactionId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));

        boolean isRecorder = transaction.getUser().getId().equals(userId);
        if (!isRecorder && !member.getRole().isAtLeast(FamilyRole.MANAGER)) {
            throw new ForbiddenException("Bạn chỉ được thay đổi ảnh hóa đơn của giao dịch do mình ghi nhận");
        }
        return transaction;
    }
}