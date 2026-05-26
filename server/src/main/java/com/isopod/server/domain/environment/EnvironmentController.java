package com.isopod.server.domain.environment;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller exposing endpoints for environment management.
 */
@RestController
@RequestMapping("/api/environments")
@RequiredArgsConstructor
public class EnvironmentController {

    private final EnvironmentService environmentService;

    /**
     * Retrieves all environments for the authenticated user.
     *
     * @param authentication the authentication token containing the username
     * @return a list of environments
     */
    @GetMapping
    public ResponseEntity<List<Environment>> getEnvironments(Authentication authentication) {
        return ResponseEntity.ok(environmentService.getEnvironmentsForUser(authentication.getName()));
    }

    /**
     * Retrieves a specific environment by ID for the authenticated user.
     *
     * @param id             the environment ID
     * @param authentication the authentication token containing the username
     * @return the environment details
     */
    @GetMapping("/{id}")
    public ResponseEntity<Environment> getEnvironment(@PathVariable String id, Authentication authentication) {
        return ResponseEntity.ok(environmentService.getEnvironment(authentication.getName(), id));
    }

    /**
     * Creates a new environment for the authenticated user.
     *
     * @param request        the creation request details
     * @param authentication the authentication token containing the username
     * @return the created environment
     */
    @PostMapping
    public ResponseEntity<Environment> createEnvironment(
            @Valid @RequestBody EnvironmentCreateDTO request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(environmentService.createEnvironment(authentication.getName(), request));
    }

    /**
     * Starts a stopped environment.
     *
     * @param id             the environment ID
     * @param authentication the authentication token containing the username
     * @return the updated environment
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<Environment> startEnvironment(@PathVariable String id, Authentication authentication) {
        return ResponseEntity.ok(environmentService.startEnvironment(authentication.getName(), id));
    }

    /**
     * Stops a running environment.
     *
     * @param id             the environment ID
     * @param authentication the authentication token containing the username
     * @return the updated environment
     */
    @PostMapping("/{id}/stop")
    public ResponseEntity<Environment> stopEnvironment(@PathVariable String id, Authentication authentication) {
        return ResponseEntity.ok(environmentService.stopEnvironment(authentication.getName(), id));
    }

    /**
     * Deletes an environment.
     *
     * @param id             the environment ID
     * @param authentication the authentication token containing the username
     * @return an empty response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEnvironment(@PathVariable String id, Authentication authentication) {
        environmentService.deleteEnvironment(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
