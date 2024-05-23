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
# Expose the port the app runs on
EXPOSE 5173
# Copy the entry point script and set permissions
COPY --from=builder /app/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
# Set the entry point script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# Start the app using serve
CMD ["serve", "-s", "dist", "-l", "5173"]
