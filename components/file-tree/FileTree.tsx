/**
 * @file File tree sidebar component.
 * @description Recursively renders the workspace directory structure
 * and allows the user to select files for editing.
 */

"use client";

import { useState, useEffect } from "react";
import type { FileEntry } from "@/types";
import { useStore } from "@/lib/store";

interface FileTreeProps {
  envId: string;
}

interface TreeNodeProps {
  entry: FileEntry;
  envId: string;
  level: number;
}

/**
 * @description Renders a single node in the file tree, optionally
 * fetching and rendering its children if it is an expanded directory.
 */
function TreeNode({ entry, envId, level }: TreeNodeProps) {
  const { setSelectedFile } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleExpand = () => {
    if (!entry.isDirectory) {
      setSelectedFile(entry.path);
      return;
    }
    setExpanded(!expanded);
  };

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

    async function fetchChildren() {
      try {
        const res = await fetch(
          `/api/files?envId=${envId}&path=${encodeURIComponent(entry.path)}`
        );
        const data = await res.json();
        if (isMounted && data.success && data.data.type === "directory") {
          setChildren(data.data.entries);
        }
      } catch (err) {
      }
    }

    if (expanded) {
      if (children === null) {
        setLoading(true);
        fetchChildren().finally(() => {
          if (isMounted) setLoading(false);
        });
      }
      
      interval = setInterval(fetchChildren, 3000);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [expanded, entry.path, envId, children]);

  return (
    <div>
      <div
        className="flex items-center py-1 px-2 cursor-pointer hover:bg-accent/50 text-sm select-none"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={toggleExpand}
      >
        <span className="mr-1.5 opacity-80 text-xs w-4 inline-block text-center">
          {entry.isDirectory ? (expanded ? "📂" : "📁") : "📄"}
        </span>
        <span className="truncate">{entry.name}</span>
        {loading && <span className="ml-2 text-xs text-muted-foreground animate-pulse">...</span>}
      </div>
      
      {expanded && children && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              envId={envId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @description Renders the root of the file tree for the workspace.
 * @param props.envId        - The environment ID to fetch files from.
 */
export function FileTree({ envId }: FileTreeProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRoot() {
      try {
        const res = await fetch(`/api/files?envId=${envId}&path=/`);
        const data = await res.json();
        
        if (isMounted) {
          if (data.success && data.data.type === "directory") {
            setEntries(data.data.entries);
            setError("");
          } else if (entries.length === 0) {
            setError(data.error || "Failed to load workspace.");
          }
        }
      } catch {
        if (isMounted && entries.length === 0) setError("Network error.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRoot();
    const interval = setInterval(loadRoot, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [envId]);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground animate-pulse">Loading workspace...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">{error}</div>;
  }

  if (entries.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">Empty workspace</div>;
  }

  return (
    <div className="h-full overflow-y-auto py-2">
      <div className="px-3 pb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1">
        Explorer
      </div>
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          envId={envId}
          level={0}
        />
      ))}
    </div>
  );
}
