/**
 * @file Dockerode wrapper for Isopod.
 * @description Provides a singleton Docker client and helper
 * functions for container lifecycle management and interactive
 * PTY exec sessions. Connects to Docker Desktop on Windows via
 * named pipe by default.
 */

import Docker from "dockerode";
import fs from "fs/promises";
import path from "path";
import { WORKSPACES_ROOT } from "./constants";
import type { EnvironmentStatus } from "@/types";

let docker: Docker | undefined;

/**
 * @description Internal helper to create and normalize the Dockerode client instance.
 * @returns {Docker} Normalized Dockerode client.
 */
function createDockerClient(): Docker {
  if (docker) {
    return docker;
  }

  const rawDockerHost = process.env.DOCKER_HOST ?? "";
  const dockerHost = rawDockerHost.replace(/^"([\s\S]*)"$/, "$1");

  if (dockerHost) {
    try {
      const hostLower = dockerHost.toLowerCase();

      if (hostLower.includes("pipe") || hostLower.startsWith("\\\\.")) {
        const socketPath =
          process.platform === "win32" ? "//./pipe/docker_engine" : dockerHost;
        const prevDockerHost = process.env.DOCKER_HOST;
        try {
          delete process.env.DOCKER_HOST;
          docker = new Docker({ socketPath });
        } finally {
          if (typeof prevDockerHost !== "undefined") {
            process.env.DOCKER_HOST = prevDockerHost;
          } else {
            delete process.env.DOCKER_HOST;
          }
        }

        return docker;
      }

      const parsed = new URL(dockerHost);

      if (
        parsed.protocol === "tcp:" ||
        parsed.protocol === "http:" ||
        parsed.protocol === "https:"
      ) {
        docker = new Docker({
          host: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : 2375,
          protocol: parsed.protocol.replace(":", "") as "http" | "https",
        });

        return docker;
      }

      if (parsed.protocol === "unix:") {
        docker = new Docker({ socketPath: parsed.pathname });
        return docker;
      }
    } catch {
    }
  }

  const defaultSocketPath =
    process.platform === "win32"
      ? "//./pipe/docker_engine"
      : "/var/run/docker.sock";

  const prevDockerHost = process.env.DOCKER_HOST;
  try {
    delete process.env.DOCKER_HOST;
    docker = new Docker({ socketPath: defaultSocketPath });
  } finally {
    if (typeof prevDockerHost !== "undefined") {
      process.env.DOCKER_HOST = prevDockerHost;
    } else {
      delete process.env.DOCKER_HOST;
    }
  }

  return docker;
}

/**
 * @description Returns the shared Docker client instance.
 * @returns The singleton Dockerode instance.
 */
export function getDocker(): Docker {
  try {
    return createDockerClient();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[docker] failed to create Docker client:", err);
    const stub: any = {
      createContainer: async () => {
        throw new Error("Docker unavailable");
      },
      getContainer: () => ({
        exec: async () => {
          throw new Error("Docker unavailable");
        },
        start: async () => {
          throw new Error("Docker unavailable");
        },
        inspect: async () => {
          throw new Error("Docker unavailable");
        },
        stop: async () => {},
        remove: async () => {},
      }),
    };

    return stub as Docker;
  }
}

/**
 * @description Creates a new container for a user environment.
 * Sets up a bind mount from the host workspace directory into
 * `/workspace` inside the container and keeps the container alive
 * with `tail -f /dev/null`.
 * @param userId  - Owner's database ID (stored as a label).
 * @param username - Owner's username (used in the host path).
 * @param envName  - Environment name (used in the host path).
 * @param image    - Docker image to use (e.g. `node:lts-alpine`).
 * @returns The newly created container's ID.
 */
export async function createEnvironmentContainer(
  userId: string,
  username: string,
  envName: string,
  image: string,
): Promise<string> {
  const docker = getDocker();
  
  let hostBase = process.env.HOST_WORKSPACES_ROOT || WORKSPACES_ROOT;
  if (!path.isAbsolute(hostBase)) {
    hostBase = path.resolve(process.cwd(), hostBase);
  }
  const hostPath = `${hostBase}/${username}/${envName}`.replace(/\\/g, '/');
  
  const localPath = path.resolve(WORKSPACES_ROOT, username, envName);
  await fs.mkdir(localPath, { recursive: true });

  const container = await docker.createContainer({
    Image: image,
    Cmd: ["tail", "-f", "/dev/null"],
    WorkingDir: "/workspace",
    Tty: true,
    OpenStdin: true,
    HostConfig: {
      Binds: [`${hostPath}:/workspace`],
    },
    Labels: {
      "isopod.userId": userId,
      "isopod.envName": envName,
    },
  });

  return container.id;
}

/**
 * @description Starts a stopped container.
 * @param containerId - The Docker container ID to start.
 */
export async function startContainer(containerId: string): Promise<void> {
  const docker = getDocker();
  const container = docker.getContainer(containerId);
  await container.start();
}

/**
 * @description Gracefully stops a running container. Silently
 * ignores errors when the container is already stopped.
 * @param containerId - The Docker container ID to stop.
 */
export async function stopContainer(containerId: string): Promise<void> {
  const docker = getDocker();
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
  } catch {
  }
}

/**
 * @description Force-removes a container regardless of its state.
 * @param containerId - The Docker container ID to remove.
 */
export async function removeContainer(containerId: string): Promise<void> {
  const docker = getDocker();
  const container = docker.getContainer(containerId);
  await container.remove({ force: true });
}

/**
 * @description Inspects a container and returns its status mapped
 * to an `EnvironmentStatus` value.
 * @param containerId - The Docker container ID to inspect.
 * @returns The resolved environment status.
 */
export async function getContainerStatus(
  containerId: string,
): Promise<EnvironmentStatus> {
  const docker = getDocker();
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info.State.Running ? "running" : "stopped";
  } catch {
    return "error";
  }
}

/**
 * @description Creates an interactive exec session inside a
 * container, suitable for piping to/from an xterm.js terminal
 * over WebSocket.
 * @param containerId - The Docker container ID to exec into.
 * @returns A duplex stream connected to the container's PTY.
 */
export async function execInteractive(
  containerId: string,
): Promise<NodeJS.ReadWriteStream> {
  const docker = getDocker();
  const container = docker.getContainer(containerId);

  const exec = await container.exec({
    Cmd: ["/bin/sh"],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
  });

  const stream = await exec.start({
    hijack: true,
    stdin: true,
    Tty: true,
  });

  return stream;
}
