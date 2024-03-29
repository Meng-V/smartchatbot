# Dockerfile
FROM node:current-alpine
ENV TZ="America/New_York"
WORKDIR /app

# Install bash
RUN apk add --no-cache python3 py3-pip make alpine-sdk python3-dev
RUN apk add --no-cache bash
RUN python3 --version && pip3 --version
# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install -g prisma

# Copy the rest of the files
COPY . .

RUN rm -rf node_modules

RUN apk add curl

RUN curl -L https://raw.githubusercontent.com/eficode/wait-for/master/wait-for -o /app/wait-for
RUN chmod +x /app/wait-for

# Generate Prisma client
RUN npx prisma generate
# RUN npx prisma migrate reset 

CMD /app/wait-for db:5432 -t 30 -- npx prisma migrate dev --preview-feature && npm start

# CMD npx prisma migrate dev && npm start
