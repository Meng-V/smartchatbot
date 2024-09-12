# BUILD STAGE
FROM node:18.16-alpine as builder
WORKDIR /app
RUN rm -rf node_modules/
RUN rm -rf dist/
RUN npm cache clean --force
COPY package*.json ./
# Install dependencies
RUN npm install --omit=dev
RUN npm install react-markdown remark-gfm
COPY . .
# Declare env vars
ARG VITE_BACKEND_URL_PROD
ARG VITE_BACKEND_URL
ARG VITE_BACKEND_PORT
ARG VITE_FRONTEND_PORT
ENV VITE_BACKEND_URL_PROD=$VITE_BACKEND_URL_PROD
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_BACKEND_PORT=$VITE_BACKEND_PORT
ENV VITE_FRONTEND_PORT=$VITE_FRONTEND_PORT
# Build the app
RUN npm run build
# Copy the entry point script and ensure the script is executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh


# PRODUCTION STAGE
FROM node:18.16-alpine
# Install serve
RUN npm install -g serve
# Set the working directory
WORKDIR /app
COPY --from=builder /app/dist /app/dist
# Copy the entry point script and set permissions
COPY --from=builder /app/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
# Expose the port the app runs on
EXPOSE 5173
# Set the entry point script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# Start the app using serve
CMD ["serve", "-s", "dist", "-l", "5173"]
