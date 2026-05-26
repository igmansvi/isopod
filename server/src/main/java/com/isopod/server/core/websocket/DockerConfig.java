package com.isopod.server.core.websocket;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.zerodep.ZerodepDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Configuration class that sets up the Docker Java client.
 * Uses the OkHttp transport which natively supports Windows named pipes,
 * falling back to the standard Docker Desktop named pipe when {@code DOCKER_HOST} is unset.
 */
@Configuration
public class DockerConfig {

    /**
     * Creates and configures the DockerClient bean used to interact with the Docker daemon.
     * Reads the {@code DOCKER_HOST} environment variable when set, falling back to the
     * standard Docker Desktop Windows named pipe {@code npipe:////./pipe/docker_engine}.
     *
     * @return a fully configured DockerClient instance
     */
    @Bean
    public DockerClient dockerClient() {
        String dockerHost = System.getenv("DOCKER_HOST");
        if (dockerHost == null || dockerHost.isBlank()) {
            dockerHost = "npipe:////./pipe/docker_engine";
        }

        DockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
                .withDockerHost(dockerHost)
                .build();

        DockerHttpClient httpClient = new ZerodepDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .sslConfig(config.getSSLConfig())
                .maxConnections(100)
                .build();

        return DockerClientImpl.getInstance(config, httpClient);
    }
}
