const logger = require('../utils/logger');
const { validateRegistration, validateLogin } = require('../utils/validation');
const User = require('../models/User');
const generateTokens = require('../utils/generate-token');
const RefreshToken = require('../models/RefreshToken');

//user registration 
const registerUser = async (req , res) => {
    logger.info('Registration started')
    try {

        //validate the schema
        const { error } = validateRegistration(req.body);

        if(error){
            logger.warn('Validation error', { validationMessage : error.details[0].message});
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            })
        }

        const { email , password , username  } = req.body;

        let user = await User.findOne({
            $or: [{email} , {username}]
        });

        if(user){
            logger.warn("User already exists");
            return res.status(400).json({
                success: false,
                message: "User already exists",
            })
        }

        user = new User({username , password , email});
        await user.save();
        logger.info(`User saved successfully! : ${user._id}`);

        const { accessToken , refreshToken } = await generateTokens(user);

        res.status(201).json({
            success: true,
            message: "User registered successfully!",
            accessToken,
            refreshToken
        })

    } catch (error) {
        logger.error('Registration error occured' , error);
        res.status(500).json({
            success: false ,
            message: "Internal Server error"
        })
    }
}


// user logging 
const loginUser  = async (req , res) => {
    logger.info(`Login Started`)
    try {

        const { error } = validateLogin(req.body);

        if(error){
            logger.warn("Validation error", {
                validationError: error.details[0].message
            })
            res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { username , password } = req.body;

        const user = await User.findOne({username});

        if(!user){
            logger.warn(`Invalid user`);
            res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            })
        }

        //checking the password
        const isValidPassword = await user.comparePassword(password);

        if(!isValidPassword){
            logger.warn(`Invalid password`);
            return res.status(400).json({
                success: false,
                message: "Invalid Password"
            })
        }

        //delete pre created refresh tokens
        await RefreshToken.deleteMany({
            user: user._id
        })

        const { accessToken , refreshToken } = await generateTokens(user);

        res.status(201).json({
            accessToken,
            refreshToken,
            userId: user._id
        })
        
    } catch (error) {
        logger.error('Login error occured' , error);
        res.status(500).json({
            success: false ,
            message: "Internal Server error"
        })
    }
}



// refresh token
const refreshTokenUser = async (req , res) => {
    logger.info(`RefreshToken genration started`)
    try {

        const {refreshToken} = req.body;

        if(!refreshToken){
            logger.warn(`refresh token missing`)
            res.status(400).json({
                success: false ,
                message: "refresh token missing"
            })
        }

        const storedToken = await RefreshToken.findOne({ token : refreshToken });

        if(!storedToken || storedToken.expiresAt < new Date()){
            logger.warn(`Invalid or Expired Store token`)
            res.status(500).json({
                success: false ,
                message: "Invalid or Expired Store token"
            })
        }

        const user = await User.findById(storedToken.user);

        if(!user){
            logger.warn(`User not found`)
            res.status(500).json({
                success: false ,
                message: "User not found"
            })
        }

        const { accessToken : newAccessToken , refreshToken : newRefreshToken } = await generateTokens(user);
         
        
        //delete the old refresh
        await RefreshToken.deleteOne({
            _id: storedToken._id
        });

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        })

        
    } catch (error) {
        logger.error(`Refresh token error occured`, error)
        res.status(500).json({
            success: false ,
            message: "Internal Server error"
        })
    }
}


//logout 
const logoutUser = async (req , res) => {
    logger.info(`logging out`)
    try {

        const {refreshToken} = req.body;

        if(!refreshToken){
            logger.warn(`Logout error occured`, error)
            res.status(400).json({
                success: false ,
                message: "Refresh token not found"
            })
        }

        const isDeleted = await RefreshToken.findOneAndDelete({token: refreshToken})
        
        if(!isDeleted){
            logger.warn(`Invalid Refresh Token`)
            res.status(400).json({
                success: false,
                message: "Invalid refresh token"
            })
        }

        logger.info('Refresh token deleted')
        res.json({
            success: true,
            message: 'Logged out successfully'
        })
        
    } catch (error) {
        logger.error(`Logout error occured`, error)
        res.status(500).json({
            success: false ,
            message: "Internal Server error"
        })
    }
}

module.exports = { registerUser , loginUser , refreshTokenUser , logoutUser }