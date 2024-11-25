# BUILD STAGE
FROM node:20-alpine as builder
# BUILD STAGE
FROM node:20-alpine as builder
ENV TZ="America/New_York"
WORKDIR /app
# Install bash and curl, needed for the build
RUN apk add --no-cache bash curl
# Copy package.json and package-lock.json first to leverage Docker cache
# Install bash and curl, needed for the build
RUN apk add --no-cache bash curl
# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./
# Install dependencies
RUN npm install --omit=dev
RUN npm install --omit=dev
# Prisma
RUN npm ci prisma
# Copy the rest of the files
COPY . .
# Download wait-for script
# Download wait-for script
RUN curl -L https://raw.githubusercontent.com/eficode/wait-for/master/wait-for -o /app/wait-for
RUN chmod +x /app/wait-for
# Generate Prisma client
RUN npx prisma generate
RUN npm ci @prisma/adapter-neon @neondatabase/serverless ws
RUN npm install --save-dev @types/ws
# Build the app
RUN npm run build


# PRODUCTION STAGE
FROM node:20-alpine
ENV TZ="America/New_York"
WORKDIR /app
# Install bash and curl for the runtime environment
RUN apk add --no-cache bash curl
# Copy necessary scripts and built files from the builder stage
COPY --from=builder /app/wait-for /app/wait-for
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json /app/
# Expose the port the app runs on
EXPOSE 3000
# Copy the entry point script and set permissions
COPY --from=builder /app/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
# Set the entry point script
ENTRYPOINT ["entrypoint.sh"]

# PRODUCTION STAGE
FROM node:20-alpine
ENV TZ="America/New_York"
WORKDIR /app
# Install bash and curl for the runtime environment
RUN apk add --no-cache bash curl
# Copy necessary scripts and built files from the builder stage
COPY --from=builder /app/wait-for /app/wait-for
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json /app/
# Expose the port the app runs on
EXPOSE 3000
# Copy the entry point script and set permissions
COPY --from=builder /app/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
# Set the entry point script
ENTRYPOINT ["entrypoint.sh"]
# Run the migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
