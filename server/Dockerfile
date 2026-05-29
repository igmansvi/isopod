# ==============================================================================
# Stage 1: Server Build
# Packages the Spring Boot 3 Java backend into an executable Fat JAR.
# ==============================================================================
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw
RUN ./mvnw dependency:go-offline
COPY src/ src/
RUN ./mvnw package -DskipTests

# ==============================================================================
# Stage 2: Runtime Environment
# Provisions a lightweight JRE 21 alpine image for running the backend.
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
