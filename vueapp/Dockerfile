# Stage 1: Build the Nuxt.js application
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json from the vueapp directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application for static generation
RUN npm run generate

# Stage 2: Wev server using Nginx
FROM nginx:alpine

# Copy the built static files from the builder stage
COPY --from=builder /app/.output/public /usr/share/nginx/html

# Copy the Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
