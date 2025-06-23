const amqp = require('amqplib');
const logger = require('./logger');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'facebook_events';

async function connectRabbitmq() {
    try {

        connection = await amqp.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();

        channel.assertExchange(EXCHANGE_NAME , "topic" , { durable: false })
        logger.info(`connected to rabbitMq`);
        return channel;
        
    } catch (error) {
        logger.error(`error connecting to rabbitMq ${error}`);
    }
}

async function publishEvent(key , message){
    if(!channel){
        await connectRabbitmq();
    }
    
    channel.publish(EXCHANGE_NAME , key , Buffer.from(JSON.stringify(message)))
    logger.info(`event published: ${key}`)

}

module.exports = {connectRabbitmq , publishEvent}