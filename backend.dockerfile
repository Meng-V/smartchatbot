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

# Generate Prisma client
RUN npx prisma generate

# # Expose the port
# EXPOSE 3602

CMD ["npm", "start"]

