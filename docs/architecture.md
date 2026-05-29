# System Architecture

Isopod is a comprehensive, scalable, containerized cloud IDE platform. This document outlines the high-level architecture and data flow between the core components of the system.

## 1. High-Level Overview

The system is structurally divided into four primary tiers:
- **Client Tier:** A Single Page Application (SPA) built with [Angular 21](https://angular.dev/), responsible for the user interface, routing, and editor state.
- **Server Tier:** A [Java 21](https://adoptium.net/) / [Spring Boot 3](https://spring.io/projects/spring-boot) application serving as the backend orchestrator, managing databases, authentication, and Docker daemons.
- **Infrastructure Tier:** An **Nginx** reverse proxy that funnels all incoming traffic on port 80 to the appropriate downstream service, backed by a persistent PostgreSQL database and a Redis caching layer.
- **Execution Tier:** The host [Docker](https://www.docker.com/) daemon which spins up and manages the isolated workspace containers dynamically.

## 2. Component Architecture

### Frontend (Angular)
- **Monaco Editor Engine:** Drives the file editing experience using [`@monaco-editor/loader`](https://www.npmjs.com/package/@monaco-editor/loader) to mount the [Monaco Editor](https://microsoft.github.io/monaco-editor/). Bound to [Angular Signals](https://angular.dev/guide/signals) to track `fileContent`, `hasUnsavedChanges`, and `isSaving` states. Native `Ctrl+S` captures keystrokes and fires REST calls.
- **xterm.js Terminal:** Renders the interactive shell using [`xterm.js`](https://xtermjs.org/) and [`xterm-addon-fit`](https://www.npmjs.com/package/@xterm/addon-fit). It opens a raw [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) connection to the backend, transmitting binary keystrokes and rendering ANSI escape sequences received from the container TTY.
- **Signals State Management:** The entire application state (Auth Tokens, Environments, UI toggles) is managed natively by [Angular Signals](https://angular.dev/guide/signals), eliminating the need for heavy external stores like Redux or Zustand.
- **Custom UI Components:** The platform utilizes bespoke, brutalist, sharp-edged, pure black-and-white custom components driven entirely by [Tailwind CSS v4](https://tailwindcss.com/) to maintain a lightweight bundle and unique visual identity.

### Backend (Spring Boot)
- **Spring Security Chain:** Intercepts all `/api/**` traffic, validating stateless [JWT](https://jwt.io/) signatures via [Spring Security 6](https://spring.io/projects/spring-security). The `UsernamePasswordAuthenticationToken` is injected into the security context for controller use.
- **Docker-Java Orchestration:** The `EnvironmentService` communicates with the local Docker daemon socket (`//./pipe/docker_engine` on Windows or `/var/run/docker.sock` on Linux/macOS) using the [`docker-java`](https://github.com/docker-java/docker-java) dependency. It is responsible for `createCmd`, `startCmd`, and `stopCmd`.
- **Session & Telemetry Caching:** Employs [Redis](https://redis.io/) to cache `UserDetails` (bypassing heavy PostgreSQL queries on every WebSocket message) and to buffer raw terminal telemetry. Incorporates a Graceful Degradation pattern using the `FallbackService` abstraction. It instantly auto-detects Redis availability on startup via a connection ping and gracefully degrades to highly concurrent in-memory stores (`ConcurrentHashMap`, `ConcurrentLinkedQueue`) if the connection fails, entirely removing the need for manual feature flags.
- **Bind Mounting:** To ensure data persistence across container restarts, workspaces are physically stored on the host and bind-mounted directly to `/workspace` inside the running container. The exact host path is strictly managed by the portable `WORKSPACE_HOST` environment variable injected via Docker Compose.
- **Database:** Data is persisted in [PostgreSQL](https://www.postgresql.org/) managed by [Hibernate/JPA](https://hibernate.org/).

### Infrastructure & Networking

Isopod supports two deployment topologies:

#### Multi-Container (Docker Compose — Development)
The platform runs inside a bridged Docker network (`isopod_net`) orchestrated by `docker-compose.yaml`:
- `Nginx` listens on host port `80`.
- Requests starting with `/api/*` and `/ws/*` are reverse-proxied to the `server` container on port `8080`.
- All other requests (`/*`) fall back to the `client` container serving the compiled Angular frontend.
- This topology eliminates CORS issues completely and provides a unified origin for the application.
- **Strict Boot Order:** The system orchestrates container launches sequentially. The `server` container guarantees connection stability by implementing explicit `depends_on: service_healthy` blocks for both `postgres` and `redis`.

#### All-in-One Container (Production / Distribution)
A single `ubuntu:latest`-based Docker image bundles all services internally, managed by [Supervisord](http://supervisord.org/):

```
┌──────────────────────────────────────────────────┐
│           isopod container (ubuntu:latest)        │
│                                                   │
│  supervisord (PID 1)                              │
│    ├── postgresql   → /data/postgresql    (5432)  │
│    ├── redis-server → /data/redis         (6379)  │
│    ├── java -jar /app/server/app.jar      (8080)  │
│    └── nginx        → /app/client/        (80)    │
│                                                   │
│  /app/client/    ← Compiled Angular static files  │
│  /app/server/    ← Compiled Spring Boot fat JAR   │
│  /data/          ← PostgreSQL + Redis persistence  │
│  /workspaces/    ← User workspace files            │
│                                                   │
│  EXPOSED: port 80                                 │
└──────────────────────────────────────────────────┘
```

**Entrypoint Initialization Sequence:**
1. Initializes the PostgreSQL data directory on first run (`initdb`), creating the `isopod` database and `m4vi` user.
2. Auto-discovers the physical host-side mount path of the `/workspaces` internal volume via `docker inspect $(hostname)`. This resolved `Source` path is injected as `WORKSPACE_HOST` so that spawned workspace containers can bind-mount from the exact same physical volume directory on the host Docker daemon.
3. Exports all Spring Boot environment variables (datasource, Redis, workspace root).
4. Launches Supervisord in foreground as PID 1.

**Runtime Dependencies:**
- [Eclipse Temurin 21 JRE](https://adoptium.net/) via the [Adoptium apt repository](https://adoptium.net/installation/linux/)
- Docker CLI binary (copied from `docker:cli`, daemon-less) for workspace host path resolution
- No Node.js, JDK, or build tools in the runtime image

## 3. Data Flows

### A. Environment Provisioning
1. User requests to create an environment. The frontend dynamically populates the available template list by fetching cached images from the `HealthService` backend telemetry, ensuring users can only select templates the Docker daemon has ready.
2. The Angular client hits `POST /api/environments`.
3. Spring Boot records the metadata in PostgreSQL.
4. The backend uses `docker-java` to spawn a container using the requested image, attaching a host bind mount for persistent storage.
5. The container ID is saved to the database.

### B. Interactive Terminal (WebSocket)
1. User clicks "Open Editor". The frontend `TerminalComponent` requests a WebSocket connection to `ws://server/ws/terminal?envId={id}`.
2. The Spring `TerminalWebSocketHandler` receives the connection and extracts the JWT token.
3. The backend executes an `execCreateCmd` targeting the specific Docker container with `/bin/sh` or `/bin/bash` and attaches standard I/O streams.
4. A bidirectional byte stream is established: User keystrokes flow to the container via `execStartCmd` stream, and Docker stdout/stderr flows back down the WebSocket to `xterm.js`.
5. **AFK Telemetry:** Raw terminal output is simultaneously buffered in Redis. A background `@Scheduled` thread polls this buffer; if 3 seconds of AFK (Away From Keyboard) time pass, the ANSI-stripped bytes are flushed natively to a text log file inside the user's workspace `.tmp` folder.

### C. File Editing
1. **Read:** The Angular `FileTreeComponent` selects a file. A `GET /api/files?action=read` is fired. The backend reads the physical host file from `workspaces/{envId}/{path}` and returns the content.
2. **Write:** The Angular editor leverages a highly responsive 2-second RxJS `debounceTime` stream. When the user stops typing, it triggers a `POST /api/files` in the background (or explicitly on `Ctrl+S`). The backend overwrites the host file, instantly reflecting the changes inside the running bind-mounted Docker container.

### D. Cascading Account Deletion
1. User confirms account deletion via a strict prompt in the Angular UI.
2. Client fires `DELETE /api/users/me`.
3. The Spring Boot backend loops through all the user's environments, executing `stopContainerCmd` and `removeContainerCmd` via `docker-java`.
4. `FileSystemUtils.deleteRecursively()` physically wipes the bind-mounted host directories.
5. The PostgreSQL user record is permanently purged.

### E. Auto-Provisioning & System Telemetry
- **Registration Hook:** When a user registers via `POST /api/auth/register`, the `AuthService` dynamically calls `EnvironmentService` to immediately provision an `ubuntu:latest` container (named `default-ubuntu`). The container is intentionally left in a `stopped` state to conserve RAM while ensuring an instant out-of-the-box user experience.
- **Health Telemetry:** On Spring Boot startup, a `CommandLineRunner` explicitly checks and logs infrastructure connectivity (PostgreSQL and Redis/In-Memory state), executes a Docker daemon ping, and aggressively pulls core base images (`ubuntu:latest`, `node:latest`, `gcc:latest`, `eclipse-temurin:latest`) into the host cache. The `/api/health` endpoint exposes this real-time system status to the Angular `/health` visualization dashboard.

### F. File System Operations & Synchronization
The workspace IDE surface (`FileTreeComponent`) enables advanced file management via hover-actions.
1. Hovering over a file reveals a 'Delete' icon triggering a custom Tailwind modal. Once confirmed, a `DELETE /api/files` request recursively wipes the entry from the host filesystem.
2. Clicking 'New File' or 'New Folder' opens custom modals that trigger `POST /api/files` or `POST /api/files/dir`, which resolve relative paths strictly within the user's isolated workspace boundary before delegating to `java.nio.file.Files`.
3. **Background Sync & Deep Sorting:** The `FileTreeComponent` runs a silent background poll against the filesystem API every 3 seconds, fetching the entire recursive workspace layout via `java.nio.file.Files.walk`. Before rendering, it applies a robust deep tree sorting algorithm that guarantees directories are always prioritized over files at the exact same folder depth, ensuring deeply nested files dynamically sync (`touch`, `rm -rf`) and perfectly visually nest beneath their parents.
4. **Editor Cleanup:** When a file is deleted (either via the UI or the terminal sync), the `FileTreeComponent` emits a `(fileDeleted)` event. The parent `EditorComponent` intercepts this and forcefully unloads the file from the Monaco Editor, clearing any unsaved state flags.
