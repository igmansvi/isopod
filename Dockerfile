# ==============================================================================
# Isopod All-in-One Distribution Dockerfile
#
# This multi-stage build creates the definitive, self-contained production image
# for the Isopod platform. It compiles the Angular client, packages the Spring
# Boot server, and bundles them alongside Nginx, PostgreSQL, and Redis within
# a single Ubuntu container orchestrated by Supervisord.
# ==============================================================================

# ==============================================================================
# Stage 1: Client Build
# Compiles the Angular Standalone Application for production distribution.
# ==============================================================================
FROM node:lts-alpine AS client-build
WORKDIR /build
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build -- --configuration=production

# ==============================================================================
# Stage 2: Server Build
# Packages the Spring Boot 3 Java backend into an executable Fat JAR.
# ==============================================================================
FROM eclipse-temurin:21-jdk-alpine AS server-build
WORKDIR /build
COPY server/.mvn/ .mvn/
COPY server/mvnw server/pom.xml ./
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline
COPY server/src/ src/
RUN ./mvnw package -DskipTests

# ==============================================================================
# Stage 3: Docker CLI Extraction
# Extracts the raw Docker binary to enable DOOD socket communication.
# ==============================================================================
FROM docker:cli AS docker-cli

# ==============================================================================
# Stage 4: Production Runtime Environment
# Base Ubuntu image hosting all internal orchestrated services.
# ==============================================================================
FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive

# ==============================================================================
# Infrastructure Provisioning
# Installs PostgreSQL, Redis, Nginx, and Supervisord.
# ==============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    redis-server \
    nginx \
    supervisor \
    wget \
    apt-transport-https \
    gpg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ==============================================================================
# Java Runtime Provisioning
# Installs Eclipse Temurin JRE 21 via the official Adoptium repository.
# ==============================================================================
RUN wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public \
    | gpg --dearmor | tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null \
    && echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" \
    | tee /etc/apt/sources.list.d/adoptium.list \
    && apt-get update && apt-get install -y --no-install-recommends temurin-21-jre \
    && apt-get purge -y wget apt-transport-https gpg \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# ==============================================================================
# Binary & Artifact Aggregation
# Injects the Docker CLI, built Client assets, and packaged Server JAR.
# ==============================================================================
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

RUN PG_BIN=$(find /usr/lib/postgresql -name "bin" -type d | head -1) \
    && ln -sf ${PG_BIN}/* /usr/local/bin/ \
    && rm -rf /var/lib/postgresql/*

COPY --from=client-build /build/dist/client/browser/ /app/client/
COPY --from=server-build /build/target/*.jar /app/server/app.jar

# ==============================================================================
# Configuration Injection
# Mounts the configurations for Nginx, Supervisord, and the startup Entrypoint.
# ==============================================================================
COPY nginx/isopod.nginx.conf /etc/nginx/nginx.conf
COPY supervisor/isopod.conf /etc/supervisor/conf.d/isopod.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ==============================================================================
# Volume & Port Declarations
# Initializes necessary directories and exposes the public Nginx gateway.
# ==============================================================================
RUN mkdir -p /data/postgresql /data/redis /workspaces

VOLUME /workspaces

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
