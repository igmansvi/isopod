package com.isopod.server.domain.file;

import com.isopod.server.domain.environment.Environment;
import com.isopod.server.domain.environment.EnvironmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Service handling file operations within a user's environment workspace.
 */
@Service
@RequiredArgsConstructor
public class FileService {

    private final EnvironmentService environmentService;

    /**
     * Lists files and directories at a specific path within the environment's workspace.
     *
     * @param username the username of the owner
     * @param envId    the environment ID
     * @param dirPath  the relative path within the workspace
     * @return a list of file names
     * @throws IOException if an I/O error occurs
     */
    public List<String> listFiles(String username, String envId, String dirPath) throws IOException {
        Environment env = environmentService.getEnvironment(username, envId);
        Path targetPath = resolveAndValidatePath(env.getWorkspacePath(), dirPath);

        if (!Files.isDirectory(targetPath)) {
            throw new IllegalArgumentException("Path is not a directory");
        }

        try (Stream<Path> stream = Files.walk(targetPath)) {
            return stream
                    .filter(p -> !p.equals(targetPath))
                    .map(path -> {
                        String relative = targetPath.relativize(path).toString().replace('\\', '/');
                        return relative + (Files.isDirectory(path) ? "/" : "");
                    })
                    .collect(Collectors.toList());
        }
    }

    /**
     * Reads the content of a file within the environment's workspace.
     *
     * @param username the username of the owner
     * @param envId    the environment ID
     * @param filePath the relative path to the file
     * @return the file content as a string
     * @throws IOException if an I/O error occurs
     */
    public String readFile(String username, String envId, String filePath) throws IOException {
        Environment env = environmentService.getEnvironment(username, envId);
        Path targetPath = resolveAndValidatePath(env.getWorkspacePath(), filePath);

        if (Files.isDirectory(targetPath)) {
            throw new IllegalArgumentException("Path is a directory, not a file");
        }

        return Files.readString(targetPath);
    }

    /**
     * Writes content to a file within the environment's workspace.
     *
     * @param username the username of the owner
     * @param envId    the environment ID
     * @param filePath the relative path to the file
     * @param content  the content to write
     * @throws IOException if an I/O error occurs
     */
    public void writeFile(String username, String envId, String filePath, String content) throws IOException {
        Environment env = environmentService.getEnvironment(username, envId);
        Path targetPath = resolveAndValidatePath(env.getWorkspacePath(), filePath);

        if (targetPath.getParent() != null) {
            Files.createDirectories(targetPath.getParent());
        }

        Files.writeString(targetPath, content);
    }

    /**
     * Creates a new directory inside a workspace.
     *
     * @param username the user's username
     * @param envId    the environment ID
     * @param dirPath  the relative path of the new directory
     * @throws IOException if an I/O error occurs
     */
    public void createDirectory(String username, String envId, String dirPath) throws IOException {
        Environment env = environmentService.getEnvironment(username, envId);
        Path targetPath = resolveAndValidatePath(env.getWorkspacePath(), dirPath);
        Files.createDirectories(targetPath);
    }

    /**
     * Recursively deletes a file or directory inside a workspace.
     *
     * @param username the user's username
     * @param envId    the environment ID
     * @param pathStr  the relative path to delete
     * @throws IOException if an I/O error occurs
     */
    public void deleteEntry(String username, String envId, String pathStr) throws IOException {
        Environment env = environmentService.getEnvironment(username, envId);
        Path targetPath = resolveAndValidatePath(env.getWorkspacePath(), pathStr);
        if (Files.exists(targetPath)) {
            if (Files.isDirectory(targetPath)) {
                try (var stream = Files.walk(targetPath)) {
                    stream.sorted(Comparator.reverseOrder())
                          .map(Path::toFile)
                          .forEach(java.io.File::delete);
                }
            } else {
                Files.delete(targetPath);
            }
        }
    }

    private Path resolveAndValidatePath(String workspacePath, String relativePath) {
        Path root = Paths.get(workspacePath).normalize().toAbsolutePath();
        
        if (relativePath != null && relativePath.startsWith("/")) {
            relativePath = relativePath.substring(1);
        }
        
        Path target = root.resolve(relativePath != null ? relativePath : "").normalize().toAbsolutePath();

        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Path traversal attempt detected");
        }
        return target;
    }
}
