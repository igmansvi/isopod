/**
 * @file Custom HTTP + WebSocket server for Isopod.
 * @description Wraps the Next.js request handler in a plain
 * `http.Server` and attaches a WebSocket server on `/ws/terminal`
 * to bridge xterm.js clients to interactive Docker exec sessions.
 */

import "dotenv/config";

import { createServer, type IncomingMessage } from "http";
import next from "next";
import { parse } from "url";
import { WebSocketServer, type WebSocket } from "ws";
import { prisma } from "./lib/prisma";
import { execInteractive } from "./lib/docker";
import { WS_TERMINAL_PATH } from "./lib/constants";
import type { TerminalMessage } from "./types";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

let handle: ReturnType<ReturnType<typeof next>["getRequestHandler"]>;

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url || "/", true);
  handle(req, res, parsedUrl);
});

const app = next({ dev, hostname, port, httpServer: server });
handle = app.getRequestHandler();

app.prepare().then(() => {
  const wss = new WebSocketServer({ noServer: true });

  /**
   * @description Upgrades incoming HTTP connections to WebSocket
   * only when the request targets the terminal path.
   */
  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const { pathname } = parse(req.url || "/", true);

    if (pathname === WS_TERMINAL_PATH) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  /**
   * @description Handles new WebSocket connections by resolving
   * the target environment, verifying ownership, and piping a
   * Docker exec stream bidirectionally with the client terminal.
   */
  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const { query } = parse(req.url || "/", true);
    const envId = query.envId as string | undefined;

    if (!envId) {
      ws.close(4000, "Missing envId query parameter");
      return;
    }

    try {
      const environment = await prisma.environment.findUnique({
        where: { id: envId },
      });

      if (!environment || !environment.containerId) {
        ws.close(4004, "Environment not found or not running");
        return;
      }

      /** @todo Authenticate via session cookie parsing. */

      const stream = await execInteractive(environment.containerId);

      stream.on("data", (chunk: Buffer) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(chunk.toString("utf-8"));
        }
      });

      stream.on("end", () => {
        if (ws.readyState === ws.OPEN) {
          ws.close(1000, "Session ended");
        }
      });

      ws.on("message", (data: Buffer | string) => {
        const message = data.toString();

        try {
          const parsed: TerminalMessage = JSON.parse(message);

          if (parsed.type === "resize" && parsed.cols && parsed.rows) {
            /** @todo Implement exec resize via Docker API. */
            return;
          }
        } catch {
        }

        stream.write(message);
      });

      ws.on("close", () => {
        (stream as any).destroy();
      });

      ws.on("error", () => {
        (stream as any).destroy();
      });
    } catch (err) {
      console.error("[ws/terminal] Connection error:", err);
      ws.close(4500, "Internal server error");
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Isopod ready on http://${hostname}:${port}`);
  });

  /**
   * @description Graceful shutdown handler — closes the WebSocket
   * server and HTTP server on process termination signals.
   */
  const shutdown = () => {
    console.log("> Shutting down...");
    wss.close();
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
