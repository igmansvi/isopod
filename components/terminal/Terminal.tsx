/**
 * @file xterm.js Terminal wrapper component.
 * @description Provides a web-based terminal interface connected
 * to the backend WebSocket server, routing input/output to the
 * container's PTY.
 */

"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
  envId: string;
  containerId?: string;
}

/**
 * @description Renders an xterm.js terminal instance. Dynamically
 * imports xterm to ensure it only runs on the client.
 * @param props.envId       - The environment ID to connect to.
 * @param props.containerId - The backing Docker container ID.
 */
export function Terminal({ envId, containerId }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !envId) return;

    let isMounted = true;
    let fitAddon: any = null;

    Promise.all([
      import("@xterm/xterm"),
      import("@xterm/addon-fit"),
      import("@xterm/addon-web-links"),
    ]).then(([xtermPkg, fitPkg, webLinksPkg]) => {
      if (!isMounted) return;

      const { Terminal: XTerm } = xtermPkg;
      const { FitAddon } = fitPkg;
      const { WebLinksAddon } = webLinksPkg;

      const term = new XTerm({
        theme: {
          background: "#0d1117",
          foreground: "#e6edf3",
          cursor: "#58a6ff",
          selectionBackground: "rgba(88, 166, 255, 0.3)",
          black: "#484f58",
          red: "#ff7b72",
          green: "#3fb950",
          yellow: "#d29922",
          blue: "#58a6ff",
          magenta: "#bc8cff",
          cyan: "#39c5cf",
          white: "#b1bac4",
          brightBlack: "#6e7681",
          brightRed: "#ffa198",
          brightGreen: "#56d364",
          brightYellow: "#e3b341",
          brightBlue: "#79c0ff",
          brightMagenta: "#d2a8ff",
          brightCyan: "#56d4dd",
          brightWhite: "#f0f6fc",
        },
        fontFamily: "'Geist Mono', monospace",
        fontSize: 14,
        cursorBlink: true,
      });

      xtermRef.current = term;

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(terminalRef.current!);
      fitAddon.fit();

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/terminal?envId=${envId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        term.focus();
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      const handleResize = () => {
        if (fitAddon) {
          fitAddon.fit();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
          }
        }
      };

      window.addEventListener("resize", handleResize);

      const resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(terminalRef.current!);

      return () => {
        window.removeEventListener("resize", handleResize);
        resizeObserver.disconnect();
      };
    });

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [envId, containerId]);

  return <div ref={terminalRef} className="w-full h-full p-2 bg-[#0d1117] overflow-hidden" />;
}
