package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.mail.AlertMailChannel;
import org.example.backend.mail.BudgetAlertEmailBuilder;
import org.example.backend.mail.BudgetAlertEmailBuilder.Content;
import org.example.backend.mail.BudgetAlertEmailBuilder.FamilyAlert;
import org.example.backend.model.dto.response.BudgetDetailResponse;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.BudgetStatus;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.service.BudgetAlertService;
import org.example.backend.service.BudgetService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Cảnh báo ngân sách qua email.
 * - Người nhận: chủ gia đình và quản lý đã bật cảnh báo, tài khoản còn hoạt động và chưa xóa.
 * - Điều kiện: ngân sách tổng bao phủ hôm nay ở mức WARNING (từ 80%) hoặc EXCEEDED (trên 100%).
 * - Số liệu lấy từ BudgetService nên khớp với trang ngân sách.
 *
 * Cố ý KHÔNG đặt @Transactional: đọc dữ liệu xong mới gửi thư, để không giữ kết nối database trong lúc chờ SMTP.
 * Job không nhớ gì giữa các lần chạy, nên khi ngân sách còn ở mức cảnh báo thì mỗi ngày đều có thư.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BudgetAlertServiceImpl implements BudgetAlertService {

    private final FamilyMemberRepository familyMemberRepository;
    private final BudgetRepository budgetRepository;
    private final BudgetService budgetService;
    private final AlertMailChannel alertChannel;
    private final BudgetAlertEmailBuilder emailBuilder;

    @Value("${app.timezone}")
    private String timezone;

    @Override
    public void sendDailyAlerts() {
        if (!alertChannel.isConfigured()) {
            log.warn("[BUDGET_ALERT] Kênh email cảnh báo chưa được cấu hình, bỏ qua lượt chạy này");
            return;
        }

        LocalDate today = LocalDate.now(ZoneId.of(timezone));
        List<FamilyRole> roles = Arrays.stream(FamilyRole.values())
                .filter(role -> role.isAtLeast(FamilyRole.MANAGER))
                .toList();
        List<FamilyMember> recipients = familyMemberRepository.findAlertRecipients(roles);

        // 1. Ngân sách đang ở mức cảnh báo của từng gia đình, mỗi gia đình chỉ tính một lần.
        Map<Long, BudgetDetailResponse> alertingBudgets = new HashMap<>();
        Set<Long> checkedFamilies = new HashSet<>();
        for (FamilyMember member : recipients) {
            Long familyId = member.getFamily().getId();
            if (checkedFamilies.add(familyId)) {
                findAlertingBudget(member.getUser().getId(), familyId, today)
                        .ifPresent(budget -> alertingBudgets.put(familyId, budget));
            }
        }
        if (alertingBudgets.isEmpty()) {
            log.info("[BUDGET_ALERT] Không có gia đình nào cần cảnh báo (đã kiểm tra {} gia đình)", checkedFamilies.size());
            return;
        }

        // 2. Gom theo người nhận: một người quản lý nhiều gia đình chỉ nhận một email.
        Map<Long, User> users = new LinkedHashMap<>();
        Map<Long, List<FamilyAlert>> alertsByUser = new LinkedHashMap<>();
        for (FamilyMember member : recipients) {
            BudgetDetailResponse budget = alertingBudgets.get(member.getFamily().getId());
            User user = member.getUser();
            if (budget == null || !StringUtils.hasText(user.getEmail())) {
                continue;
            }
            users.putIfAbsent(user.getId(), user);
            alertsByUser.computeIfAbsent(user.getId(), id -> new ArrayList<>())
                    .add(new FamilyAlert(member.getFamily().getName(), budget));
        }

        // 3. Gửi. Lỗi của một người chỉ được ghi log, không làm dừng những người còn lại.
        int sent = 0;
        int failed = 0;
        for (Map.Entry<Long, List<FamilyAlert>> entry : alertsByUser.entrySet()) {
            User user = users.get(entry.getKey());
            try {
                String name = StringUtils.hasText(user.getFullName()) ? user.getFullName() : user.getUsername();
                Content content = emailBuilder.build(name, entry.getValue());
                alertChannel.sendHtml(user.getEmail(), content.subject(), content.html());
                sent++;
            } catch (Exception e) {
                failed++;
                log.warn("[BUDGET_ALERT] Không gửi được email cho userId={}: {}", user.getId(), e.getMessage());
            }
        }
        log.info("[BUDGET_ALERT] Xong: {} gia đình cần cảnh báo, gửi thành công {} email, lỗi {}",
                alertingBudgets.size(), sent, failed);
    }

    /** Ngân sách tổng bao phủ hôm nay của gia đình, chỉ khi đang ở mức WARNING hoặc EXCEEDED. */
    private Optional<BudgetDetailResponse> findAlertingBudget(Long userId, Long familyId, LocalDate today) {
        try {
            return budgetRepository.findTotalCoveringDate(familyId, today)
                    .map(total -> budgetService.getBudget(userId, familyId, total.getId()))
                    .filter(detail -> detail.getStatus() != BudgetStatus.NORMAL);
        } catch (Exception e) {
            log.warn("[BUDGET_ALERT] Không đọc được ngân sách của familyId={}: {}", familyId, e.getMessage());
            return Optional.empty();
        }
    }
}