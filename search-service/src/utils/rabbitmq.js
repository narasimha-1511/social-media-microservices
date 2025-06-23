const amqp = require('amqplib');
const logger = require('./logger');

let channel = null;
let connection = null;

const EXCHANGE_NAME = 'facebook_events';

async function connectRabbitMQ(){
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();

        channel.assertExchange(EXCHANGE_NAME , "topic" , { durable: false });
        logger.info(`rabbitMq connected`)
        return channel;
    } catch (error) {
        logger.error(`Error connecting rabbitMq ${error}`)
    }
}

async function consumeEvent(key , callback){
    try {
        if(!channel){
            await connectRabbitMQ();
        }

        const queue = await channel.assertQueue("" , {
            exclusive: true
        });

        channel.bindQueue(queue.queue , EXCHANGE_NAME , key);
        channel.consume(queue.queue , (msg) => {
            if(msg !== null){
                const content = JSON.parse(msg.content.toString());
                callback(content);
                channel.ack(msg)// we need to acknowelde the message so that it is not redelivered
            }
        })

    logger.info(`Subscribed to event: ${key}`)

    } catch (error) {
        logger.error(`Error while consumimg the event: ${key}`)
    }
}

module.exports = {connectRabbitMQ , consumeEvent  }