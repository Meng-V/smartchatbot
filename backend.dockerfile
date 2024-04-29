# Dockerfile
FROM node:20-alpine
ENV TZ="America/New_York"
WORKDIR /app

# Install bash
RUN apk add --no-cache bash
# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install
# Prisma
RUN npm install -g prisma

# Copy the rest of the files
COPY . .

RUN rm -rf node_modules

# Add curl
RUN apk add curl
RUN curl -L https://raw.githubusercontent.com/eficode/wait-for/master/wait-for -o /app/wait-for
RUN chmod +x /app/wait-for

# Generate Prisma client
RUN npx prisma generate
RUN npm install @prisma/adapter-neon @neondatabase/serverless ws
RUN npm install --save-dev @types/ws

# Expose the port the app runs on
EXPOSE 3000

# Build the app
RUN npm run build

# Run the migrations and start the server
CMD npx prisma migrate dev --preview-feature && npm run start:prod
