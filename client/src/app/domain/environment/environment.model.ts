/**
 * Represents a Docker-backed development environment.
 */
export interface Environment {
  id: string;
  name: string;
  image: string;
  containerId: string | null;
  status: 'running' | 'stopped' | 'error';
  workspacePath: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a new environment.
 */
export interface EnvironmentCreateDTO {
  name: string;
  image?: string;
}
