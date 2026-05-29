# ==============================================================================
# Stage 1: Client Build
# Compiles the Angular Standalone Application for production distribution.
# ==============================================================================
FROM node:lts-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production
RUN npm run build -- --configuration=production

# ==============================================================================
# Stage 2: Static Server
# Provisions a lightweight Node Alpine environment to serve compiled assets.
# ==============================================================================
FROM node:lts-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist/client/browser ./dist
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
