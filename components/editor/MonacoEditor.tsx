/**
 * @file Monaco Editor wrapper component.
 * @description Provides a React wrapper around Monaco Editor,
 * automatically fetching file contents on mount and supporting
 * save via Ctrl+S.
 */

"use client";

import { useEffect, useState, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useStore } from "@/lib/store";

interface MonacoEditorProps {
  envId: string;
  onSave?: () => void;
}

/**
 * @description Renders a Monaco Editor instance that loads content
 * from the Isopod API and saves back to it.
 * @param props.envId    - The environment ID this file belongs to.
 * @param props.onSave   - Optional callback fired after a successful save.
 */
export function MonacoEditor({ envId, onSave }: MonacoEditorProps) {
  const { selectedFile: filePath } = useStore();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filePath]);

  /**
   * @description Suppresses harmless Monaco cancelation errors that surface
   * as unhandled promise rejections when the editor unmounts or changes models quickly.
   */
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason &&
        (event.reason.type === "cancelation" ||
         event.reason.name === "Cancel" ||
         event.reason.msg === "operation is manually canceled")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection, { capture: true });
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, { capture: true });
    };
  }, []);

  /**
   * @description Fetches file content when the selected filePath changes.
   */
  useEffect(() => {
    if (!filePath) {
      setContent("");
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError("");

    async function loadFile() {
      try {
        const res = await fetch(
          `/api/files?envId=${envId}&path=${encodeURIComponent(filePath!)}`,
        );
        const data = await res.json();
        
        if (isMounted) {
          if (data.success && data.data.type === "file") {
            setContent(data.data.content);
          } else {
            setError(data.error || "Failed to load file.");
            setContent("");
          }
        }
      } catch {
        if (isMounted) setError("Network error loading file.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFile();

    return () => {
      isMounted = false;
    };
  }, [filePath, envId]);

  /**
   * @description Handles editor mounting and keyboard shortcuts.
   */
  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;

    editor.addCommand(monaco!.KeyMod.CtrlCmd | monaco!.KeyCode.KeyS, async () => {
      if (!filePath) return;
      
      try {
        const res = await fetch("/api/files", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            envId,
            path: filePath,
            content: editor.getValue(),
          }),
        });
        
        if (res.ok && onSave) {
          onSave();
        }
      } catch (err) {
        console.error("Save failed:", err);
      }
    });
  }

  /**
   * @description Debounced auto-save handler triggered on keystrokes.
   */
  function handleEditorChange(value: string | undefined) {
    if (value === undefined || !filePath) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/files", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            envId,
            path: filePath,
            content: value,
          }),
        });
        if (res.ok && onSave) {
          onSave();
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1000);
  }

  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
      json: 'json', html: 'html', css: 'css', md: 'markdown', py: 'python',
      sh: 'shell', yaml: 'yaml', yml: 'yaml', dockerfile: 'dockerfile'
    };
    return ext ? map[ext] || 'plaintext' : 'plaintext';
  };

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground bg-[#1e1e1e]">
        Select a file to start editing
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive bg-[#1e1e1e]">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {loading && (
        <div className="absolute top-0 left-0 w-full p-2 bg-[#1e1e1e] text-muted-foreground text-sm z-10">
          Loading {filePath}...
        </div>
      )}
      <Editor
        height="100%"
        width="100%"
        theme="vs-dark"
        path={filePath}
        language={getLanguage(filePath)}
        value={content}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Geist Mono', monospace",
          automaticLayout: true,
          padding: { top: 16 },
        }}
      />
    </div>
  );
}
