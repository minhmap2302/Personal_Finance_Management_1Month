package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.model.dto.request.ChatMessageRequest;
import org.example.backend.model.dto.response.ChatMessageResponse;
import org.example.backend.model.entity.Budget;
import org.example.backend.model.entity.Category;
import org.example.backend.model.entity.Family;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.SavingGoal;
import org.example.backend.model.entity.Transaction;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.CategoryRepository;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.repository.FamilyRepository;
import org.example.backend.repository.SavingGoalRepository;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.ChatbotService;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotServiceImpl implements ChatbotService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyRepository familyRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final SavingGoalRepository savingGoalRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectProvider<ChatClient> chatClientProvider;

    @Value("${application.ai.chat.enabled:true}")
    private boolean chatEnabled;

    @Value("${application.ai.chat.base-url:${OPENAI_BASE_URL:https://api.openai.com/v1}}")
    private String baseUrl;

    @Value("${application.ai.chat.api-key:${OPENAI_API_KEY:}}")
    private String apiKey;

    @Value("${application.ai.chat.model:${OPENAI_MODEL:gpt-4o-mini}}")
    private String model;

    @Override
    @Transactional(readOnly = true)
    public ChatMessageResponse chat(Long userId, Long familyId, ChatMessageRequest request) {
        if (request == null || !StringUtils.hasText(request.getMessage())) {
            throw new BadRequestException("Tin nhắn không được để trống");
        }

        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Người dùng không tồn tại"));

        if (currentUser.getRole() == SystemRole.ADMIN) {
            throw new ForbiddenException("Tài khoản ADMIN không được sử dụng chatbot của gia đình");
        }

        FamilyMember member = familyMemberRepository.findByUserIdAndFamilyId(userId, familyId)
                .orElseThrow(() -> new ForbiddenException("Bạn không thuộc gia đình này"));

        Family family = member.getFamily();
        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now(ZONE).minusDays(30);
        LocalDate endDate = request.getEndDate() != null ? request.getEndDate() : LocalDate.now(ZONE);

        if (startDate.isAfter(endDate)) {
            throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc");
        }

        String context = buildContext(family, familyId, startDate, endDate);
        String answer = callAiAndGetAnswer(userId, familyId, context, request.getMessage(), request.getModel());

        return ChatMessageResponse.builder()
                .familyId(familyId)
                .provider("openai-compatible")
                .model(request.getModel() != null && !request.getModel().isBlank() ? request.getModel() : model)
                .startDate(startDate)
                .endDate(endDate)
                .answer(answer)
                .build();
    }

    private String buildContext(Family family, Long familyId, LocalDate startDate, LocalDate endDate) {
        BigDecimal income = zeroIfNull(transactionRepository.sumByType(familyId, CategoryType.INCOME, startDate, endDate));
        BigDecimal expense = zeroIfNull(transactionRepository.sumByType(familyId, CategoryType.EXPENSE, startDate, endDate));
        BigDecimal net = income.subtract(expense);

        List<Category> allCategories = categoryRepository.findByFamilyIdOrderByNameAsc(familyId);
        List<String> categorySummary = new ArrayList<>();
        for (Category category : allCategories) {
            if (category.getType() == CategoryType.EXPENSE) {
                BigDecimal spent = zeroIfNull(budgetRepository.sumExpensesForCategory(familyId, category.getId(), startDate, endDate));
                if (spent.compareTo(ZERO) > 0) {
                    categorySummary.add(category.getName() + ": " + spent.toPlainString() + " VND");
                }
            }
        }

        Optional<Budget> currentBudget = budgetRepository.findTotalCoveringDate(familyId, LocalDate.now(ZONE));
        String budgetSummary = currentBudget.map(budget -> {
            BigDecimal spent = zeroIfNull(budgetRepository.sumExpenses(familyId, CategoryType.EXPENSE, budget.getStartDate(), budget.getEndDate()));
            BigDecimal saved = zeroIfNull(savingGoalRepository.sumSavedAmountByFamilyAndDateRange(familyId, budget.getStartDate(), budget.getEndDate()));
            BigDecimal used = spent.add(saved);
            BigDecimal remaining = budget.getAmount().subtract(used);
            BigDecimal usedPercent = percent(used, budget.getAmount());
            return "Ngân sách hiện tại: " + budget.getAmount().toPlainString() + " VND; Đã dùng: " + used.toPlainString() + " VND; Còn lại: " + remaining.toPlainString() + " VND; % sử dụng: " + usedPercent.toPlainString() + "%";
        }).orElse("Chưa có ngân sách tổng đang áp dụng");

        List<SavingGoal> goals = savingGoalRepository.findByFamilyIdOrderByCreatedAtDesc(familyId);
        List<String> savingSummary = new ArrayList<>();
        for (SavingGoal goal : goals) {
            BigDecimal savedAmount = zeroIfNull(savingGoalRepository.sumSavedAmountByGoalId(goal.getId()));
            BigDecimal progress = percent(savedAmount, goal.getTargetAmount());
            savingSummary.add(goal.getName() + ": đã tiết kiệm " + savedAmount.toPlainString() + " / " + goal.getTargetAmount() + " (" + progress.toPlainString() + "%)");
        }

        List<Transaction> recent = transactionRepository.findTop10ByFamilyIdOrderByTransactionDateDescIdDesc(familyId);
        List<String> recentSummary = new ArrayList<>();
        for (Transaction tx : recent) {
            recentSummary.add(tx.getTransactionDate() + " - " + tx.getCategory().getName() + " - " + tx.getDescription() + " - " + tx.getAmount().toPlainString() + " VND");
        }

        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("Gia đình: ").append(family.getName()).append("\n");
        contextBuilder.append("Khoảng thời gian: ").append(startDate).append(" đến ").append(endDate).append("\n");
        contextBuilder.append("Tổng thu: ").append(income.toPlainString()).append(" VND\n");
        contextBuilder.append("Tổng chi: ").append(expense.toPlainString()).append(" VND\n");
        contextBuilder.append("Chênh lệch: ").append(net.toPlainString()).append(" VND\n");
        contextBuilder.append("Chi theo danh mục: ").append(String.join("; ", categorySummary.isEmpty() ? List.of("Không có dữ liệu") : categorySummary)).append("\n");
        contextBuilder.append(budgetSummary).append("\n");
        contextBuilder.append("Mục tiêu tiết kiệm: ").append(String.join("; ", savingSummary.isEmpty() ? List.of("Không có dữ liệu") : savingSummary)).append("\n");
        contextBuilder.append("Giao dịch gần đây: ").append(String.join("; ", recentSummary.isEmpty() ? List.of("Không có dữ liệu") : recentSummary)).append("\n");
        contextBuilder.append("Quy tắc: Chỉ trả lời dựa trên dữ liệu trên, không thực hiện hoặc đề xuất thao tác thêm/sửa/xóa dữ liệu.\n");
        return contextBuilder.toString();
    }

    private String callAiAndGetAnswer(Long userId, Long familyId, String context, String userMessage, String requestedModel) {
        if (!chatEnabled || !StringUtils.hasText(apiKey)) {
            return "Chatbot AI chưa được cấu hình. Vui lòng thêm biến môi trường OPENAI_API_KEY và OPENAI_BASE_URL để bật tính năng này.";
        }

        ChatClient chatClient = chatClientProvider.getIfAvailable();
        if (chatClient == null) {
            return "Chatbot AI chưa được kích hoạt vì Spring AI/OpenAI chưa được cấu hình đúng.";
        }

        try {
            String conversationId = "family-" + familyId + "-user-" + userId;
            return chatClient.prompt()
                    .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, conversationId))
                    .system("Bạn là trợ lý tài chính gia đình. Chỉ dùng ngữ cảnh được cung cấp để trả lời. Không thực hiện thao tác thêm/sửa/xóa dữ liệu. Trả lời ngắn gọn, rõ ràng, dễ hiểu, bằng tiếng Việt.")
                    .user("Ngữ cảnh:\n" + context + "\n\nCâu hỏi: " + userMessage)
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("Lỗi khi gọi mô hình AI qua Spring AI", e);
            return "Hệ thống chatbot AI gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.";
        }
    }

    private BigDecimal percent(BigDecimal used, BigDecimal total) {
        if (total == null || total.compareTo(ZERO) <= 0) {
            return ZERO;
        }
        return used.multiply(HUNDRED).divide(total, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : ZERO;
    }
}
