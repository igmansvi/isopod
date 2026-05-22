/**
 * @file IDE full-bleed layout.
 * @description Provides a viewport-filling container for the editor
 * interface, preventing scrolling on the body.
 */

import type { ReactNode } from "react";

/**
 * @description Server component that ensures the IDE takes up exactly
 * 100vh and hides overflow to allow Monaco and xterm to manage their
 * own scrolling and resizing.
 * @param props.children - The IDE page content.
 */
export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#0d1117] overflow-hidden text-[#e6edf3]">
      {children}
    </div>
  );
}
