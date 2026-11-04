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

}