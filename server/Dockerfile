# Stage 1: Build the Spring Boot application
FROM eclipse-temurin:21-jdk-alpine AS build

# Set the working directory
WORKDIR /app

# Copy the Maven wrapper and project object model
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Ensure the wrapper is executable
RUN chmod +x ./mvnw

# Download dependencies offline to leverage Docker caching
RUN ./mvnw dependency:go-offline

# Copy the source code
COPY src/ src/

# Build the application, skipping tests for faster deployment
RUN ./mvnw package -DskipTests

# Stage 2: Serve the application with a slim JRE
FROM eclipse-temurin:21-jre-alpine

# Set the working directory
WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port 8080
EXPOSE 8080

# Start the application
ENTRYPOINT ["java", "-jar", "app.jar"]
