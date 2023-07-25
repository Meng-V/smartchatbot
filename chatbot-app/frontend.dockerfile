# Dockerfile
# Stage 1 - Build
FROM node:18.16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install react-markdown remark-gfm
COPY . .
# EXPOSE 3601
CMD ["npm", "start"]
