
const logger = require('../utils/logger');


const authenticateRequest = (req , res , next) => {
    
    const userId = req.headers["x-user-id"];

    if(!userId){
        logger.warn(`attempting without userId`);
        return res.status(401).json({
            succes: false,
            message: "Authentication required!",
        })
    }

    req.user = {userId}
    next()
}

module.exports = authenticateRequest