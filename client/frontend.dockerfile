FROM node:22-alpine
WORKDIR /app
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install react-markdown remark-gfm
COPY . .

# Build the app
RUN npm run build

# Expose the port the app runs on
EXPOSE 5173

# Start the app
CMD ["npm", "run", "serve"]
