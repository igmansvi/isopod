package com.isopod.server.core.cache;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * A highly resilient abstraction layer over Redis operations.
 * Automatically detects Redis availability on startup and gracefully
 * falls back to using concurrent in-memory data structures if unavailable.
 */
@Service
public class FallbackService {

    private final StringRedisTemplate redisTemplate;
    private final boolean redisEnabled;

    private final ConcurrentHashMap<String, String> valueStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<String>> listStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> setStore = new ConcurrentHashMap<>();

    public FallbackService(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        boolean isAvailable = false;
        if (redisTemplate != null) {
            try {
                redisTemplate.execute((RedisCallback<String>) connection -> {
                    String response = connection.ping();
                    return response != null ? response : "PONG";
                });
                isAvailable = true;
            } catch (Exception e) {
                isAvailable = false;
            }
        }
        this.redisEnabled = isAvailable;
    }

    public boolean isRedisEnabled() {
        return redisEnabled;
    }

    public void setValue(String key, String value) {
        if (redisEnabled && redisTemplate != null) {
            redisTemplate.opsForValue().set(key, value);
        } else {
            valueStore.put(key, value);
        }
    }

    public void setValue(String key, String value, Duration timeout) {
        if (redisEnabled && redisTemplate != null) {
            redisTemplate.opsForValue().set(key, value, timeout);
        } else {
            valueStore.put(key, value);
        }
    }

    public String getValue(String key) {
        if (redisEnabled && redisTemplate != null) {
            return redisTemplate.opsForValue().get(key);
        } else {
            return valueStore.get(key);
        }
    }

    public void rightPush(String key, String value) {
        if (redisEnabled && redisTemplate != null) {
            redisTemplate.opsForList().rightPush(key, value);
        } else {
            listStore.computeIfAbsent(key, k -> new ConcurrentLinkedQueue<>()).add(value);
        }
    }

    public void rightPushAll(String key, List<String> values) {
        if (redisEnabled && redisTemplate != null) {
            redisTemplate.opsForList().rightPushAll(key, values);
        } else {
            listStore.computeIfAbsent(key, k -> new ConcurrentLinkedQueue<>()).addAll(values);
        }
    }

    public List<String> getList(String key) {
        if (redisEnabled && redisTemplate != null) {
            return redisTemplate.opsForList().range(key, 0, -1);
        } else {
            ConcurrentLinkedQueue<String> queue = listStore.get(key);
            return queue == null ? List.of() : List.copyOf(queue);
        }
    }

    public void addSet(String key, String value) {
        if (redisEnabled && redisTemplate != null) {
            redisTemplate.opsForSet().add(key, value);
        } else {
            setStore.computeIfAbsent(key, k -> ConcurrentHashMap.newKeySet()).add(value);
        }
    }

    public Set<String> getSet(String key) {
        if (redisEnabled && redisTemplate != null) {
            return redisTemplate.opsForSet().members(key);
        } else {
            Set<String> set = setStore.get(key);
            return set == null ? Set.of() : Set.copyOf(set);
        }
    }

    public void removeSet(String key, String value) {
        if (redisEnabled && redisTemplate != null) {
            redisTemplate.opsForSet().remove(key, value);
        } else {
            Set<String> set = setStore.get(key);
            if (set != null) {
                set.remove(value);
            }
        }
    }

    public void delete(String key) {
        if (redisEnabled && redisTemplate != null) {
            redisTemplate.delete(key);
        } else {
            valueStore.remove(key);
            listStore.remove(key);
            setStore.remove(key);
        }
    }
}
