/**
 * @file Application-wide constants for Isopod.
 * @description Centralises paths, defaults, and template definitions
 * so they can be imported from a single location.
 */

import path from "path";
import type { EnvironmentTemplate } from "@/types";

/**
 * @constant WORKSPACES_ROOT
 * @description Absolute path to the host directory that stores all
 * user workspace volumes. Each environment gets a subdirectory at
 * `{WORKSPACES_ROOT}/{username}/{envName}` which is bind-mounted
 * into the container at `/workspace`.
 */
export const WORKSPACES_ROOT: string =
  process.env.WORKSPACES_ROOT || path.join(process.cwd(), "workspaces");

/**
 * @constant DEFAULT_IMAGE
 * @description Docker image used when no template is specified.
 */
export const DEFAULT_IMAGE = "node:lts";

/**
 * @constant DEFAULT_ENVIRONMENT_TEMPLATE_ID
 * @description Template ID used when auto-provisioning a default
 * environment after first login.
 */
export const DEFAULT_ENVIRONMENT_TEMPLATE_ID = "ubuntu";

/**
 * @constant WS_TERMINAL_PATH
 * @description URL path the WebSocket server listens on for
 * interactive terminal sessions.
 */
export const WS_TERMINAL_PATH = "/ws/terminal";

/**
 * @constant ENVIRONMENT_TEMPLATES
 * @description Predefined container templates available in the
 * "New Environment" dialog. Uses standard LTS and latest base images.
 */
export const ENVIRONMENT_TEMPLATES: EnvironmentTemplate[] = [
  {
    id: "ubuntu",
    name: "Ubuntu",
    image: "ubuntu:latest",
    description: "Standard Ubuntu Linux",
  },
  {
    id: "node",
    name: "Node.js",
    image: "node:latest",
    description: "Node.js Latest (Debian)",
  },
  {
    id: "cpp",
    name: "C++",
    image: "gcc:latest",
    description: "GCC toolchain (Debian)",
  },
  {
    id: "java",
    name: "Java",
    image: "eclipse-temurin:latest",
    description: "Eclipse Temurin Java Latest",
  },
];
