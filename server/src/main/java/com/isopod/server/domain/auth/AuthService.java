package com.isopod.server.domain.auth;

import com.isopod.server.core.security.JwtService;
import com.isopod.server.domain.user.User;
import com.isopod.server.domain.user.UserRepository;
import com.isopod.server.domain.environment.EnvironmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;

/**
 * Service responsible for user authentication and registration logic.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EnvironmentService environmentService;

    /**
     * Registers a new user and generates a JWT token for them.
     *
     * @param request the authentication request containing username and password
     * @return the authentication response containing the generated JWT
     */
    public AuthResponseDTO register(AuthRequestDTO request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username is already taken");
        }

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        try {
            environmentService.createStoppedEnvironment(user.getUsername(), "default-ubuntu", "ubuntu:latest");
        } catch (Exception e) {
            e.printStackTrace();
        }

        org.springframework.security.core.userdetails.UserDetails userDetails = 
                org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(Collections.emptyList())
                .build();

        String jwtToken = jwtService.generateToken(userDetails);
        
        return AuthResponseDTO.builder()
                .token(jwtToken)
                .build();
    }

    /**
     * Authenticates an existing user and generates a new JWT token.
     *
     * @param request the authentication request containing username and password
     * @return the authentication response containing the generated JWT
     */
    public AuthResponseDTO login(AuthRequestDTO request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        org.springframework.security.core.userdetails.UserDetails userDetails = 
                org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(Collections.emptyList())
                .build();

        String jwtToken = jwtService.generateToken(userDetails);
        
        return AuthResponseDTO.builder()
                .token(jwtToken)
                .build();
    }
}
