package com.isopod.server.core.websocket;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.async.ResultCallback;
import com.github.dockerjava.api.command.ExecCreateCmdResponse;
import com.github.dockerjava.api.model.Frame;
import com.isopod.server.domain.environment.Environment;
import com.isopod.server.domain.environment.EnvironmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket handler that bridges a client terminal to a Docker exec session.
 */
@Component
@RequiredArgsConstructor
public class TerminalWebSocketHandler extends TextWebSocketHandler {

    private final DockerClient dockerClient;
    private final EnvironmentRepository environmentRepository;

    private final Map<String, PipedOutputStream> sessionInputStreams = new ConcurrentHashMap<>();
    private final Map<String, ResultCallback<Frame>> sessionOutputCallbacks = new ConcurrentHashMap<>();

    /**
     * Called when a new WebSocket connection is established.
     * Starts the Docker exec session and pipes the output back to the client.
     *
     * @param session the WebSocket session
     * @throws Exception if an error occurs
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String query = session.getUri() != null ? session.getUri().getQuery() : "";
        String envId = extractEnvId(query);

        if (envId == null) {
            session.close(new CloseStatus(4000, "Missing envId query parameter"));
            return;
        }

        Environment env = environmentRepository.findById(envId).orElse(null);
        if (env == null || env.getContainerId() == null) {
            session.close(new CloseStatus(4004, "Environment not found or not running"));
            return;
        }

        ExecCreateCmdResponse execResponse = dockerClient.execCreateCmd(env.getContainerId())
                .withAttachStdout(true)
                .withAttachStderr(true)
                .withAttachStdin(true)
                .withTty(true)
                .withCmd("bash")
                .exec();

        PipedInputStream in = new PipedInputStream();
        PipedOutputStream out = new PipedOutputStream(in);
        sessionInputStreams.put(session.getId(), out);

        ResultCallback<Frame> callback = new ResultCallback.Adapter<Frame>() {
            @Override
            public void onNext(Frame frame) {
                try {
                    if (session.isOpen()) {
                        String text = new String(frame.getPayload(), StandardCharsets.UTF_8);
                        session.sendMessage(new TextMessage(text));
                    }
                } catch (IOException e) {
                    // Ignore
                }
            }

            @Override
            public void onError(Throwable throwable) {
                if (throwable.getMessage() != null && throwable.getMessage().toLowerCase().contains("pipe")) {
                    // Ignore expected pipe closure during container stop/deletion
                    return;
                }
                super.onError(throwable);
            }

            @Override
            public void onComplete() {
                try {
                    if (session.isOpen()) {
                        session.close();
                    }
                } catch (IOException e) {
                    // Ignore
                }
            }
        };

        sessionOutputCallbacks.put(session.getId(), callback);

        dockerClient.execStartCmd(execResponse.getId())
                .withTty(true)
                .withStdIn(in)
                .exec(callback);
    }

    /**
     * Called when a message arrives from the WebSocket client.
     * Forwards the message to the Docker exec session's standard input.
     *
     * @param session the WebSocket session
     * @param message the text message received
     * @throws Exception if an error occurs
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        PipedOutputStream out = sessionInputStreams.get(session.getId());
        if (out != null) {
            out.write(message.getPayload().getBytes(StandardCharsets.UTF_8));
            out.flush();
        }
    }

    /**
     * Called when the WebSocket connection is closed.
     * Cleans up the associated streams and callbacks.
     *
     * @param session the WebSocket session
     * @param status  the close status
     * @throws Exception if an error occurs
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        PipedOutputStream out = sessionInputStreams.remove(session.getId());
        if (out != null) {
            out.close();
        }

        ResultCallback<Frame> callback = sessionOutputCallbacks.remove(session.getId());
        if (callback != null) {
            callback.close();
        }
    }

    private String extractEnvId(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] pair = param.split("=");
            if (pair.length == 2 && "envId".equals(pair[0])) {
                return pair[1];
            }
        }
        return null;
    }
}
