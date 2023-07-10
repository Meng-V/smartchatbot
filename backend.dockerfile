# Dockerfile
FROM node:15-alpine

WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the files
COPY . .

COPY prisma ./prisma/
# RUN npm run build


WORKDIR /app/chatbot-app/prisma

RUN npx prisma generate
# RUN npx prisma migrate deploy
# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "server"]