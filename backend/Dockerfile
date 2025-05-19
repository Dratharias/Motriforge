FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["bun", "run", "dev"]