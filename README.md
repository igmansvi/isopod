<div align="center">
  <img src="public/icon.svg" alt="Isopod Logo" width="120" height="120" />
  <h1>Isopod</h1>
  <p><em>Secure, Containerized Cloud IDE Platform</em></p>
</div>

Isopod is a modern, web-based, containerized development environment platform. It allows users to create isolated coding workspaces (sandboxes) backed by Docker containers, complete with an in-browser code editor, file explorer, and a fully interactive terminal.

## ✨ Features

- **Authentication:** Secure user registration and login powered by NextAuth (Auth.js) and bcrypt.
- **Isolated Sandboxes:** On-demand Docker containers tailored for specific environments (Ubuntu, Node.js, C++, Java).
- **In-Browser IDE:**
  - **File Explorer:** Navigate and manage your workspace files directly from the browser.
  - **Code Editor:** Rich editing experience powered by [Monaco Editor](https://microsoft.github.io/monaco-editor/) (the engine behind VS Code) with auto-save capabilities.
  - **Terminal:** Fully interactive shell access to your container using [xterm.js](https://xtermjs.org/), bridged over WebSockets.
- **Persistence:** Workspaces are bind-mounted to the host filesystem, ensuring your code persists across container restarts.
- **Global State Management:** High-performance architecture powered by [Zustand](https://github.com/pmndrs/zustand). Network request deduplication is natively handled for optimal React Strict Mode execution.
- **Data Lifecycle Management:** Full, cascading account deletion capabilities that safely purge database records, stop and prune Docker containers, and recursively clean up host filesystem directories.

## 🛠️ Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/) 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui
- **State Management:** Zustand
- **Backend:** Custom Node.js server (`server.ts`) bridging HTTP traffic to Next.js and WebSocket traffic to Docker's PTY.
- **Database:** PostgreSQL via [Prisma ORM](https://www.prisma.io/)
- **Infrastructure:** [Docker](https://www.docker.com/) & Docker Compose, Nginx reverse proxy, Jenkins pipeline for CI.

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ensure the Docker daemon is running)
- Git

### 1. Local Development (Without Docker Compose)

To run Isopod natively for development:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/igmansvi/isopod.git
   cd isopod
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Verify Docker environment (Optional but recommended):**
   ```bash
   npm run test:env
   ```
   *This will pull necessary base images (`ubuntu:latest`, `node:latest`, `gcc:latest`, `eclipse-temurin:latest`).*

5. **Start the custom server:**
   ```bash
   npm run dev:server
   ```
   *Note: Standard `npm run dev` won't start the WebSocket terminal bridge. Always use the custom server.*

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Production Deployment (With Docker Compose)

To spin up the entire stack (Nginx Proxy + Isopod App + Database volume) using Docker Compose:

1. **Build and start the containers in detached mode:**
   ```bash
   docker-compose up -d --build
   ```

2. Open [http://localhost](http://localhost) in your browser (Nginx automatically routes traffic on port 80 to the internal app on port 3000).

3. **To stop the application:**
   ```bash
   docker-compose down
   ```

## 🏗️ Project Structure

```text
.
├── app/               # Next.js 16 App Router (Pages, Layouts, API routes)
├── components/        # React client & server components (Auth, Editor, Terminal, FileTree, UI)
├── lib/               # Core utility libraries (Docker wrapper, Filesystem, Auth, Prisma, Zustand Store)
├── prisma/            # Database schema and migrations
├── scripts/           # Utility scripts (e.g., test-env.js)
├── public/            # Static assets
├── server.ts          # Custom HTTP & WebSocket server entrypoint
├── docker-compose.yml # Docker Compose configuration
├── Dockerfile         # Production Dockerfile for the Isopod Next.js app
├── nginx.conf         # Nginx reverse proxy configuration
└── Jenkinsfile        # Jenkins CI/CD pipeline
```

## 🐳 Docker Integration Details

Isopod communicates with the host's Docker daemon to spawn workspace containers. 
- **Windows:** Connects via `//./pipe/docker_engine`.
- **Linux/macOS:** Connects via `/var/run/docker.sock`.

Containers are launched with a persistent bind mount to a local `workspaces/` directory.

## 📜 Documentation Standards

This codebase strictly adheres to Doxygen-style JSDoc documentation blocks (`/** ... */`) for all exports, interfaces, and complex logic. Arbitrary inline comments (`//`) are restricted to maintain a pristine, easily readable codebase.

## 📝 License

This project is open-source and available under the MIT License.
