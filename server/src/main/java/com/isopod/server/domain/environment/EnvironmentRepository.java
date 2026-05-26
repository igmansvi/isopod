package com.isopod.server.domain.environment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Data access repository for the Environment entity.
 */
@Repository
public interface EnvironmentRepository extends JpaRepository<Environment, String> {

    /**
     * Retrieves all environments owned by a specific user.
     *
     * @param userId the ID of the user
     * @return a list of environments associated with the user
     */
    List<Environment> findAllByUserId(String userId);

    /**
     * Retrieves a specific environment belonging to a specific user.
     *
     * @param id     the ID of the environment
     * @param userId the ID of the user
     * @return an Optional containing the Environment if found, or empty otherwise
     */
    Optional<Environment> findByIdAndUserId(String id, String userId);

    /**
     * Checks if an environment with the given name exists for the specified user.
     *
     * @param userId the ID of the user
     * @param name   the name of the environment
     * @return true if it exists, false otherwise
     */
    boolean existsByUserIdAndName(String userId, String name);
}
