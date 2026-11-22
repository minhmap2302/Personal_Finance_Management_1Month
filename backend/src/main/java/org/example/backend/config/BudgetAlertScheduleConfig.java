package org.example.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.service.BudgetAlertService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.support.CronTrigger;

import java.time.DateTimeException;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

/**
 * Lên lịch gửi cảnh báo ngân sách mỗi ngày vào giờ app.budget-alert.time (HH:mm, mặc định 07:00) theo múi giờ app.timezone.
 * Giá trị giờ sai định dạng làm ứng dụng không khởi động, thay vì lặng lẽ không bao giờ chạy.
 * Nếu ứng dụng tắt đúng giờ đó thì bỏ qua ngày hôm đó (không chạy bù). Giả định chỉ chạy một bản ứng dụng,
 * chạy nhiều bản sẽ gửi trùng.
 */
@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class BudgetAlertScheduleConfig implements SchedulingConfigurer {

    private final BudgetAlertService budgetAlertService;

    @Value("${app.budget-alert.time:07:00}")
    private String time;

    @Value("${app.timezone}")
    private String timezone;

    @Override
    public void configureTasks(ScheduledTaskRegistrar registrar) {
        LocalTime at = parseTime(time);
        ZoneId zone = parseZone(timezone);
        // Spring cron: giây phút giờ ngày tháng thứ
        String cron = "0 " + at.getMinute() + " " + at.getHour() + " * * *";
        registrar.addTriggerTask(this::runSafely, new CronTrigger(cron, zone));
        log.info("[BUDGET_ALERT] Đã lên lịch gửi cảnh báo ngân sách lúc {} mỗi ngày (múi giờ {})", at, zone);
    }

    private void runSafely() {
        try {
            budgetAlertService.sendDailyAlerts();
        } catch (Exception e) {
            log.error("[BUDGET_ALERT] Lượt chạy bị lỗi: {}", e.getMessage(), e);
        }
    }

    private LocalTime parseTime(String value) {
        try {
            return LocalTime.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalStateException(
                    "BUDGET_ALERT_TIME không hợp lệ: '" + value + "'. Dùng định dạng HH:mm, ví dụ 07:00", e);
        }
    }

    private ZoneId parseZone(String value) {
        try {
            return ZoneId.of(value.trim());
        } catch (DateTimeException e) {
            throw new IllegalStateException("app.timezone (TZ) không hợp lệ: '" + value + "'", e);
        }
    }
}