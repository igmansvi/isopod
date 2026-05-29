<div align="center">
  <img src="docs/assets/isopod_icon.svg" alt="Isopod Logo" width="120" height="120" />
  <h1>Isopod</h1>
  <p><em>Secure, Containerized Cloud IDE Platform</em></p>
</div>

Isopod is a modern, web-based, containerized development environment platform. It allows users to create isolated coding workspaces (sandboxes) backed by Docker containers, complete with an in-browser code editor, file explorer, and a fully interactive terminal.

## ✨ Features

- **Authentication:** Secure user registration and login powered by Stateless JWTs and Spring Security.
- **Isolated Sandboxes:** On-demand [Docker](https://www.docker.com/) containers tailored for specific environments.
- **In-Browser IDE:**
  - **Terminal:** Fully interactive shell access to your container using [xterm.js](https://xtermjs.org/), bridged over WebSockets. Features intelligent AFK log buffering (3s) and automated ANSI-stripping.
  - **Code Editor:** Rich editing experience powered by the [Monaco Editor](https://microsoft.github.io/monaco-editor/) engine with a smart 2-second background auto-save mechanism.
- **Redis Session Management:** High-performance centralized state caching and telemetry. Automatically detects Redis availability on startup and gracefully degrades to highly concurrent In-Memory queues if offline, eliminating manual configuration.
- **Persistence:** Workspaces are bind-mounted to the host filesystem, ensuring your code persists across container restarts.
- **Global State Management:** High-performance architecture powered by native Angular Signals.
- **Data Lifecycle Management:** Full capabilities to safely start, stop, and purge database records and Docker containers.

## 🛠️ Tech Stack

- **Frontend:** [Angular 21](https://angular.dev/) (Standalone Components), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management:** [Angular Signals](https://angular.dev/guide/signals) (`signal`, `computed`)
- **Backend:** [Java 21](https://adoptium.net/), [Spring Boot 3](https://spring.io/projects/spring-boot) (REST APIs, WebSocket Handlers, [Spring Security](https://spring.io/projects/spring-security))
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Hibernate/JPA](https://hibernate.org/)
- **Caching & Telemetry:** [Redis](https://redis.io/)
- **Runtime:** [Eclipse Temurin 21 JRE](https://adoptium.net/), [Nginx](https://nginx.org/), [Supervisord](http://supervisord.org/)
- **Infrastructure:** [docker-java](https://github.com/docker-java/docker-java) for native Docker daemon bridging.

## 📚 Module Documentation

Isopod is a monorepo consisting of two distinct modules. For detailed architecture, folder structure, and API documentation, please refer to their respective guides:

- **[Backend (Spring Boot) Documentation](./server/README.md)**
- **[Frontend (Angular) Documentation](./client/README.md)**
- **[System Architecture Documentation](./docs/architecture.md)**
- **[Full Documentation Directory](./docs/)**

## 🚀 Getting Started

### Quick Start (Single Container)

Run the entire Isopod platform from a single pre-built Docker image. No dependencies, no configuration — just Docker.

1. **Pull and run:**
   ```bash
   docker run -d -p 80:80 \
     -v /var/run/docker.sock:/var/run/docker.sock \
     --name isopod \
     ghcr.io/igmansvi/isopod:latest
   ```

2. **Access the application:** Open [http://localhost](http://localhost) in your browser.

The container bundles PostgreSQL, Redis, Nginx, and the compiled application. All data (database, cache) lives inside the container, while workspaces are automatically persisted to a native anonymous Docker volume. The Docker socket mount enables spawning isolated workspace containers on the host that bind-mount directly to this volume.

---

### Development Setup (Docker Compose)

For local development with hot-reloading and multi-container isolation:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/igmansvi/isopod.git
   cd isopod
   ```

2. **Start the stack:**
   ```bash
   docker compose up -d
   ```

3. **Access the application:** Once all containers report as `healthy`, open [http://localhost](http://localhost) in your browser.

   Nginx routes traffic automatically:
   - `/api/*` ➡️ Spring Boot Backend
   - `/ws/*` ➡️ Spring Boot WebSocket Handlers
   - `/*` ➡️ Angular Frontend

## 🐳 Docker Integration

Isopod communicates with the host Docker daemon via [`docker-java`](https://github.com/docker-java/docker-java) to spawn isolated workspace containers.

| Deployment | Image | Container Strategy |
|------------|-------|-------------------|
| **Quick Start** | `ghcr.io/igmansvi/isopod:latest` | Single self-contained container with all services managed by [Supervisord](http://supervisord.org/) |
| **Development** | Built from `docker-compose.yaml` | Multi-container: PostgreSQL, Redis, Client, Server, Nginx on a bridged network |

## 📜 Documentation Standards

This codebase strictly adheres to standard JSDoc/JavaDoc documentation blocks (`/** ... */`) for all exports, interfaces, controllers, and services. Arbitrary inline comments (`//`) are restricted to maintain a pristine, easily readable codebase.

## 📝 License

This project is open-source and available under the MIT License.
