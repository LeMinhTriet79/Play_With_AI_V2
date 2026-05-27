# Bước 1: Build file .jar
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
# Copy pom.xml và source code vào để build
COPY pom.xml .
COPY src ./src
# Chạy lệnh build (bỏ qua test cho nhanh)
RUN mvn clean package -DskipTests

# Bước 2: Chạy ứng dụng
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Copy file .jar đã build từ bước 1 sang
COPY --from=build /app/target/*.jar app.jar
# Mở port 8080
EXPOSE 8080
# Lệnh khởi chạy Spring Boot
ENTRYPOINT ["java", "-jar", "app.jar"]