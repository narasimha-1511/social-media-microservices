const express = require('express');
const multer = require('multer')
const { uploadMedia, getAllMedias } = require('../controller/media-controller');
const authenticateRequest = require('../middleware/auth-middleware');
const logger = require('../utils/logger');

const router = express.Router();

//configure multer middleware
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
}).single('file')

router.use(authenticateRequest)

router.post('/upload' , (req , res , next) => {
    upload(req , res , function(err) {
        if(err instanceof multer.MulterError){
            logger.error(`Multer error while uploading ${err}`)
            return res.status(400).json({
                message: 'Multer error while uploading',
                error: err.message, 
                stack: err.stack
            })
        }else if(err){
            logger.error(`unknown error while uploading ${err}`)
            return res.status(500).json({
                message: 'unknown error while uploading',
                error: err.message,
                stack: err.stack
            })
        }

        if(!req.file){
            return res.status(400).json({
                message: 'No file Found'
            })
        }
        next()
    });
} , uploadMedia)

router.get('/get' ,getAllMedias);

module.exports = router