# Dockerfile
# Stage 1 - Build
FROM node:15-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .