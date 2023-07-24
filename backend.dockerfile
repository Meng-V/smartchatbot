# Dockerfile
FROM node:18.16-alpine

WORKDIR /app

# Install bash
RUN apk add --no-cache bash

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install -g prisma

# Copy the rest of the files
COPY . .

# Copy the wait-for script into the Docker image
COPY ./wait-for /app/wait-for

# Make the wait-for script executable
RUN chmod +x /app/wait-for

# Generate Prisma client
RUN npx prisma generate

CMD /app/wait-for db:5432 -t 30 -- npx prisma migrate dev --preview-feature && npm start