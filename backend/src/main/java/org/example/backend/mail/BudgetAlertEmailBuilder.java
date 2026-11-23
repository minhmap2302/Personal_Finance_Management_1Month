package org.example.backend.mail;

import org.example.backend.model.dto.response.BudgetDetailResponse;
import org.example.backend.model.dto.response.SubBudgetResponse;
import org.example.backend.model.enums.BudgetStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Soạn nội dung email cảnh báo ngân sách (HTML, CSS viết thẳng vào thẻ vì các ứng dụng thư không đọc stylesheet).
 * Mọi văn bản do người dùng nhập (tên gia đình, tên danh mục, họ tên) đều được escape HTML.
 */
@Component
public class BudgetAlertEmailBuilder {

    private static final Locale LOCALE_VN = new Locale("vi", "VN");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String RED = "#b91c1c";
    private static final String ORANGE = "#b45309";

    /** Ngân sách đang ở mức cảnh báo của một gia đình. */
    public record FamilyAlert(String familyName, BudgetDetailResponse budget) {
    }

    public record Content(String subject, String html) {
    }

    public Content build(String recipientName, List<FamilyAlert> alerts) {
        NumberFormat money = NumberFormat.getCurrencyInstance(LOCALE_VN);

        // Gia đình đã vượt hạn mức lên trước, cùng nhóm thì theo tên.
        List<FamilyAlert> sorted = alerts.stream()
                .sorted(Comparator.comparing((FamilyAlert a) -> a.budget().getStatus() != BudgetStatus.EXCEEDED)
                        .thenComparing(FamilyAlert::familyName))
                .toList();

        boolean anyExceeded = sorted.stream().anyMatch(a -> a.budget().getStatus() == BudgetStatus.EXCEEDED);
        String subject = anyExceeded
                ? "[FinHome] Ngân sách gia đình đã vượt hạn mức"
                : "[FinHome] Ngân sách gia đình sắp đạt hạn mức";

        StringBuilder sb = new StringBuilder();
        sb.append("<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.5\">");
        sb.append("<p>Xin chào <b>").append(esc(recipientName)).append("</b>,</p>");
        sb.append("<p>Đây là cảnh báo ngân sách hằng ngày từ FinHome. ")
                .append(sorted.size() == 1
                        ? "Ngân sách tổng hiện tại của gia đình bạn cần được chú ý:"
                        : "Ngân sách tổng hiện tại của một số gia đình bạn quản lý cần được chú ý:")
                .append("</p>");

        for (FamilyAlert alert : sorted) {
            appendFamily(sb, money, alert);
        }

        sb.append("<p style=\"color:#6b7280;font-size:12px\">")
                .append("Email này được gửi mỗi ngày trong lúc ngân sách còn ở mức cảnh báo. ")
                .append("Bạn nhận được vì đã bật cảnh báo ngân sách qua email (dành cho chủ gia đình và quản lý). ")
                .append("Có thể tắt trong phần hồ sơ cá nhân.")
                .append("</p></div>");
        return new Content(subject, sb.toString());
    }

    private void appendFamily(StringBuilder sb, NumberFormat money, FamilyAlert alert) {
        BudgetDetailResponse b = alert.budget();
        boolean exceeded = b.getStatus() == BudgetStatus.EXCEEDED;
        String color = exceeded ? RED : ORANGE;
        String label = exceeded ? "ĐÃ VƯỢT HẠN MỨC" : "SẮP ĐẠT HẠN MỨC (từ 80%)";
        String percent = b.getUsedPercent().setScale(1, RoundingMode.HALF_UP).toPlainString();

        sb.append("<div style=\"border:1px solid #e5e7eb;border-left:4px solid ").append(color)
                .append(";border-radius:8px;padding:16px;margin:16px 0\">");
        sb.append("<h3 style=\"margin:0 0 4px\">").append(esc(alert.familyName())).append("</h3>");
        sb.append("<p style=\"margin:0 0 4px;color:").append(color).append(";font-weight:bold\">")
                .append(label).append(" - đã dùng ").append(percent).append("%</p>");
        sb.append("<p style=\"margin:0 0 12px;color:#6b7280\">Kỳ ngân sách: ")
                .append(b.getStartDate().format(DATE)).append(" - ").append(b.getEndDate().format(DATE))
                .append("</p>");

        sb.append("<table style=\"width:100%;border-collapse:collapse\">");
        row(sb, "Hạn mức", money.format(b.getAmount()), null);
        row(sb, "Đã chi tiêu", money.format(b.getSpent()), null);
        row(sb, "Đã đóng góp tiết kiệm", money.format(b.getSaved()), null);
        row(sb, "Đã sử dụng (chi tiêu + tiết kiệm)", money.format(b.getUsed()), null);
        row(sb, "Còn lại", money.format(b.getRemaining()), b.getRemaining().signum() < 0 ? RED : null);
        sb.append("</table>");

        // Vượt kế hoạch chỉ vì cộng thêm tiền tiết kiệm: nói rõ để người nhận không hiểu nhầm là chi tiêu quá tay.
        if (exceeded && b.getSpent().compareTo(b.getAmount()) <= 0) {
            sb.append("<p style=\"margin:12px 0 0;color:#6b7280\">")
                    .append("Chi tiêu chưa vượt hạn mức, nhưng cộng thêm tiền đã đóng góp tiết kiệm thì tổng đã vượt kế hoạch.")
                    .append("</p>");
        }

        List<SubBudgetResponse> subs = b.getSubBudgets() == null ? List.of() : b.getSubBudgets();
        List<SubBudgetResponse> hot = subs.stream().filter(s -> s.getStatus() != BudgetStatus.NORMAL).toList();
        if (!hot.isEmpty()) {
            sb.append("<p style=\"margin:12px 0 4px\"><b>Ngân sách theo danh mục cần chú ý:</b></p>");
            sb.append("<ul style=\"margin:0;padding-left:20px\">");
            for (SubBudgetResponse s : hot) {
                boolean over = s.getStatus() == BudgetStatus.EXCEEDED;
                sb.append("<li>").append(esc(s.getCategoryName())).append(": ")
                        .append(money.format(s.getSpent())).append(" / ").append(money.format(s.getAmount()))
                        .append(" (").append(s.getUsedPercent().setScale(1, RoundingMode.HALF_UP).toPlainString())
                        .append("%) - ").append(over ? "vượt hạn mức" : "sắp hết hạn mức").append("</li>");
            }
            sb.append("</ul>");
        }
        sb.append("</div>");
    }

    private void row(StringBuilder sb, String label, String value, String valueColor) {
        sb.append("<tr><td style=\"padding:4px 0;color:#4b5563\">").append(label).append("</td>")
                .append("<td style=\"padding:4px 0;text-align:right;font-weight:bold")
                .append(valueColor != null ? ";color:" + valueColor : "")
                .append("\">").append(value).append("</td></tr>");
    }

    private String esc(String text) {
        return HtmlUtils.htmlEscape(text == null ? "" : text);
    }
}