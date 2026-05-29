#!/bin/bash
# ==============================================================================
# Isopod Container Entrypoint
#
# Bootstraps the internal PostgreSQL database on first run and dynamically
# resolves the DOOD (Docker-Out-Of-Docker) host bind mount path for workspaces
# before handing off execution to Supervisord (PID 1).
# ==============================================================================
set -e

# ==============================================================================
# Database Initialization
# provisions the PostgreSQL data directory, roles, and default database on first boot.
# ==============================================================================
if [ ! -f /data/postgresql/PG_VERSION ]; then
    chown -R postgres:postgres /data/postgresql
    su postgres -c "initdb -D /data/postgresql"

    echo "host all all 127.0.0.1/32 trust" > /data/postgresql/pg_hba.conf
    echo "host all all ::1/128 trust" >> /data/postgresql/pg_hba.conf
    echo "local all all trust" >> /data/postgresql/pg_hba.conf

    su postgres -c "pg_ctl -D /data/postgresql -l /tmp/pg_init.log start -w"
    su postgres -c "psql -c \"CREATE USER m4vi WITH PASSWORD 'isopod@m4vi';\""
    su postgres -c "psql -c \"CREATE DATABASE isopod OWNER m4vi;\""
    su postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE isopod TO m4vi;\""
    su postgres -c "pg_ctl -D /data/postgresql stop -m fast"
fi

# ==============================================================================
# Directory Permissions & Workspace Provisioning
# Secures daemon directories and initializes the container workspace target.
# ==============================================================================
chown -R postgres:postgres /data/postgresql
chown -R redis:redis /data/redis
mkdir -p /workspaces

# ==============================================================================
# DOOD (Docker-Out-Of-Docker) Host Resolution
# Dynamically inspects the daemon to resolve the absolute physical host path of the
# anonymous workspace volume, passing it to the Spring Boot backend.
# ==============================================================================
CONTAINER_ID=$(hostname)
WORKSPACE_SOURCE=$(docker inspect "$CONTAINER_ID" --format '{{range .Mounts}}{{if eq .Destination "/workspaces"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || echo "")

if [ -n "$WORKSPACE_SOURCE" ]; then
    export WORKSPACE_HOST="$WORKSPACE_SOURCE"
else
    export WORKSPACE_HOST="/workspaces"
fi

# ==============================================================================
# Environment Configuration
# Exports required Spring Boot variables prior to foreground execution.
# ==============================================================================
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/isopod"
export SPRING_DATASOURCE_USERNAME="m4vi"
export SPRING_DATASOURCE_PASSWORD="isopod@m4vi"
export REDIS_HOST="localhost"
export WORKSPACE_ROOT="/workspaces"
export DOCKER_HOST="unix:///var/run/docker.sock"

# ==============================================================================
# Service Orchestration
# Transfers process execution to Supervisord (PID 1) to boot Nginx, Redis, Postgres, and Java.
# ==============================================================================
exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
