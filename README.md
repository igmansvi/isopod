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
  - **Terminal:** Fully interactive shell access to your container using [xterm.js](https://xtermjs.org/), bridged over WebSockets.
  - **Code Editor:** Rich editing experience powered by the [Monaco Editor](https://microsoft.github.io/monaco-editor/) engine with native save persistence.
- **Persistence:** Workspaces are bind-mounted to the host filesystem, ensuring your code persists across container restarts.
- **Global State Management:** High-performance architecture powered by native Angular Signals.
- **Data Lifecycle Management:** Full capabilities to safely start, stop, and purge database records and Docker containers.

## 🛠️ Tech Stack

- **Frontend:** [Angular 21](https://angular.dev/) (Standalone Components), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management:** [Angular Signals](https://angular.dev/guide/signals) (`signal`, `computed`)
- **Backend:** [Java 21](https://adoptium.net/), [Spring Boot 3](https://spring.io/projects/spring-boot) (REST APIs, WebSocket Handlers, [Spring Security](https://spring.io/projects/spring-security))
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Hibernate/JPA](https://hibernate.org/)
- **Infrastructure:** [docker-java](https://github.com/docker-java/docker-java) for native Docker daemon bridging.

## 📚 Module Documentation

Isopod is a monorepo consisting of two distinct modules. For detailed architecture, folder structure, and API documentation, please refer to their respective guides:

- **[Backend (Spring Boot) Documentation](./server/README.md)**
- **[Frontend (Angular) Documentation](./client/README.md)**
- **[System Architecture & Technical Docs](./docs/README.md)**

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Java 21](https://adoptium.net/) or higher
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ensure the Docker daemon is running)
- [PostgreSQL](https://www.postgresql.org/)

### 1. Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/igmansvi/isopod.git
   cd isopod
   ```

2. **Initialize the Database:**
   Ensure PostgreSQL is running and you have created a database named `isopod`.

3. **Configure Environment Variables:**
   Copy the example environment files and configure your secrets:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

4. **Start the Backend (Spring Boot):**
   ```bash
   cd server
   ./mvnw spring-boot:run
   ```

5. **Start the Frontend (Angular):**
   ```bash
   cd ../client
   npm install
   npm start
   ```

6. Open [http://localhost:4200](http://localhost:4200) in your browser.

## 🐳 Docker Integration Details

Isopod communicates with the host's Docker daemon to spawn workspace containers via `docker-java`.
Containers are launched with a persistent bind mount to a local `workspaces/` directory.

## 📜 Documentation Standards

This codebase strictly adheres to standard JSDoc/JavaDoc documentation blocks (`/** ... */`) for all exports, interfaces, controllers, and services. Arbitrary inline comments (`//`) are restricted to maintain a pristine, easily readable codebase.

## 📝 License

This project is open-source and available under the MIT License.
