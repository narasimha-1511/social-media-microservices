require('dotenv').config();
const express = require('express')
const cors = require('cors')
const Redis = require('ioredis')
const helmet = require('helmet');
const logger = require('./utils/logger');
const { rateLimit } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')
const proxy = require('express-http-proxy');
const errorHandler = require('./middleware/error-handler');
const { validateToken } = require('./middleware/auth-middleware')


const app = express()
const PORT = process.env.PORT || 3000;
const redisClient = new Redis(process.env.REDIS_URL);

const generalRateLimitter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req , res) => {
        logger.warn(`Rate limit reached for endpoint ${req.url} at IP : ${req.ip}`);
        res.status(429).json({
            succes: false,
            message: "too many requests"
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
});

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(generalRateLimitter)
app.use((req , res , next) => {
    logger.info(`[${req.method}] | ${req.url}`)
    // logger.info(`Request Body , ${req.body}`)
    next();
})

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/ , "/api")
    },
    proxyErrorHandler: (err , res , next) => {
        logger.error(`Proxy Error: ${err.message}`)
        res.status(500).json({
            success: false,
            message: `Internal Server error`,
            error: err.message
        })
    }
}

app.use('/v1/auth' , proxy(process.env.USER_SERVICE_URL , {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOptions , srcReq) => {
        proxyReqOptions.headers["Content-Type"] = "application/json"
        return proxyReqOptions
    },
    userResDecorator: (proxyRes , proxyResData , userRes , userData) => {
        logger.info(`Response received from User service : ${proxyRes.statusCode}`)
        return proxyResData
    }
}))


app.use('/v1/posts' , validateToken , proxy(process.env.POST_SERVICE_URL , {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOptions , srcReq) => {
        proxyReqOptions.headers["Content-Type"] = "application/json"
        proxyReqOptions.headers["x-user-id"] = srcReq.user.userId
        return proxyReqOptions;
    },
    userResDecorator: (proxyRes , proxyResData , userRes , userData) => {
        logger.info(`Response received from Post service : ${proxyRes.statusCode}`)
        return proxyResData
    }
}))

app.use('/v1/media' , validateToken , proxy(process.env.MEDIA_SERVICE_URL , {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOptions , srcReq) => {
        if(srcReq.headers['content-type'] && !srcReq.headers['content-type'].startsWith('multipart/form-data')){
            proxyReqOptions.headers["Content-Type"] = "application/json"
        }
        proxyReqOptions.headers["x-user-id"] = srcReq.user.userId
        return proxyReqOptions;
    },
    userResDecorator: (proxyRes , proxyResData , userRes , userData) => {
        logger.info(`Response received from Media service : ${proxyRes.statusCode}`)
        return proxyResData
    },
    parseReqBody: false
}))

app.use('/v1/search' , validateToken , proxy(process.env.SEARCH_SERVICE_URL , {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOptions , srcReq) => {
        proxyReqOptions.headers["Content-Type"] = "application/json"
        proxyReqOptions.headers["x-user-id"] = srcReq.user.userId
        return proxyReqOptions;
    },
    userResDecorator: (proxyRes , proxyResData , userRes , userData) => {
        logger.info(`Response received from Search service : ${proxyRes.statusCode}`)
        return proxyResData
    }
}))


app.use(errorHandler);

app.listen(PORT , () => {
    logger.info(`API Gateway is running on port ${PORT}`)
    logger.info(`User service is running on ${process.env.USER_SERVICE_URL}`)
    logger.info(`Post service is running on ${process.env.POST_SERVICE_URL}`)
    logger.info(`Media service is running on ${process.env.MEDIA_SERVICE_URL}`)
    logger.info(`Search service is running on ${process.env.SEARCH_SERVICE_URL}`)
    logger.info(`Redis is running opn ${process.env.REDIS_URL}`)
})