package com.isopod.server.domain.environment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for creating a new Environment.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EnvironmentCreateDTO {

    @NotBlank(message = "Environment name is required")
    @Pattern(regexp = "^[a-zA-Z0-9-]+$", message = "Name must contain only alphanumeric characters and hyphens")
    private String name;

    private String image;
}
