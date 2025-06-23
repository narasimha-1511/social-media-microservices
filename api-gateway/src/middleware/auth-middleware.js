const logger = require("../utils/logger");
const jwt = require('jsonwebtoken')

const validateToken = async(req , res , next) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if(!token){
        logger.warn(`No token found!`)
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        })
    }

    jwt.verify(token , process.env.JWT_SECRET , (err , user) => {
        if(err){
            logger.warn(`Invalid or Expired Token!`)
            return res.status(401).json({
                success: false,
                message: "Invalid or Expired Token!"
            })
        }

        req.user = user
        next();
    })

}

module.exports = { validateToken }