# Dockerfile
# Stage 1 - Build
FROM node:18.16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3012
CMD ["npm", "start"]
