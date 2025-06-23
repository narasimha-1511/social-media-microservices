require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { RedisStore } = require('rate-limit-redis')
const { rateLimit } = require('express-rate-limit');
const { Redis } = require('ioredis');
const logger = require('./utils/logger')
const errorHandler = require('./middleware/error-handler');
const { connectRabbitMQ , consumeEvent } = require('./utils/rabbitmq');
const searchRouter = require('./routes/search-routes')
const { handleCreatedPost, handleDeletePost } = require('./event-handlers/search-event-handler')

const app = express();
const port = process.env.PORT || 3000;
const redisClient = new Redis(process.env.REDIS_URL);

const generalRateLimiter = rateLimit({
    limit: 100,
    windowMs: 15 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req , res) => {
        logger.warn(`Rate limit reached for IP : ${req.ip}`)
        return res.status(429).json({
            success: false,
            message: "Rate limit reached"
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
})

app.use(cors())
app.use(helmet())
app.use(express.json())
app.use(generalRateLimiter)
app.use((req , _res , next) => {
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Received body `, {body: req.body})
    next()
})

app.use('/api/search' ,(req , res , next) => {
    req.redisClient = redisClient;
    next()
} , searchRouter)

app.use(errorHandler)

app.listen(port ,async () => {
    await connectMongoDB();
    await connectRabbitMQ();

    //consuming the events
    consumeEvent('post.created' , handleCreatedPost(redisClient));
    consumeEvent('post.deleted' , handleDeletePost(redisClient));

    console.log(`search service is running on port ${port}`)
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