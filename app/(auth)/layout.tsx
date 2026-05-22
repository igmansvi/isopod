/**
 * @file Auth layout component.
 * @description Provides a centered, minimal layout for the login
 * and registration pages.
 */

import type { ReactNode } from "react";

/**
 * @description Wraps auth pages in a full-screen, flex-centered
 * container with the default application background.
 * @param props.children - The auth page content to render.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
