# ─────────────────────────────────────────────
# Stage 1: Build Spring Boot với Gradle Wrapper
# ─────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy gradle wrapper trước để tận dụng Docker layer cache
COPY gradle/ gradle/
COPY gradlew gradlew.bat build.gradle settings.gradle ./

# Cấp quyền thực thi cho gradlew
RUN chmod +x gradlew

# Download dependencies trước (cache layer)
RUN ./gradlew dependencies --no-daemon || true

# Copy source code
COPY src/ src/

# Build, bỏ qua test (test chạy riêng)
RUN ./gradlew bootJar --no-daemon -x test

# ─────────────────────────────────────────────
# Stage 2: Runtime image (nhỏ gọn)
# ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

# Tạo user không phải root để bảo mật
RUN addgroup -S spring && adduser -S spring -G spring

# Copy JAR từ stage builder
COPY --from=builder /app/build/libs/*.jar app.jar

# Chuyển sang user spring
USER spring:spring

# Expose port Spring Boot
EXPOSE 8080

# Chạy app
ENTRYPOINT ["java", "-jar", "app.jar"]
