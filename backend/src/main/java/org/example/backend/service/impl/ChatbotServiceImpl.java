package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.ChatMessageRequest;
import org.example.backend.model.dto.response.ChatMessageResponse;
import org.example.backend.model.entity.Budget;
import org.example.backend.model.entity.Category;
import org.example.backend.model.entity.SavingGoal;
import org.example.backend.model.entity.Transaction;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.model.projection.CategorySpent;
import org.example.backend.repository.BudgetRepository;
import org.example.backend.repository.CategoryRepository;
import org.example.backend.repository.SavingGoalRepository;
import org.example.backend.repository.TransactionRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.ChatbotService;
import org.example.backend.service.FamilyAccessChecker;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Triển khai dịch vụ Chatbot AI phân tích chi tiêu tài chính gia đình (Chỉ đọc - Read-Only).
 * - Tuyệt đối không thêm, sửa, xóa dữ liệu.
 * - Chỉ cho phép thành viên thuộc gia đình truy cập (Admin hệ thống không có quyền nếu không phải thành viên).
 * - Tổng hợp dữ liệu thu chi, ngân sách, mục tiêu tiết kiệm trong khoảng thời gian để AI phân tích và đưa ra gợi ý.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotServiceImpl implements ChatbotService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Locale LOCALE_VN = new Locale("vi", "VN");
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final FamilyAccessChecker familyAccessChecker;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final SavingGoalRepository savingGoalRepository;
    private final CategoryRepository categoryRepository;

    @Autowired(required = false)
    private ChatClient chatClient;

    @Value("${spring.ai.openai.chat.options.model:gpt-4o-mini}")
    private String defaultModel;

    @Override
    @Transactional(readOnly = true)
    public ChatMessageResponse chat(Long userId, Long familyId, ChatMessageRequest request) {
        log.info("[CHATBOT] Nhận yêu cầu phân tích tài chính: userId={}, familyId={}", userId, familyId);

        // 1. Kiểm tra quyền của người dùng:
        // Admin hệ thống tuyệt đối KHÔNG có quyền xem dữ liệu qua chatbot
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
        if (user.getRole() == SystemRole.ADMIN) {
            log.warn("[CHATBOT_SECURITY] Admin userId={} bị từ chối truy cập chatbot phân tích gia đình familyId={}", userId, familyId);
            throw new ForbiddenException("Quản trị viên hệ thống (Admin) không có quyền xem dữ liệu tài chính gia đình qua chatbot");
        }

        // BẮT BUỘC phải là thành viên gia đình (nếu không phải, ném 404 để chống dò ID gia đình)
        familyAccessChecker.requireMember(userId, familyId);

        // 2. Xác định khoảng thời gian phân tích
        LocalDate effectiveStart = (request.getStartDate() != null)
                ? request.getStartDate()
                : LocalDate.now(ZONE).withDayOfMonth(1);
        LocalDate effectiveEnd = (request.getEndDate() != null)
                ? request.getEndDate()
                : LocalDate.now(ZONE);

        if (effectiveStart.isAfter(effectiveEnd)) {
            throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc");
        }

        // 3. Kiểm tra cấu hình AI ChatClient
        if (chatClient == null) {
            log.error("[CHATBOT_ERROR] ChatClient chưa được cấu hình. Hãy kiểm tra OPENAI_API_KEY trong .env");
            throw new BadRequestException("Dịch vụ Chatbot AI chưa được kích hoạt hoặc chưa cấu hình API Key. Vui lòng kiểm tra lại cấu hình hệ thống");
        }

        String chosenModel = StringUtils.hasText(request.getModel()) ? request.getModel().trim() : defaultModel;

        // 4. Tổng hợp dữ liệu tài chính gia đình (Read-Only)
        String financialContext = collectFinancialContext(familyId, effectiveStart, effectiveEnd);

        // 5. Xây dựng System Prompt với vai trò chuyên gia tài chính
        String systemPrompt = buildSystemPrompt(financialContext, effectiveStart, effectiveEnd);

        // 6. Gửi câu hỏi và ngữ cảnh đến AI model
        String conversationId = "family-" + familyId + "-user-" + userId;
        log.info("[CHATBOT] Đang gọi OpenAI model='{}' cho conversationId='{}'", chosenModel, conversationId);

        String answer;
        try {
            answer = chatClient.prompt()
                    .system(systemPrompt)
                    .user(request.getMessage())
                    .advisors(advisorSpec -> advisorSpec.param("chat_memory_conversation_id", conversationId))
                    .call()
                    .content();
        } catch (Exception ex) {
            log.error("[CHATBOT_ERROR] Lỗi kết nối hoặc xử lý từ OpenAI: {}", ex.getMessage(), ex);
            throw new IllegalStateException("Không thể kết nối đến dịch vụ AI lúc này: " + ex.getMessage(), ex);
        }

        log.info("[CHATBOT] Đã nhận câu trả lời phân tích thành công cho familyId={}", familyId);

        return ChatMessageResponse.builder()
                .familyId(familyId)
                .provider("OpenAI")
                .model(chosenModel)
                .startDate(effectiveStart)
                .endDate(effectiveEnd)
                .answer(answer)
                .build();
    }

    /**
     * Thu thập dữ liệu tài chính trong khoảng thời gian đã chọn để đưa vào ngữ cảnh AI.
     */
    private String collectFinancialContext(Long familyId, LocalDate startDate, LocalDate endDate) {
        StringBuilder sb = new StringBuilder();
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(LOCALE_VN);

        // 1. Tổng quan Thu - Chi
        BigDecimal totalIncome = zeroIfNull(transactionRepository.sumByType(familyId, CategoryType.INCOME, startDate, endDate));
        BigDecimal totalExpense = zeroIfNull(transactionRepository.sumByType(familyId, CategoryType.EXPENSE, startDate, endDate));
        BigDecimal netBalance = totalIncome.subtract(totalExpense);
        BigDecimal totalSaved = zeroIfNull(savingGoalRepository.sumSavedAmountByFamilyAndDateRange(familyId, startDate, endDate));

        sb.append("--- TỔNG QUAN TÀI CHÍNH KỲ PHÂN TÍCH (")
                .append(startDate).append(" đến ").append(endDate).append(") ---\n");
        sb.append("- Tổng thu nhập: ").append(currencyFormat.format(totalIncome)).append("\n");
        sb.append("- Tổng chi tiêu: ").append(currencyFormat.format(totalExpense)).append("\n");
        sb.append("- Dòng tiền ròng (Thu nhập - Chi tiêu): ").append(currencyFormat.format(netBalance))
                .append(netBalance.compareTo(ZERO) >= 0 ? " (Thặng dư dương)\n" : " (CẢNH BÁO: Bị thâm hụt!)\n");
        sb.append("- Số tiền đã đóng góp vào mục tiêu tiết kiệm: ").append(currencyFormat.format(totalSaved)).append("\n\n");

        // 2. Phân bổ chi tiêu theo từng danh mục
        sb.append("--- CƠ CẤU CHI TIÊU THEO DANH MỤC ---\n");
        List<CategorySpent> entries = budgetRepository.sumExpensesByCategory(familyId, CategoryType.EXPENSE, startDate, endDate);
        if (entries.isEmpty()) {
            sb.append("(Chưa có giao dịch chi tiêu nào trong kỳ này)\n\n");
        } else {
            List<Long> categoryIds = entries.stream().map(CategorySpent::getCategoryId).toList();
            Map<Long, String> categoryNames = categoryRepository.findAllById(categoryIds).stream()
                    .collect(Collectors.toMap(Category::getId, Category::getName));

            for (CategorySpent entry : entries) {
                BigDecimal amount = zeroIfNull(entry.getTotalAmount());
                BigDecimal percent = totalExpense.compareTo(ZERO) > 0
                        ? amount.multiply(HUNDRED).divide(totalExpense, 1, RoundingMode.HALF_UP)
                        : ZERO;
                String name = categoryNames.getOrDefault(entry.getCategoryId(), "Danh mục ID " + entry.getCategoryId());
                sb.append("• ").append(name).append(": ")
                        .append(currencyFormat.format(amount))
                        .append(" (chiếm ").append(percent).append("% tổng chi)\n");
            }
            sb.append("\n");
        }

        // 3. Tình hình Ngân sách và Nguy cơ vượt hạn mức
        sb.append("--- TÌNH HÌNH NGÂN SÁCH & CẢNH BÁO VƯỢT HẠN MỨC ---\n");
        Optional<Budget> currentBudget = budgetRepository.findTotalCoveringDate(familyId, endDate);
        if (currentBudget.isEmpty()) {
            sb.append("(Gia đình chưa thiết lập ngân sách tổng cho kỳ này)\n\n");
        } else {
            Budget total = currentBudget.get();
            BigDecimal spent = zeroIfNull(budgetRepository.sumExpenses(familyId, CategoryType.EXPENSE, total.getStartDate(), total.getEndDate()));
            BigDecimal savedInBudget = zeroIfNull(savingGoalRepository.sumSavedAmountByFamilyAndDateRange(familyId, total.getStartDate(), total.getEndDate()));
            BigDecimal used = spent.add(savedInBudget);
            BigDecimal remaining = total.getAmount().subtract(used);
            BigDecimal usedPercent = total.getAmount().compareTo(ZERO) > 0
                    ? used.multiply(HUNDRED).divide(total.getAmount(), 1, RoundingMode.HALF_UP)
                    : ZERO;

            sb.append("• Ngân sách tổng (").append(total.getStartDate()).append(" đến ").append(total.getEndDate()).append("):\n");
            sb.append("  - Hạn mức ngân sách: ").append(currencyFormat.format(total.getAmount())).append("\n");
            sb.append("  - Đã sử dụng: ").append(currencyFormat.format(used))
                    .append(" (").append(usedPercent).append("%)\n");
            sb.append("  - Còn lại: ").append(currencyFormat.format(remaining)).append("\n");

            if (used.compareTo(total.getAmount()) > 0) {
                sb.append("  => BÁO ĐỘNG ĐỎ: ĐÃ VƯỢT NGÂN SÁCH TỔNG ")
                        .append(currencyFormat.format(used.subtract(total.getAmount()))).append("!\n");
            } else if (usedPercent.compareTo(BigDecimal.valueOf(80)) >= 0) {
                sb.append("  => CẢNH BÁO VÀNG: Đã dùng trên 80% ngân sách tổng!\n");
            } else {
                sb.append("  => Trạng thái an toàn trong ngân sách.\n");
            }

            // Ngân sách con theo danh mục
            List<Budget> subBudgets = budgetRepository.findByParentBudgetIdOrderByIdAsc(total.getId());
            if (!subBudgets.isEmpty()) {
                sb.append("• Chi tiết ngân sách theo hạng mục con:\n");
                for (Budget sub : subBudgets) {
                    BigDecimal subSpent = zeroIfNull(budgetRepository.sumExpensesForCategory(
                            familyId, sub.getCategory().getId(), total.getStartDate(), total.getEndDate()));
                    BigDecimal subPercent = sub.getAmount().compareTo(ZERO) > 0
                            ? subSpent.multiply(HUNDRED).divide(sub.getAmount(), 1, RoundingMode.HALF_UP)
                            : ZERO;

                    sb.append("  - ").append(sub.getCategory().getName()).append(": Hạn mức ")
                            .append(currencyFormat.format(sub.getAmount()))
                            .append(", Đã tiêu ").append(currencyFormat.format(subSpent))
                            .append(" (").append(subPercent).append("%)");

                    if (subSpent.compareTo(sub.getAmount()) > 0) {
                        sb.append(" [NGUY CƠ: ĐÃ VƯỢT HẠN MỨC ").append(currencyFormat.format(subSpent.subtract(sub.getAmount()))).append("!]");
                    } else if (subPercent.compareTo(BigDecimal.valueOf(80)) >= 0) {
                        sb.append(" [CẢNH BÁO: Sắp hết hạn mức (>= 80%)]");
                    }
                    sb.append("\n");
                }
            }
            sb.append("\n");
        }

        // 4. Các mục tiêu tiết kiệm đang theo đuổi
        List<SavingGoal> savingGoals = savingGoalRepository.findByFamilyIdOrderByCreatedAtDesc(familyId);
        if (!savingGoals.isEmpty()) {
            sb.append("--- MỤC TIÊU TIẾT KIỆM GIA ĐÌNH ---\n");
            for (SavingGoal goal : savingGoals) {
                BigDecimal currentSaved = zeroIfNull(savingGoalRepository.sumSavedAmountByGoalId(goal.getId()));
                BigDecimal progress = goal.getTargetAmount().compareTo(ZERO) > 0
                        ? currentSaved.multiply(HUNDRED).divide(goal.getTargetAmount(), 1, RoundingMode.HALF_UP)
                        : ZERO;
                sb.append("• ").append(goal.getName()).append(": Đã gom ")
                        .append(currencyFormat.format(currentSaved)).append(" / ")
                        .append(currencyFormat.format(goal.getTargetAmount()))
                        .append(" (").append(progress).append("%)\n");
            }
            sb.append("\n");
        }

        // 5. Top 5 giao dịch chi tiêu lớn nhất trong kỳ
        List<Transaction> allTransactions = transactionRepository.findAllByFamilyIdAndDateBetween(familyId, startDate, endDate);
        List<Transaction> topExpenses = allTransactions.stream()
                .filter(t -> t.getCategory().getType() == CategoryType.EXPENSE)
                .sorted(Comparator.comparing(Transaction::getAmount).reversed())
                .limit(5)
                .toList();

        if (!topExpenses.isEmpty()) {
            sb.append("--- TOP KHOẢN CHI TIÊU LỚN NHẤT TRONG KỲ ---\n");
            for (Transaction t : topExpenses) {
                sb.append("• ").append(t.getTransactionDate()).append(": ")
                        .append(currencyFormat.format(t.getAmount()))
                        .append(" - ").append(t.getCategory().getName());
                if (StringUtils.hasText(t.getDescription())) {
                    sb.append(" (").append(t.getDescription().trim()).append(")");
                }
                sb.append("\n");
            }
            sb.append("\n");
        }

        return sb.toString();
    }

    /**
     * Xây dựng System Prompt chuẩn mực cho AI với đầy đủ quy tắc Read-Only và định hướng phân tích.
     */
    private String buildSystemPrompt(String financialContext, LocalDate startDate, LocalDate endDate) {
        return """
                Bạn là FinHome AI - Cố vấn tài chính gia đình thông minh và tận tâm của ứng dụng Quản lý tài chính cá nhân & gia đình.
                
                QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ):
                1. CHẾ ĐỘ CHỈ ĐỌC (READ-ONLY): Bạn chỉ có quyền đọc và phân tích dữ liệu được cung cấp dưới đây. Bạn KHÔNG THỂ và KHÔNG ĐƯỢC thêm, sửa, xóa bất kỳ dữ liệu tài chính nào. Nếu người dùng yêu cầu thay đổi dữ liệu, hãy lịch sự từ chối và hướng dẫn họ dùng các chức năng tương ứng trên giao diện ứng dụng.
                2. BẢO MẬT & PHÂN QUYỀN: Dữ liệu dưới đây là dữ liệu duy nhất của gia đình mà người dùng đang là thành viên. Không suy đoán hay tiết lộ dữ liệu của gia đình khác.
                3. NGÔN NGỮ & ĐỊNH DẠNG:
                   - Trả lời bằng tiếng Việt, giọng điệu thân thiện, thấu hiểu, mang tính động viên và chuyên môn cao.
                   - Định dạng câu trả lời bằng Markdown rõ ràng (tiêu đề, gạch đầu dòng, in đậm các con số quan trọng).
                
                DỮ LIỆU TÀI CHÍNH THỰC TẾ ĐƯỢC CUNG CẤP TRONG KỲ (%s ĐẾN %s):
                %s
                
                CẤU TRÚC PHÂN TÍCH VÀ TRẢ LỜI MONG ĐỢI:
                1. Đánh giá tổng quan: Nhận xét dòng tiền (thu so với chi, thặng dư hay thâm hụt ra sao).
                2. Phân tích chi tiết:
                   - Danh mục nào đang ngốn nhiều tiền nhất và chiếm bao nhiêu phần trăm?
                   - Có khoản chi tiêu bất thường hay khoản chi lớn nào đáng lưu ý không?
                3. Đánh giá rủi ro & Ngân sách:
                   - Tình hình ngân sách tổng và các ngân sách hạng mục con (hạng mục nào đang vượt hoặc có nguy cơ vượt hạn mức >= 80%).
                4. Đưa ra gợi ý chi tiêu & Kế hoạch hành động cụ thể:
                   - Đề xuất 3-4 lời khuyên thiết thực, dễ thực hiện để gia đình tối ưu hóa chi tiêu, cắt giảm khoản chưa cần thiết và gia tăng số tiền tích lũy cho các mục tiêu tiết kiệm.
                """.formatted(startDate, endDate, financialContext);
    }

    private BigDecimal zeroIfNull(BigDecimal val) {
        return val != null ? val : ZERO;
    }
}
