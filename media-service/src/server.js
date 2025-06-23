require('dotenv').config();
const express = require('express')
const mongoose = require('mongoose')
const Redis = require('ioredis')
const cors = require('cors')
const helmet = require('helmet')
const errorHandler = require('./middleware/error-handler');
const logger = require('./utils/logger')
const { RedisStore } = require('rate-limit-redis')
const { rateLimit } = require('express-rate-limit');
const mediaRoute = require('./routes/media-route');
const { connectRabbitmq, consumeEvent } = require('./utils/rabbitmq');
const { handlePostDeleted } = require('./event-handlers/media-event.handler');

const app = express();
const PORT = process.env.PORT || 3003;

const redisClient = new Redis(process.env.REDIS_URL);

const generalRateLimiter = rateLimit({
    limit: 100,
    windowMs: 15 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req , res) => {
        logger.warn(`Rate limit exceeded for ip: ${req.ip}`)
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
});

app.use(cors())
app.use(helmet())
app.use(express.json())
app.use((req , _res , next) => {
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Received body , ${req.body}`)
    next()
})
app.use(generalRateLimiter)

app.use('/api/media', mediaRoute)

app.use(errorHandler);

app.listen(PORT ,async () => {
    await connectMongoDB();
    await connectRabbitmq();

    //consume the events
    await consumeEvent("post.deleted" , handlePostDeleted)

    logger.info(`media service is started on PORT: ${PORT}`)
})

async function connectMongoDB(){
    return await mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        logger.info('Connected to mongodb')
        return true
    })
    .catch(error => {
        logger.error("Mongo connection error",error)
        process.exit(1);
    });
}