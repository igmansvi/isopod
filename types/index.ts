/**
 * @file Shared TypeScript type definitions for Isopod.
 * @description Centralized interfaces and type aliases used across
 * both server and client boundaries.
 */

/**
 * @interface FileEntry
 * @description Represents a single node in the workspace file tree.
 */
export interface FileEntry {
  /** Display name of the file or directory. */
  name: string;
  /** Relative path from the workspace root. */
  path: string;
  /** Whether this entry is a directory. */
  isDirectory: boolean;
  /** File size in bytes (files only). */
  size?: number;
  /** Child entries (directories only, populated on expand). */
  children?: FileEntry[];
}

/**
 * @interface TerminalMessage
 * @description WebSocket message payload exchanged between the
 * xterm.js client and the server PTY bridge.
 */
export interface TerminalMessage {
  /** Message type discriminator. */
  type: "input" | "output" | "resize";
  /** Raw terminal data (input/output). */
  data?: string;
  /** Terminal column count (resize). */
  cols?: number;
  /** Terminal row count (resize). */
  rows?: number;
}

/**
 * @typedef EnvironmentStatus
 * @description Lifecycle states for a container-backed environment.
 */
export type EnvironmentStatus = "stopped" | "running" | "creating" | "error";

/**
 * @interface ApiResponse
 * @description Standard JSON envelope returned by all REST endpoints.
 * @template T The shape of the `data` payload on success.
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request succeeded. */
  success: boolean;
  /** Response payload (present on success). */
  data?: T;
  /** Human-readable error message (present on failure). */
  error?: string;
}

/**
 * @interface EnvironmentTemplate
 * @description Predefined container template selectable when
 * creating a new environment.
 */
export interface EnvironmentTemplate {
  /** Unique template identifier. */
  id: string;
  /** Human-readable template name. */
  name: string;
  /** Docker image reference. */
  image: string;
  /** Short description shown in the UI. */
  description: string;
}
