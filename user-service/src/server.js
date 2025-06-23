require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const helmet = require('helmet')
const cors = require('cors')
const logger = require('./utils/logger')
const { RateLimiterRedis }  = require('rate-limiter-flexible')
const { rateLimit } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')
const userRouter = require('./routes/user-route')
const errorHanlder = require('./middleware/error-handler')
const Redis = require('ioredis')


const app = express();

const redisClient = new Redis(process.env.REDIS_URL)

//middlewares
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use((req , _res , next) => {
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Received body , ${req.body}`)
    next()
})
//DDOS PROTECT
const rateLimiterDDOS= new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "user-service-middleware",
    points: 10, // this means the user can make 10 requests per 1 sec
    duration: 1
})

//normal rate limit for endpoints
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

app.use((req , res , next) => {
    rateLimiterDDOS.consume(req.ip).then(() => next()).catch(() => {
        logger.warn('Rate limit exceeded for IP: ',req.ip)
        res.status(429).json({
            success: false,
            message: "Too many requests"
        })
    })
})

app.use('/api/auth/register' , generalRateLimitter)

//Routes
app.use('/api/auth' , userRouter);

app.use(errorHanlder)

app.listen(process.env.PORT , async () => {
    await connectMongoDB();
    logger.info(`Identity service running on ${process.env.PORT}`)
})

//unhandled promis rejection
process.on('unhandledRejection' , (reason , promise ) => {
    logger.error('Unhandled Rejection at ', promise  , 'reason: ', reason);
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