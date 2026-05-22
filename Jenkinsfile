pipeline {
    agent any

    environment {
        /**
         * @brief List of base environment images required for Isopod workspaces.
         *
         * These images are checked locally and pulled if missing before validation.
         */
        ENV_IMAGES = "ubuntu:latest node:latest gcc:latest eclipse-temurin:latest"
    }

    stages {
        /**
         * @brief Verifies that Docker is installed and the daemon is running.
         */
        stage('Check Docker') {
            steps {
                script {
                    echo "Checking if Docker is installed and daemon is running..."
                    if (isUnix()) {
                        sh 'docker --version'
                        sh 'docker info'
                    } else {
                        bat 'docker --version'
                        bat 'docker info'
                    }
                }
            }
        }

        /**
         * @brief Ensures all required environment images exist locally and pulls any missing images.
         */
        stage('Check and Fetch Environments') {
            steps {
                script {
                    def images = env.ENV_IMAGES.split(' ')
                    
                    for (int i = 0; i < images.length; i++) {
                        def img = images[i]
                        echo "---------------------------------------------------"
                        echo "Checking environment image: ${img}"
                        
                        def exists = false
                        if (isUnix()) {
                            exists = sh(script: "docker image inspect ${img} > /dev/null 2>&1", returnStatus: true) == 0
                        } else {
                            exists = bat(script: "docker image inspect ${img} >nul 2>&1", returnStatus: true) == 0
                        }
                        
                        if (exists) {
                            echo "✅ Environment image '${img}' already exists locally."
                        } else {
                            echo "❌ Environment image '${img}' not found. Fetching now..."
                            if (isUnix()) {
                                sh "docker pull ${img}"
                            } else {
                                bat "docker pull ${img}"
                            }
                            echo "✅ Successfully fetched '${img}'."
                        }
                    }
                }
            }
        }
        
        /**
         * @brief Validates the local docker-compose configuration for testing.
         */
        stage('Local Test Validation') {
            steps {
                script {
                    echo "Validating docker-compose configuration for local testing..."
                    if (isUnix()) {
                        sh 'docker-compose config -q'
                    } else {
                        bat 'docker-compose config -q'
                    }
                    echo "✅ Docker compose configuration is valid!"
                }
            }
        }
    }
}
