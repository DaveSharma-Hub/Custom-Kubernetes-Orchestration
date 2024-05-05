FROM node:20

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY ./test .

EXPOSE 3000
CMD [ "npm", "start","3000"]