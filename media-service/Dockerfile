# using the node js 18 image wiht alpine linux

FROM node:18-alpine

WORKDIR /user/src/app

COPY package*.json ./

COPY wait-for-it.sh /wait-for-it.sh

RUN chmod +x /wait-for-it.sh

RUN apk add --no-cache bash netcat-openbsd

RUN npm ci --only=production

COPY  . .

EXPOSE 3003

CMD [ "/wait-for-it.sh" , "rabbitmq:5672", "--" , "node" , "src/server.js" ]