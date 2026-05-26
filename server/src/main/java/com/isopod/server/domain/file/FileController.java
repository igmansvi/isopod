package com.isopod.server.domain.file;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Map;

/**
 * REST controller exposing endpoints for workspace file management.
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    /**
     * Retrieves a file's content or a directory's listing.
     *
     * @param envId          the environment ID
     * @param path           the relative path
     * @param action         "read" or "list"
     * @param authentication the user authentication
     * @return the file content or directory listing
     * @throws IOException if an I/O error occurs
     */
    @GetMapping
    public ResponseEntity<?> getFileOrDirectory(
            @RequestParam String envId,
            @RequestParam(required = false, defaultValue = "") String path,
            @RequestParam(required = false, defaultValue = "read") String action,
            Authentication authentication
    ) throws IOException {
        String username = authentication.getName();
        if ("list".equalsIgnoreCase(action)) {
            return ResponseEntity.ok(fileService.listFiles(username, envId, path));
        } else {
            return ResponseEntity.ok(Map.of("content", fileService.readFile(username, envId, path)));
        }
    }

    /**
     * Writes content to a file in the workspace.
     *
     * @param payload        a map containing envId, path, and content
     * @param authentication the user authentication
     * @return an empty response
     * @throws IOException if an I/O error occurs
     */
    @PostMapping
    public ResponseEntity<Void> writeFile(
            @RequestBody Map<String, String> payload,
            Authentication authentication
    ) throws IOException {
        String envId = payload.get("envId");
        String path = payload.get("path");
        String content = payload.get("content");
        
        fileService.writeFile(authentication.getName(), envId, path, content);
        return ResponseEntity.ok().build();
    }

    /**
     * Creates a new directory in the workspace.
     *
     * @param payload        a map containing envId and path
     * @param authentication the user authentication
     * @return an empty response
     * @throws IOException if an I/O error occurs
     */
    @PostMapping("/dir")
    public ResponseEntity<Void> createDirectory(
            @RequestBody Map<String, String> payload,
            Authentication authentication
    ) throws IOException {
        String envId = payload.get("envId");
        String path = payload.get("path");
        
        fileService.createDirectory(authentication.getName(), envId, path);
        return ResponseEntity.ok().build();
    }

    /**
     * Deletes a file or directory from the workspace.
     *
     * @param envId          the environment ID
     * @param path           the relative path
     * @param authentication the user authentication
     * @return an empty response
     * @throws IOException if an I/O error occurs
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteEntry(
            @RequestParam String envId,
            @RequestParam String path,
            Authentication authentication
    ) throws IOException {
        fileService.deleteEntry(authentication.getName(), envId, path);
        return ResponseEntity.ok().build();
    }
}
