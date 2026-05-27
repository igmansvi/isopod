package com.isopod.server.domain.user;

import com.isopod.server.core.cache.FallbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
/**
 * Manages active WebSocket sessions and caches UserDetails using Redis.
 * This prevents excessive queries to the PostgreSQL database during active sessions.
 */
@Service
@RequiredArgsConstructor
public class UserSessionService {

    private final FallbackService fallbackService;
    private final UserRepository userRepository;

    private static final String SESSION_PREFIX = "session:";
    private static final String CACHE_PREFIX = "user_cache:";

    /**
     * Registers an active WebSocket session for a user and environment.
     */
    public void registerSession(String sessionId, String userId, String envId) {
        String key = SESSION_PREFIX + sessionId;
        String value = userId + ":" + envId;
        fallbackService.setValue(key, value, Duration.ofHours(24));
    }

    /**
     * Removes an active WebSocket session.
     */
    public void removeSession(String sessionId) {
        fallbackService.delete(SESSION_PREFIX + sessionId);
    }

    /**
     * Fetches UserDetails, leveraging Redis as a cache.
     *
     * @param username the username to look up
     * @return UserDetails containing the cached user information
     * @throws UsernameNotFoundException if the user does not exist
     */
    public UserDetails getCachedUser(String username) throws UsernameNotFoundException {
        String cacheKey = CACHE_PREFIX + username;
        String cachedHash = fallbackService.getValue(cacheKey);

        if (cachedHash != null) {
            return org.springframework.security.core.userdetails.User
                    .withUsername(username)
                    .password(cachedHash)
                    .authorities(Collections.emptyList())
                    .build();
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        fallbackService.setValue(cacheKey, user.getPasswordHash(), Duration.ofHours(1));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(Collections.emptyList())
                .build();
    }
}
