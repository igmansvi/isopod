/**
 * @file Main IDE workspace page.
 * @description Coordinates the FileTree, MonacoEditor, and Terminal
 * components to provide a full browser-based development environment.
 */

"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileTree } from "@/components/file-tree/FileTree";
import { MonacoEditor } from "@/components/editor/MonacoEditor";
import { Terminal } from "@/components/terminal/Terminal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useStore } from "@/lib/store";



/**
 * @description Renders the 3-pane IDE layout. Fetches environment
 * details and blocks access if the container isn't running.
 */
export default function EditorPage({ params }: { params: Promise<{ envId: string }> }) {
  const { envId } = use(params);
  const router = useRouter();
  
  const { 
    activeEnvironment: environment, 
    isActiveEnvironmentLoading: loading, 
    activeEnvironmentError: error, 
    fetchActiveEnvironment,
    startActiveEnvironment,
    clearWorkspace
  } = useStore();

  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchActiveEnvironment(envId);
    
    return () => {
      clearWorkspace();
    };
  }, [envId, fetchActiveEnvironment, clearWorkspace]);

  const handleStart = async () => {
    setStarting(true);
    await startActiveEnvironment(envId);
    setStarting(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading workspace...</div>;
  }

  if (error || !environment) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-destructive">{error || "Environment not found"}</div>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>Back to Dashboard</Link>
      </div>
    );
  }

  if (environment.status !== "running") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-xl">Environment is currently {environment.status}</div>
        <div className="flex gap-4">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>Cancel</Link>
          {environment.status === "stopped" && (
            <Button onClick={handleStart} disabled={starting}>
              {starting ? "Starting..." : "Start Environment"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Bar */}
      <header className="h-10 border-b border-[#30363d] bg-[#161b22] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1">
            <span className="text-lg leading-none mb-[2px]">‹</span> Dashboard
          </Link>
          <span className="text-[#30363d]">|</span>
          <span className="font-medium text-sm">{environment.name}</span>
          <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10 h-5 px-1.5 text-[10px]">
            Running
          </Badge>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-[#30363d] bg-[#161b22] flex flex-col shrink-0">
          <FileTree envId={envId} />
        </aside>

        {/* Editor & Terminal Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
          <div className="flex-1 min-h-0">
            <MonacoEditor envId={envId} />
          </div>
          <div className="h-64 border-t border-[#30363d] shrink-0">
            <Terminal envId={envId} containerId={environment.containerId!} />
          </div>
        </main>
      </div>
    </div>
  );
}
