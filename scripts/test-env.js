/**
 * @file test-env.js
 * @brief Script to verify local Docker environment and fetch required images.
 *
 * This script performs the following checks in order:
 *  - Verifies that Docker is installed and the daemon is running.
 *  - Ensures a list of environment images are present locally; pulls them if missing.
 *  - Validates docker-compose configuration for local testing.
 *
 * Exit codes:
 *  - 0: All checks passed.
 *  - 1: Any check failed (Docker missing, image pull failed, or compose invalid).
 */

const { execSync } = require("child_process");

/**
 * @brief List of environment images required for local testing.
 * @type {string[]}
 */
const ENV_IMAGES = [
  "ubuntu:latest",
  "node:latest",
  "gcc:latest",
  "eclipse-temurin:latest",
];

/**
 * @brief Check that Docker is installed and the daemon is running.
 *
 * This step runs `docker --version` to show the client and `docker info`
 * to confirm the daemon is reachable. On failure the process exits with code 1.
 */
console.log("Checking if Docker is installed and running...");
try {
  execSync("docker --version", { stdio: "inherit" });
  execSync("docker info", { stdio: "ignore" });
} catch (error) {
  console.error("❌ Docker is not installed or the daemon is not running.");
  process.exit(1);
}

console.log(
  "\nDocker is active! Checking and fetching environment images...\n",
);

/**
 * @brief Ensure each required image is available locally, pulling if necessary.
 * @param {string} img Docker image reference to check/pull.
 */
for (const img of ENV_IMAGES) {
  console.log(`---------------------------------------------------`);
  console.log(`Checking environment image: ${img}`);
  try {
    // If inspect succeeds the image exists locally.
    execSync(`docker image inspect ${img}`, { stdio: "ignore" });
    console.log(`✅ Environment image '${img}' already exists locally.`);
  } catch (error) {
    // Image missing: attempt to pull.
    console.log(`❌ Environment image '${img}' not found. Fetching now...`);
    try {
      execSync(`docker pull ${img}`, { stdio: "inherit" });
      console.log(`✅ Successfully fetched '${img}'.`);
    } catch (pullError) {
      console.error(`❌ Failed to fetch '${img}'.`);
      process.exit(1);
    }
  }
}

/**
 * @brief Validate docker-compose configuration for the project.
 *
 * Uses `docker-compose config -q` which returns exit code 0 when the
 * configuration is valid. On failure the process exits with code 1.
 */
console.log("\n---------------------------------------------------");
console.log("Validating docker-compose configuration for local testing...");
try {
  execSync("docker-compose config -q", { stdio: "inherit" });
  console.log("✅ Docker compose configuration is valid!");
} catch (error) {
  console.error("❌ Docker compose validation failed.");
  process.exit(1);
}

console.log("\n🚀 All local environment tests passed successfully!");
