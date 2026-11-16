#REFERENCE pg 145 of module manual
# using Node.js 22
FROM node:22-alpine

# setting the working folder inside the container
WORKDIR /app

# copying the dependency files
COPY package*.json ./

# installing the production dependencies
RUN npm ci --omit=dev

# copying the backend source code
COPY . .

# exposing the backend port
EXPOSE 4000

# starting the backend
CMD ["node", "index.js"]