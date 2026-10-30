package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.backend.model.dto.request.CreateFamilyRequest;
import org.example.backend.model.dto.request.UpdateFamilyRequest;
import org.example.backend.model.dto.response.FamilyResponse;
import org.example.backend.model.entity.Family;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.model.projection.FamilyMemberCount;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.repository.FamilyRepository;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.FamilyAccessChecker;
import org.example.backend.service.FamilyService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ gia đình.
 * "Gia đình đang làm việc" không lưu ở server: ứng dụng gửi familyId trong mỗi yêu cầu.
 */
@Service
@RequiredArgsConstructor
public class FamilyServiceImpl implements FamilyService {

    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;
    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final FamilyAccessChecker accessChecker;

    @Override
    @Transactional
    public FamilyResponse createFamily(Long userId, CreateFamilyRequest request) {
        User user = userRepository.getReferenceById(userId);

        Family family = familyRepository.save(Family.builder()
                .name(request.getName().trim())
                .build());

        familyMemberRepository.save(FamilyMember.builder()
                .user(user)
                .family(family)
                .role(FamilyRole.OWNER)
                .build());

        return toResponse(family, FamilyRole.OWNER, 1L);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FamilyResponse> getMyFamilies(Long userId) {
        List<FamilyMember> memberships = familyMemberRepository.findByUserIdOrderByJoinedAtAsc(userId);
        if (memberships.isEmpty()) {
            return List.of();
        }

        List<Long> familyIds = memberships.stream().map(m -> m.getFamily().getId()).toList();
        Map<Long, Long> memberCounts = familyMemberRepository.countMembersByFamilyIds(familyIds).stream()
                .collect(Collectors.toMap(
                        FamilyMemberCount::getFamilyId,
                        FamilyMemberCount::getMemberCount));

        return memberships.stream()
                .map(m -> toResponse(m.getFamily(), m.getRole(),
                        memberCounts.getOrDefault(m.getFamily().getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FamilyResponse getFamily(Long userId, Long familyId) {
        FamilyMember member = accessChecker.requireMember(userId, familyId);
        return toResponse(member.getFamily(), member.getRole(), familyMemberRepository.countByFamilyId(familyId));
    }

    @Override
    @Transactional
    public FamilyResponse updateFamilyName(Long userId, Long familyId, UpdateFamilyRequest request) {
        FamilyMember member = accessChecker.requireRole(userId, familyId, FamilyRole.MANAGER,
                "Chỉ chủ gia đình và quản lý mới được đổi tên gia đình");

        Family family = member.getFamily();
        family.setName(request.getName().trim());

        return toResponse(family, member.getRole(), familyMemberRepository.countByFamilyId(familyId));
    }

    /**
     * Xóa gia đình theo đúng thứ tự: giao dịch, ngân sách con, ngân sách tổng, rồi gia đình.
     * transactions.category_id và budgets.category_id là RESTRICT nên nếu xóa thẳng gia đình, MySQL sẽ từ chối
     * khi xóa danh mục tùy chỉnh còn đang được tham chiếu. Sau đó thành viên, lời mời, danh mục tùy chỉnh,
     * mục tiêu tiết kiệm và khoản đóng góp tự xóa nhờ ON DELETE CASCADE.
     */
    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteFamily(Long userId, Long familyId) {
        accessChecker.requireRoleWithLock(userId, familyId, FamilyRole.OWNER,
                "Chỉ chủ gia đình mới được xóa gia đình");

        // TODO: khi có phần lưu ảnh hóa đơn, xóa thư mục ảnh của gia đình sau khi giao dịch commit.
        transactionRepository.deleteAllByFamilyId(familyId);
        budgetRepository.deleteSubBudgetsOfFamily(familyId);
        budgetRepository.deleteAllBudgetsOfFamily(familyId);
        familyRepository.deleteById(familyId);
    }

    private FamilyResponse toResponse(Family family, FamilyRole myRole, long memberCount) {
        return FamilyResponse.builder()
                .id(family.getId())
                .name(family.getName())
                .myRole(myRole)
                .memberCount(memberCount)
                .createdAt(family.getCreatedAt())
                .build();
    }
}