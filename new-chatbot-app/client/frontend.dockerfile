FROM node:18.16-alpine
WORKDIR /app
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install react-markdown remark-gfm
COPY . .

# Start the app
CMD ["npm", "start", "--", "--host"]
