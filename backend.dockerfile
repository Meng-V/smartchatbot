# Dockerfile
FROM node:18.16-alpine

WORKDIR /app

# Install bash
RUN apk add --no-cache bash

# Copy package.json and package-lock.json first
COPY package*.json ./

# Copy wait-for-it script and give it the necessary permissions
COPY wait-for-it.sh wait-for-it.sh
RUN chmod +x wait-for-it.sh

# Install dependencies
RUN npm install
RUN npm install -g prisma

# Copy the rest of the files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose the port
EXPOSE 3000

# Use the wait-for-it script before starting the application
CMD ./wait-for-it.sh db:5432 -- npm start
