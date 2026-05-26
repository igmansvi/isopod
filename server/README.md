# Isopod Backend (Server)

The backend module of the Isopod platform, built with **Spring Boot 3** and **Java 21**. It serves as the orchestrator for Docker container lifecycle management, provides secure REST APIs, and acts as a WebSocket bridge for interactive terminal sessions.

## 🏗️ Folder Structure

The backend follows a strict Domain-Driven Design (DDD) package structure:

```text
src/main/java/com/isopod/server/
├── core/                       # Cross-cutting concerns
│   ├── config/                 # Application & Security configurations
│   ├── exception/              # Global exception handling (@RestControllerAdvice)
│   ├── security/               # JWT Filters, Authentication Providers, Security Chains
│   └── websocket/              # WebSocket registry and xterm.js TTY handlers
│
└── domain/                     # Business logic domains
    ├── auth/                   # Registration, Login, and Auth DTOs
    ├── environment/            # Docker provisioning, start/stop logic
    └── file/                   # Host-to-Container bind mount file management
```

## 🚀 Technologies Used

- **Framework:** [Spring Boot 3](https://spring.io/projects/spring-boot)
- **Language:** [Java 21](https://adoptium.net/)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (via [Hibernate/Spring Data JPA](https://hibernate.org/))
- **Security:** [Spring Security 6](https://spring.io/projects/spring-security) + Stateless [JWT](https://jwt.io/)
- **Docker:** [`docker-java`](https://github.com/docker-java/docker-java) library for native daemon communication
- **Build Tool:** [Maven](https://maven.apache.org/)
- **Development:** [Spring Boot DevTools](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/#using.devtools) for rapid hot-reloading and development cycle acceleration.

## 📡 API Documentation

All REST APIs are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
- `POST /register`
  - Body: `{ "username": "...", "password": "..." }`
  - Returns: `{ "token": "..." }`
- `POST /login`
  - Body: `{ "username": "...", "password": "..." }`
  - Returns: `{ "token": "..." }`

### Users (`/api/users`) *[Protected]*
- `DELETE /me`
  - Performs a cascading deletion of the user account, PostgreSQL environments, Docker containers, and physical workspace directories.

### Health (`/api/health`) *[Public]*
- `GET /`
  - Returns real-time system telemetry including Spring Boot status, Docker daemon availability, and a `cachedImages` list used by the frontend for dynamic environment templating.
  - *Note: On server boot, the `HealthService` `CommandLineRunner` automatically validates Docker health and caches essential images (`ubuntu`, `node`, `gcc`, `eclipse-temurin`).*

### Environments (`/api/environments`) *[Protected]*
- `GET /`
  - Returns: `List<Environment>`
- `POST /`
  - Body: `{ "name": "workspace-1", "image": "node:latest" }`
  - Returns: `Environment`
- `POST /{id}/start`
  - Starts the Docker container and mounts volumes.
- `POST /{id}/stop`
  - Stops the running Docker container.
- `DELETE /{id}`
  - Permanently removes the environment and its data.

### Files (`/api/files`) *[Protected]*
- `GET /` (`?envId=X&path=Y&action=read|list`)
  - Returns file contents or directory listings.
- `POST /`
  - Writes data directly to a file (creates or overwrites).
- `POST /dir`
  - Provisions a new empty directory in the workspace.
- `DELETE /` (`?envId=X&path=Y`)
  - Recursively and permanently deletes a file or directory.

### WebSockets (`/ws/terminal`) *[Protected via JWT URL Param]*
- `WS /ws/terminal?envId={id}&token={jwt}`
  - Establishes a bidirectional binary/text stream connecting the frontend `xterm.js` to the Docker container's TTY shell.

## ⚙️ Configuration

Configuration is managed centrally via `src/main/resources/application.yml` and overridable via the `.env` file at the root of the server directory.
