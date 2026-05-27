package com.isopod.server.domain.environment;

import com.isopod.server.core.cache.FallbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Buffers raw terminal multiplexed streams in Redis and automatically 
 * flushes them to persistent storage when a user's session becomes idle (AFK).
 */
@Service
@RequiredArgsConstructor
public class TerminalLoggingService {

    private final FallbackService fallbackService;
    private final EnvironmentRepository environmentRepository;

    @Value("${application.workspace.root:./workspaces}")
    private String workspacesRoot;

    private static final String LOGS_PREFIX = "logs:";
    private static final String ACTIVITY_PREFIX = "activity:";
    private static final String ACTIVE_ENVS_KEY = "active_envs";
    private static final long AFK_TIMEOUT_MS = 3000;

    private static final Pattern OSC_PATTERN = Pattern.compile("\\x1B\\][^\n]*?(?:\\x07|\\x1B\\\\)");
    private static final Pattern ANSI_PATTERN = Pattern.compile("\\x1B(?:[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~])");

    /**
     * Buffers raw terminal data in Redis and updates the AFK activity tracker.
     *
     * @param envId the unique identifier of the environment
     * @param data the raw output string from the terminal
     */
    public void bufferLog(String envId, String data) {
        fallbackService.rightPush(LOGS_PREFIX + envId, data);
        fallbackService.setValue(ACTIVITY_PREFIX + envId, String.valueOf(System.currentTimeMillis()));
        fallbackService.addSet(ACTIVE_ENVS_KEY, envId);
    }

    /**
     * Runs every second to check if any active environment has been AFK for > 3 seconds.
     * If so, drains its Redis log buffer and flushes it to a dynamically named log file.
     */
    @Scheduled(fixedDelay = 1000)
    @Transactional(readOnly = true)
    public void flushAfkLogs() {
        Set<String> activeEnvs = fallbackService.getSet(ACTIVE_ENVS_KEY);
        if (activeEnvs == null || activeEnvs.isEmpty()) {
            return;
        }

        long now = System.currentTimeMillis();

        for (String envId : activeEnvs) {
            String lastActivityStr = fallbackService.getValue(ACTIVITY_PREFIX + envId);
            if (lastActivityStr == null) {
                continue;
            }

            long lastActivity = Long.parseLong(lastActivityStr);
            if ((now - lastActivity) > AFK_TIMEOUT_MS) {
                flushEnvironmentLogs(envId);
            }
        }
    }

    private void flushEnvironmentLogs(String envId) {
        Environment env = environmentRepository.findById(envId).orElse(null);
        if (env == null) {
            fallbackService.delete(LOGS_PREFIX + envId);
            fallbackService.delete(ACTIVITY_PREFIX + envId);
            fallbackService.removeSet(ACTIVE_ENVS_KEY, envId);
            return;
        }

        List<String> logs = fallbackService.getList(LOGS_PREFIX + envId);
        if (logs == null || logs.isEmpty()) {
            fallbackService.delete(ACTIVITY_PREFIX + envId);
            fallbackService.removeSet(ACTIVE_ENVS_KEY, envId);
            return;
        }
        fallbackService.delete(LOGS_PREFIX + envId);

        String username = env.getUser().getUsername();
        String envName = env.getName();
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneId.of("UTC"));
        String filename = formatter.format(env.getLastAccessedAt().atZone(ZoneId.of("UTC"))) + ".log";

        Path tmpDirPath = Paths.get(workspacesRoot, username, envName, "tmp").toAbsolutePath().normalize();
        Path logFilePath = tmpDirPath.resolve(filename);

        String combinedLogs = String.join("", logs);
        String cleanedLogs = OSC_PATTERN.matcher(combinedLogs).replaceAll("");
        cleanedLogs = ANSI_PATTERN.matcher(cleanedLogs).replaceAll("");

        String header = String.format("\n\n[%s] --- Terminal Activity ---\n", Instant.now().toString());
        String finalOutput = header + cleanedLogs;

        try {
            File tmpDir = tmpDirPath.toFile();
            if (!tmpDir.exists()) {
                tmpDir.mkdirs();
            }

            Files.writeString(logFilePath, finalOutput, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            
            fallbackService.delete(ACTIVITY_PREFIX + envId);
            fallbackService.removeSet(ACTIVE_ENVS_KEY, envId);
            
        } catch (IOException e) {
            e.printStackTrace();
            fallbackService.rightPushAll(LOGS_PREFIX + envId, logs);
        }
    }
}
