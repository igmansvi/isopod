/**
 * @file Host filesystem operations for Isopod.
 * @description Provides sandboxed read/write/list/delete helpers
 * that operate on user workspace directories. Every function
 * validates resolved paths to prevent directory traversal attacks.
 */

import fs from "fs/promises";
import path from "path";
import type { FileEntry } from "@/types";

/**
 * @description Resolves `relativePath` against `basePath` and
 * validates that the result stays within the base directory.
 * @param basePath     - The trusted workspace root.
 * @param relativePath - The user-supplied relative path.
 * @returns The resolved absolute path.
 * @throws If the resolved path escapes the base directory.
 */
export function validatePath(basePath: string, relativePath: string): string {
  if (relativePath === "/" || relativePath === "") {
    return path.resolve(basePath);
  }

  const cleanRelative = relativePath.replace(/^[/\\]+/, "");
  
  const resolved = path.resolve(basePath, cleanRelative);
  const baseResolved = path.resolve(basePath);

  if (resolved === baseResolved) return resolved;

  if (!resolved.startsWith(baseResolved + path.sep)) {
    throw new Error("Path traversal detected");
  }

  return resolved;
}

/**
 * @description Lists the immediate children of a directory.
 * @param basePath     - The trusted workspace root.
 * @param relativePath - Directory to list, relative to basePath.
 * @returns An array of `FileEntry` objects sorted directories-first.
 */
export async function listDirectory(
  basePath: string,
  relativePath: string,
): Promise<FileEntry[]> {
  const fullPath = validatePath(basePath, relativePath);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });

  const mapped: FileEntry[] = entries.map((entry) => ({
    name: entry.name,
    path: path.posix.join(relativePath, entry.name),
    isDirectory: entry.isDirectory(),
  }));

  return mapped.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * @description Reads a file's content as a UTF-8 string.
 * @param basePath     - The trusted workspace root.
 * @param relativePath - File to read, relative to basePath.
 * @returns The file content.
 */
export async function readFile(
  basePath: string,
  relativePath: string,
): Promise<string> {
  const fullPath = validatePath(basePath, relativePath);
  return fs.readFile(fullPath, "utf-8");
}

/**
 * @description Writes content to a file, creating parent
 * directories as needed.
 * @param basePath     - The trusted workspace root.
 * @param relativePath - File to write, relative to basePath.
 * @param content      - The string content to write.
 */
export async function writeFile(
  basePath: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const fullPath = validatePath(basePath, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf-8");
}

/**
 * @description Creates a directory (and any missing parents).
 * @param basePath     - The trusted workspace root.
 * @param relativePath - Directory to create, relative to basePath.
 */
export async function createDirectory(
  basePath: string,
  relativePath: string,
): Promise<void> {
  const fullPath = validatePath(basePath, relativePath);
  await fs.mkdir(fullPath, { recursive: true });
}

/**
 * @description Recursively deletes a file or directory.
 * @param basePath     - The trusted workspace root.
 * @param relativePath - Entry to delete, relative to basePath.
 */
export async function deleteEntry(
  basePath: string,
  relativePath: string,
): Promise<void> {
  const fullPath = validatePath(basePath, relativePath);
  await fs.rm(fullPath, { recursive: true, force: true });
}

/**
 * @description Ensures a directory exists, creating it and any
 * missing parents if necessary.
 * @param dirPath - The absolute directory path to ensure.
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
