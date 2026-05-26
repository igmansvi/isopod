# Stage 1: Build the Angular application
FROM node:lts-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the client source code
COPY . .

# Build the Angular application for production
RUN npm run build -- --configuration=production

# Stage 2: Serve the application with Node Alpine
FROM node:lts-alpine

# Set the working directory
WORKDIR /app

# Install the 'serve' package globally to serve static files
RUN npm install -g serve

# Copy the compiled Angular build artifacts from the build stage
COPY --from=build /app/dist/client/browser ./dist

# Expose port 8080 for HTTP traffic
EXPOSE 8080

# Start the static server
CMD ["serve", "-s", "dist", "-l", "8080"]
