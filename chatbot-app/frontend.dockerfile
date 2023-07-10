# Dockerfile
# Stage 1 - Build
FROM node:18.16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]