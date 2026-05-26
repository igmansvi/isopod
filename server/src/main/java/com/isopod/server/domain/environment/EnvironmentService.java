package com.isopod.server.domain.environment;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.Volume;
import com.isopod.server.domain.user.User;
import com.isopod.server.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.List;
import org.springframework.util.FileSystemUtils;

/**
 * Service handling business logic for environments and Docker container lifecycle.
 */
@Service
@RequiredArgsConstructor
public class EnvironmentService {

    private final EnvironmentRepository environmentRepository;
    private final UserRepository userRepository;
    private final DockerClient dockerClient;

    @Value("${application.workspace.root:./workspaces}")
    private String workspacesRoot;

    /**
     * Retrieves all environments for a specific user.
     *
     * @param username the username of the owner
     * @return a list of environments
     */
    public List<Environment> getEnvironmentsForUser(String username) {
        User user = getUserByUsername(username);
        return environmentRepository.findAllByUserId(user.getId());
    }

    /**
     * Retrieves a specific environment for a user.
     *
     * @param username the username of the owner
     * @param envId    the environment ID
     * @return the environment
     */
    public Environment getEnvironment(String username, String envId) {
        User user = getUserByUsername(username);
        return environmentRepository.findByIdAndUserId(envId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Environment not found or access denied"));
    }

    /**
     * Creates a new environment, provisions a workspace directory, and starts a Docker container.
     *
     * @param username the username of the owner
     * @param request  the creation request details
     * @return the created environment
     */
    public Environment createEnvironment(String username, EnvironmentCreateDTO request) {
        User user = getUserByUsername(username);

        if (environmentRepository.existsByUserIdAndName(user.getId(), request.getName())) {
            throw new IllegalArgumentException("An environment with this name already exists");
        }

        String image = request.getImage() != null && !request.getImage().isBlank() ? request.getImage() : "node:lts-alpine";
        
        try {
            dockerClient.inspectImageCmd(image).exec();
        } catch (Exception e) {
            dockerClient.pullImageCmd(image).start();
        }

        String hostWorkspacePath = new File(workspacesRoot, username + File.separator + request.getName()).getAbsolutePath();
        File workspaceDir = new File(hostWorkspacePath);
        if (!workspaceDir.exists()) {
            workspaceDir.mkdirs();
        }

        HostConfig hostConfig = HostConfig.newHostConfig()
                .withBinds(new Bind(hostWorkspacePath, new Volume("/workspace")));

        CreateContainerResponse container = dockerClient.createContainerCmd(image)
                .withName("isopod-" + user.getId() + "-" + request.getName())
                .withHostConfig(hostConfig)
                .withWorkingDir("/workspace")
                .withTty(true)
                .withCmd("sh", "-c", "while true; do sleep 3600; done")
                .exec();

        dockerClient.startContainerCmd(container.getId()).exec();

        Environment env = Environment.builder()
                .name(request.getName())
                .image(image)
                .containerId(container.getId())
                .status("running")
                .workspacePath(hostWorkspacePath)
                .user(user)
                .build();

        return environmentRepository.save(env);
    }

    /**
     * Creates a new environment without starting the container (used for default provisioning).
     *
     * @param username the username of the owner
     * @param envName  the environment name
     * @param image    the docker image
     * @return the created environment
     */
    public Environment createStoppedEnvironment(String username, String envName, String image) {
        User user = getUserByUsername(username);

        if (environmentRepository.existsByUserIdAndName(user.getId(), envName)) {
            throw new IllegalArgumentException("An environment with this name already exists");
        }

        try {
            dockerClient.inspectImageCmd(image).exec();
        } catch (Exception e) {
            dockerClient.pullImageCmd(image).start();
        }

        String hostWorkspacePath = new File(workspacesRoot, username + File.separator + envName).getAbsolutePath();
        File workspaceDir = new File(hostWorkspacePath);
        if (!workspaceDir.exists()) {
            workspaceDir.mkdirs();
        }

        HostConfig hostConfig = HostConfig.newHostConfig()
                .withBinds(new Bind(hostWorkspacePath, new Volume("/workspace")));

        CreateContainerResponse container = dockerClient.createContainerCmd(image)
                .withName("isopod-" + user.getId() + "-" + envName)
                .withHostConfig(hostConfig)
                .withWorkingDir("/workspace")
                .withTty(true)
                .withCmd("sh", "-c", "while true; do sleep 3600; done")
                .exec();

        Environment env = Environment.builder()
                .name(envName)
                .image(image)
                .containerId(container.getId())
                .status("stopped")
                .workspacePath(hostWorkspacePath)
                .user(user)
                .build();

        return environmentRepository.save(env);
    }

    /**
     * Stops a running environment container.
     *
     * @param username the username of the owner
     * @param envId    the environment ID
     * @return the updated environment
     */
    public Environment stopEnvironment(String username, String envId) {
        Environment env = getEnvironment(username, envId);
        if (env.getContainerId() != null) {
            try {
                dockerClient.stopContainerCmd(env.getContainerId()).exec();
            } catch (Exception e) {
                // Container might already be stopped
            }
        }
        env.setStatus("stopped");
        return environmentRepository.save(env);
    }

    /**
     * Starts a stopped environment container.
     *
     * @param username the username of the owner
     * @param envId    the environment ID
     * @return the updated environment
     */
    public Environment startEnvironment(String username, String envId) {
        Environment env = getEnvironment(username, envId);
        if (env.getContainerId() != null) {
            dockerClient.startContainerCmd(env.getContainerId()).exec();
        }
        env.setStatus("running");
        return environmentRepository.save(env);
    }

    /**
     * Deletes an environment, stopping and removing its Docker container.
     *
     * @param username the username of the owner
     * @param envId    the environment ID
     */
    public void deleteEnvironment(String username, String envId) {
        Environment env = getEnvironment(username, envId);
        if (env.getContainerId() != null) {
            try {
                dockerClient.stopContainerCmd(env.getContainerId()).exec();
            } catch (Exception e) {
                // ignore
            }
            try {
                dockerClient.removeContainerCmd(env.getContainerId()).exec();
            } catch (Exception e) {
                // ignore
            }
        }
        environmentRepository.delete(env);

        // Delete physical workspace directory
        if (env.getWorkspacePath() != null) {
            File workspaceDir = new File(env.getWorkspacePath());
            if (workspaceDir.exists()) {
                FileSystemUtils.deleteRecursively(workspaceDir);
            }
        }
    }

    private User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    /**
     * Deletes the root physical workspace directory for a user.
     * Used when an account is permanently deleted.
     *
     * @param username the username
     */
    public void deleteUserWorkspaceDir(String username) {
        File userWorkspaceDir = new File(workspacesRoot, username);
        if (userWorkspaceDir.exists()) {
            FileSystemUtils.deleteRecursively(userWorkspaceDir);
        }
    }
}
