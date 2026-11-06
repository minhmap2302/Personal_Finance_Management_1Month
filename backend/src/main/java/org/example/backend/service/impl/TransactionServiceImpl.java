package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.CreateTransactionRequest;
import org.example.backend.model.dto.request.TransactionSearchRequest;
import org.example.backend.model.dto.request.UpdateTransactionRequest;
import org.example.backend.model.dto.response.TransactionResponse;
import org.example.backend.model.entity.Category;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.Transaction;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.repository.CategoryRepository;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.repository.TransactionSpecifications;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.service.TransactionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Nghiệp vụ giao dịch. Giao dịch không gắn với ngân sách nào: ngân sách tự tính số đã dùng từ bảng giao dịch
 * mỗi khi được lấy, nên thêm, sửa, xóa giao dịch ở đây không cần cập nhật gì ở ngân sách.
 */
@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    /** Các trường được phép sắp xếp, chặn trường lạ để không gây lỗi 500. */
    private static final Set<String> SORTABLE_FIELDS = Set.of("transactionDate", "amount", "createdAt", "id");

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final FamilyAccessChecker accessChecker;

    @Override
    @Transactional
    public TransactionResponse createTransaction(Long userId, Long familyId, CreateTransactionRequest request) {
        FamilyMember member = accessChecker.requireMember(userId, familyId);
        Category category = findUsableCategory(familyId, request.getCategoryId());

        Transaction transaction = Transaction.builder()
                .family(member.getFamily())
                .user(member.getUser())
                .category(category)
                .amount(request.getAmount())
                .transactionDate(request.getTransactionDate())
                .description(normalizeDescription(request.getDescription()))
                .build();

        return toResponse(transactionRepository.save(transaction));
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransaction(Long userId, Long familyId, Long transactionId) {
        accessChecker.requireMember(userId, familyId);
        return toResponse(findTransaction(familyId, transactionId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> searchTransactions(Long userId, Long familyId,
                                                        TransactionSearchRequest search, Pageable pageable) {
        accessChecker.requireMember(userId, familyId);
        validateSearch(search);
        validateSort(pageable);

        Specification<Transaction> spec = Specification
                .where(TransactionSpecifications.inFamily(familyId))
                .and(TransactionSpecifications.descriptionContains(search.getKeyword()))
                .and(TransactionSpecifications.dateFrom(search.getStartDate()))
                .and(TransactionSpecifications.dateTo(search.getEndDate()))
                .and(TransactionSpecifications.hasCategory(search.getCategoryId()))
                .and(TransactionSpecifications.hasType(search.getType()))
                .and(TransactionSpecifications.recordedBy(search.getUserId()))
                .and(TransactionSpecifications.amountAtLeast(search.getMinAmount()))
                .and(TransactionSpecifications.amountAtMost(search.getMaxAmount()));

        return transactionRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    public TransactionResponse updateTransaction(Long userId, Long familyId, Long transactionId,
                                                 UpdateTransactionRequest request) {
        FamilyMember member = accessChecker.requireMember(userId, familyId);
        Transaction transaction = findTransaction(familyId, transactionId);
        checkCanModify(member, userId, transaction, "Bạn chỉ được sửa giao dịch do mình ghi nhận");

        // Chỉ kiểm tra danh mục khi đổi sang danh mục khác, để giao dịch cũ vẫn sửa được
        // khi danh mục của nó đã bị lưu trữ.
        if (!transaction.getCategory().getId().equals(request.getCategoryId())) {
            transaction.setCategory(findUsableCategory(familyId, request.getCategoryId()));
        }
        transaction.setAmount(request.getAmount());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setDescription(normalizeDescription(request.getDescription()));

        return toResponse(transaction);
    }

    @Override
    @Transactional
    public void deleteTransaction(Long userId, Long familyId, Long transactionId) {
        FamilyMember member = accessChecker.requireMember(userId, familyId);
        Transaction transaction = findTransaction(familyId, transactionId);
        checkCanModify(member, userId, transaction, "Bạn chỉ được xóa giao dịch do mình ghi nhận");

        transactionRepository.delete(transaction);
    }

    // =====================================================================
    // Kiểm tra
    // =====================================================================

    private Transaction findTransaction(Long familyId, Long transactionId) {
        return transactionRepository.findByIdAndFamilyId(transactionId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch"));
    }

    /** Người ghi nhận giao dịch, quản lý và chủ gia đình được sửa hoặc xóa. */
    private void checkCanModify(FamilyMember member, Long userId, Transaction transaction, String message) {
        boolean isRecorder = transaction.getUser().getId().equals(userId);
        if (!isRecorder && !member.getRole().isAtLeast(FamilyRole.MANAGER)) {
            throw new ForbiddenException(message);
        }
    }

    /**
     * Danh mục dùng cho giao dịch phải là danh mục hệ thống hoặc của chính gia đình, và đang hoạt động.
     * Danh mục của gia đình khác được coi như không tồn tại.
     */
    private Category findUsableCategory(Long familyId, Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục không tồn tại"));

        if (category.getFamily() != null && !category.getFamily().getId().equals(familyId)) {
            throw new ResourceNotFoundException("Danh mục không tồn tại");
        }
        if (!Boolean.TRUE.equals(category.getActive())) {
            throw new BadRequestException("Danh mục đã được lưu trữ, không thể dùng cho giao dịch");
        }
        return category;
    }

    private void validateSearch(TransactionSearchRequest search) {
        if (search.getStartDate() != null && search.getEndDate() != null
                && search.getStartDate().isAfter(search.getEndDate())) {
            throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc");
        }
        if (search.getMinAmount() != null && search.getMaxAmount() != null
                && search.getMinAmount().compareTo(search.getMaxAmount()) > 0) {
            throw new BadRequestException("Số tiền tối thiểu không được lớn hơn số tiền tối đa");
        }
    }

    private void validateSort(Pageable pageable) {
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new BadRequestException("Không thể sắp xếp theo trường: " + order.getProperty());
            }
        }
    }

    // =====================================================================
    // Chuyển đổi
    // =====================================================================

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    private TransactionResponse toResponse(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .categoryId(transaction.getCategory().getId())
                .categoryName(transaction.getCategory().getName())
                .categoryType(transaction.getCategory().getType())
                .userId(transaction.getUser().getId())
                .username(transaction.getUser().getUsername())
                .userFullName(transaction.getUser().getFullName())
                .amount(transaction.getAmount())
                .transactionDate(transaction.getTransactionDate())
                .description(transaction.getDescription())
                .receiptImage(transaction.getReceiptImage())
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .build();
    }
}