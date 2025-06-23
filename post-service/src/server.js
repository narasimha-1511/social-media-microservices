require('dotenv').config();
const express = require('express')
const mongoose = require('mongoose');
const Redis = require('ioredis')
const cors = require('cors')
const helmet = require('helmet')
const postRouter = require('./routes/post-routes');
const errorHandler = require('./middleware/error-handler');
const logger = require('./utils/logger');
const { RedisStore } = require('rate-limit-redis')
const { rateLimit } = require('express-rate-limit');
const { connectRabbitmq } = require('./utils/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3002;
const redisClient = new Redis(process.env.REDIS_URL);

const generalRateLimitter = rateLimit({
    limit: 100,
    windowMs: 15*60*1000,
    standardHeaders : true,
    legacyHeaders: false,
    handler: (req, res)=> {
        logger.warn('Sensitive endpoint ratelimit exceeded for IP: ',req.ip);
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
})

app.use(cors());
app.use(helmet())
app.use(express.json())
app.use(generalRateLimitter);
app.use((req , _res , next) => {
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Received body `, {body: req.body})
    next()
})

//passign redis client
app.use('/api/posts', (req , res , next) => {
    req.redisClient=redisClient
    next();
}, postRouter)

app.use(errorHandler)

app.listen(PORT , async () => {
    await connectMongoDB();
    await connectRabbitmq();
    logger.info(`post service started at port `,{PORT})
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