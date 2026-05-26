# Isopod Frontend (Client)

The frontend module of the Isopod platform, built with **Angular 21 (Standalone)** and **Tailwind CSS v4**. It provides a premium, highly responsive user interface for managing cloud sandboxes and includes a full-featured in-browser IDE.

## 🏗️ Folder Structure

The frontend architecture strictly utilizes Angular Standalone Components and native Signals, completely grouped by domain:

```text
src/app/
├── core/                       # Singleton services and interceptors
│   ├── guards/                 # Route protection (AuthGuard)
│   ├── interceptors/           # HTTP Interceptors (JwtInterceptor)
│   └── services/               # Global services (ApiService, WebSocketService)
│
├── domain/                     # Feature modules (Lazy Loaded)
│   ├── auth/                   # LoginComponent, RegisterComponent, AuthStateService
│   ├── editor/                 # IDE features (FileTree, CodeEditor, Terminal)
│   ├── environment/            # Dashboard layout and environment management
│   ├── health/                 # System telemetry dashboard (HealthDashboard)
│   └── user/                   # Account management (UserService)
│
└── app.routes.ts               # Centralized lazy-loaded routing definition
```

## 🚀 Technologies Used

- **Framework:** [Angular 21](https://angular.dev/) (Standalone Components)
- **State Management:** [Angular Signals](https://angular.dev/guide/signals) (`signal`, `computed`)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) (Minimalist, Brutalist Dark Theme driven by highly semantic `@theme` tokens mapped directly in `styles.css`)
- **Code Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) (`@monaco-editor/loader`)
- **Terminal:** [xterm.js](https://xtermjs.org/) + `xterm-addon-fit`
- **HTTP/Routing:** [RxJS](https://rxjs.dev/) + Angular HttpClient

## 🧩 Key Domains & Components

### 1. Editor Domain (`domain/editor`)
The core IDE experience is constructed by wiring three distinct components together in `EditorComponent`:
- **`FileTreeComponent`**: Fetches the workspace hierarchy using `ApiService` and renders a clean, clickable file sidebar. Includes a 3-second background polling mechanism to stay perfectly in sync with terminal filesystem modifications.
- **`CodeEditorComponent`**: Natively integrates Microsoft's Monaco Editor engine with custom `Ctrl+S` keybindings to persist data.
- **`TerminalComponent`**: Instantiates `xterm.js` and securely pipes bidirectional streams directly to the Spring Boot backend via the `WebSocketService`.

### 2. Environment Domain (`domain/environment`)
- **`DashboardComponent`**: Renders a dynamic, fully responsive CSS grid of user workspaces. Supports instant environment creation (using dynamically fetched templates from the Health API), start/stop toggling, and deletion workflows, leveraging Tailwind for high-end micro-interactions. All UI rendering strictly uses the modern Angular `@if`/`@for` block control flow syntax for optimized performance.

### 3. Authentication Domain (`domain/auth`)
- **`AuthStateService`**: A centralized Signal-based store replacing traditional state management libraries (like NgRx or Zustand). Holds the JWT token and user session data reactivity.

### 4. Health & User Domains (`domain/health` & `domain/user`)
- **`HealthDashboardComponent`**: A real-time system telemetry dashboard (`/health`) displaying Docker daemon state and cached base environments.
- **`SystemHealthIndicatorComponent`**: A floating telemetry ping embedded exclusively within the authenticated dashboard view to continuously monitor backend connection health.
- **`UserService`**: Handles cascading account deletion workflows and persistent user state operations.

## ⚙️ Configuration & Deployment

API and WebSocket URLs are centrally managed in `src/environments/environment.ts` (Production) and `environment.development.ts` (Local Development). All HTTP requests are automatically intercepted by `JwtInterceptor` to attach the Bearer token based on the environment configuration.

**Production Deployment:**
The frontend is built for production using a multi-stage Dockerfile (`Dockerfile`). The build step compiles the Angular application (`npm run build -- --configuration=production`), and the output is served via the `serve` NPM package on port 8080. This internal port is then reverse-proxied by the central **Nginx** gateway in the root `docker-compose.yaml` setup.
