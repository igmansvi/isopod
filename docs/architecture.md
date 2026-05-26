# System Architecture

Isopod is a comprehensive, scalable, containerized cloud IDE platform. This document outlines the high-level architecture and data flow between the core components of the system.

## 1. High-Level Overview

The system is structurally divided into three primary tiers:
- **Client Tier:** A Single Page Application (SPA) built with [Angular 21](https://angular.dev/), responsible for the user interface, routing, and editor state.
- **Server Tier:** A [Java 21](https://adoptium.net/) / [Spring Boot 3](https://spring.io/projects/spring-boot) application serving as the backend orchestrator, managing databases, authentication, and Docker daemons.
- **Execution Tier:** The host [Docker](https://www.docker.com/) daemon which spins up and manages the isolated workspace containers.

## 2. Component Architecture

### Frontend (Angular)
- **Monaco Editor Engine:** Drives the file editing experience using [`@monaco-editor/loader`](https://www.npmjs.com/package/@monaco-editor/loader) to mount the [Monaco Editor](https://microsoft.github.io/monaco-editor/). Bound to [Angular Signals](https://angular.dev/guide/signals) to track `fileContent`, `hasUnsavedChanges`, and `isSaving` states. Native `Ctrl+S` captures keystrokes and fires REST calls.
- **xterm.js Terminal:** Renders the interactive shell using [`xterm.js`](https://xtermjs.org/) and [`xterm-addon-fit`](https://www.npmjs.com/package/@xterm/addon-fit). It opens a raw [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) connection to the backend, transmitting binary keystrokes and rendering ANSI escape sequences received from the container TTY.
- **Signals State Management:** The entire application state (Auth Tokens, Environments, UI toggles) is managed natively by [Angular Signals](https://angular.dev/guide/signals), eliminating the need for heavy external stores like Redux or Zustand.
- **Custom UI Components:** The platform utilizes bespoke, brutalist, sharp-edged, pure black-and-white custom components driven entirely by [Tailwind CSS v4](https://tailwindcss.com/) to maintain a lightweight bundle and unique visual identity.

### Backend (Spring Boot)
- **Spring Security Chain:** Intercepts all `/api/**` traffic, validating stateless [JWT](https://jwt.io/) signatures via [Spring Security 6](https://spring.io/projects/spring-security). The `UsernamePasswordAuthenticationToken` is injected into the security context for controller use.
- **Docker-Java Orchestration:** The `EnvironmentService` communicates with the local Docker daemon socket (`//./pipe/docker_engine` on Windows or `/var/run/docker.sock` on Linux/macOS) using the [`docker-java`](https://github.com/docker-java/docker-java) dependency. It is responsible for `createCmd`, `startCmd`, and `stopCmd`.
- **Bind Mounting:** To ensure data persistence across container restarts, workspaces are physically stored on the host under `workspaces/{envId}` and bind-mounted directly to `/workspace` inside the running container.
- **Database:** Data is persisted in [PostgreSQL](https://www.postgresql.org/) managed by [Hibernate/JPA](https://hibernate.org/).

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

### C. File Editing
1. **Read:** The Angular `FileTreeComponent` selects a file. A `GET /api/files?action=read` is fired. The backend reads the physical host file from `workspaces/{envId}/{path}` and returns the content.
2. **Write:** The user presses `Ctrl+S`. A `POST /api/files` pushes the payload. The backend overwrites the host file, instantly reflecting the changes inside the running bind-mounted Docker container.

### D. Cascading Account Deletion
1. User confirms account deletion via a strict prompt in the Angular UI.
2. Client fires `DELETE /api/users/me`.
3. The Spring Boot backend loops through all the user's environments, executing `stopContainerCmd` and `removeContainerCmd` via `docker-java`.
4. `FileSystemUtils.deleteRecursively()` physically wipes the bind-mounted host directories.
5. The PostgreSQL user record is permanently purged.

### E. Auto-Provisioning & System Telemetry
- **Registration Hook:** When a user registers via `POST /api/auth/register`, the `AuthService` dynamically calls `EnvironmentService` to immediately provision an `ubuntu:latest` container (named `default-ubuntu`). The container is intentionally left in a `stopped` state to conserve RAM while ensuring an instant out-of-the-box user experience.
- **Health Telemetry:** On Spring Boot startup, a `CommandLineRunner` executes a Docker daemon ping and aggressively pulls core base images (`ubuntu:latest`, `node:latest`, `gcc:latest`, `eclipse-temurin:latest`) into the host cache. The `/api/health` endpoint exposes this real-time system status to the Angular `/health` visualization dashboard.

### F. File System Operations & Synchronization
The workspace IDE surface (`FileTreeComponent`) enables advanced file management via hover-actions.
1. Hovering over a file reveals a 'Delete' icon triggering a custom Tailwind modal. Once confirmed, a `DELETE /api/files` request recursively wipes the entry from the host filesystem.
2. Clicking 'New File' or 'New Folder' opens custom modals that trigger `POST /api/files` or `POST /api/files/dir`, which resolve relative paths strictly within the user's isolated workspace boundary before delegating to `java.nio.file.Files`.
3. **Background Sync:** The `FileTreeComponent` runs a silent background poll against the filesystem API every 3 seconds. This guarantees that files created, renamed, or deleted via the integrated terminal (`touch`, `rm`, `mkdir`) instantly reflect in the file tree UI without requiring a manual refresh.
4. **Editor Cleanup:** When a file is deleted (either via the UI or the terminal sync), the `FileTreeComponent` emits a `(fileDeleted)` event. The parent `EditorComponent` intercepts this and forcefully unloads the file from the Monaco Editor, clearing any unsaved state flags.
