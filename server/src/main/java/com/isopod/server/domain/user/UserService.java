package com.isopod.server.domain.user;

import com.isopod.server.domain.environment.Environment;
import com.isopod.server.domain.environment.EnvironmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service handling business logic for user accounts.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final EnvironmentService environmentService;

    /**
     * Deletes a user account, including cascading deletion of all associated
     * environments, Docker containers, and physical workspace files.
     *
     * @param username the username of the account to delete
     */
    @Transactional
    public void deleteAccount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Environment> environments = environmentService.getEnvironmentsForUser(username);
        
        for (Environment env : environments) {
            environmentService.deleteEnvironment(username, env.getId());
        }
        
        environmentService.deleteUserWorkspaceDir(username);

        userRepository.delete(user);
    }
}
