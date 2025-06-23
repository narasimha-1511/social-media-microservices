const logger = require("../utils/logger");


const authenticate = (req , res , next) => {

    const userId = req.headers['x-user-id'];

    if(!userId){
        logger.warn(`Access attempted without userId`)
        return res.status(400).json({
            success: false,
            message: "Authentication required! , please login to continue"
        })
    }

    req.user = {userId}
    next()
}

module.exports = authenticate;