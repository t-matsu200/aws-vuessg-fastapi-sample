FROM node:24-slim

# Install essential tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    git \
    curl \
    unzip \
    less \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm awscliv2.zip

# Install AWS CDK
RUN npm install -g aws-cdk@2.1021.0

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the CDK app
RUN npm run build

# Define the entrypoint
CMD ["tail", "-f", "/dev/null"]
