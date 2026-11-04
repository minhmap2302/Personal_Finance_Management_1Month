# ---------- Giai đoạn 1: build ----------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy file cấu hình Gradle trước để tận dụng cache
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
# Sửa xuống dòng kiểu Windows (CRLF) nếu có, tránh lỗi "bad interpreter"
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

COPY src ./src
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon bootJar -x test

# ---------- Giai đoạn 2: chạy ----------
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --system --no-create-home appuser
COPY --from=build /app/build/libs/*.jar app.jar
USER appuser

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]