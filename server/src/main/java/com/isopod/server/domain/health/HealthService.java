package com.isopod.server.domain.health;

import com.github.dockerjava.api.DockerClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Service managing system telemetry, performing Docker health pings,
 * and pulling base images eagerly upon server boot.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HealthService implements CommandLineRunner {

    private final DockerClient dockerClient;
    
    private final List<String> BASE_IMAGES = List.of(
            "ubuntu:latest",
            "node:latest",
            "gcc:latest",
            "eclipse-temurin:latest"
    );

    @Override
    public void run(String... args) throws Exception {
        log.info("Performing Docker daemon health check...");
        try {
            dockerClient.pingCmd().exec();
            log.info("Docker daemon is accessible.");
        } catch (Exception e) {
            log.warn("Docker daemon is not accessible. Container provisioning will be unavailable until Docker is started.");
            return;
        }

        log.info("Checking for required base images...");
        for (String image : BASE_IMAGES) {
            try {
                dockerClient.inspectImageCmd(image).exec();
                log.info("Image {} is already cached.", image);
            } catch (Exception e) {
                log.info("Image {} is missing. Pulling now (this may take a while)...", image);
                try {
                    dockerClient.pullImageCmd(image).start().awaitCompletion();
                    log.info("Successfully pulled {}.", image);
                } catch (InterruptedException ex) {
                    log.error("Interrupted while pulling {}", image);
                    Thread.currentThread().interrupt();
                }
            }
        }
        log.info("Startup Health Check complete. All systems nominal.");
    }

    /**
     * Aggregates live system telemetry.
     *
     * @return a map containing server and docker status
     */
    public Map<String, Object> getSystemHealth() {
        boolean dockerUp = true;
        try {
            dockerClient.pingCmd().exec();
        } catch (Exception e) {
            dockerUp = false;
        }

        return Map.of(
                "server", "up",
                "docker", dockerUp ? "up" : "down",
                "cachedImages", BASE_IMAGES
        );
    }
}
