FROM node:20-alpine

# Install git for repository operations
RUN apk add --no-cache git

WORKDIR /action

# Copy package specifications and install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy action runtime files
COPY src/ ./src/
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/action/entrypoint.sh"]

