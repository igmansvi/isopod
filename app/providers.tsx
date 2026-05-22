/**
 * @file Client-side provider tree for Isopod.
 * @description Provides a global unhandled rejection catcher
 * and other app-level setups.
 */

"use client";

import { useEffect } from "react";

import type { ReactNode } from "react";

/**
 * @description Root provider component that supplies
 * global setups to the entire client-side component tree.
 * @param props.children - The child elements to render.
 */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args) => {
      const msg = args.join(" ");
      if (
        msg.includes("operation is manually canceled") ||
        msg.includes("type: 'cancelation'") ||
        msg.includes("CancelationError")
      ) {
        // Swallow harmless Monaco cancelation errors
        return;
      }
      originalConsoleError.apply(console, args);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as {
        type?: string;
        msg?: string;
        name?: string;
      } | null;

      if (
        (reason?.type === "cancelation" && reason?.msg === "operation is manually canceled") ||
        reason?.name === "Cancel"
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    // Use capture: true so we intercept it before Next.js does
    window.addEventListener("unhandledrejection", onUnhandledRejection, { capture: true });

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("unhandledrejection", onUnhandledRejection, { capture: true });
    };
  }, []);

  return <>{children}</>;
}
