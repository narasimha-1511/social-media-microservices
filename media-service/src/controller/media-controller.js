const Media = require("../models/Media")
const { uploadMediaToCloudinary } = require("../utils/cloudinary")
const logger = require("../utils/logger")


const uploadMedia = async (req , res) => {
    // logger.info(`Uploading Media`)
    try {
        if(!req.file){
            logger.error(`No file found to upload`)
            return res.status(400).json({
                success: false,
                message: "No file found to upload , please add a file and try again!"
            })
        }

        const { originalname : originalName , mimetype : mimeType, buffer } = req.file;
        const userId = req.user.userId;

        logger.info(`File deatils: name=${originalName} , type=${mimeType}`)
        logger.info(`uploading to cloudinary started ....`)

        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
        logger.info(`cloudinary upload successful , public Id: - ${cloudinaryUploadResult.public_id}`)

        const newlyCreatedMedia = new Media({
            publicId : cloudinaryUploadResult.public_id,
            originalName,
            mimeType,
            url: cloudinaryUploadResult.secure_url,
            userId: userId
        });

        await newlyCreatedMedia.save()

        res.status(201).json({
            succes: true,
            mediaId : newlyCreatedMedia._id,
            url: newlyCreatedMedia.url,
            messaage: "Media upload is successful"
        })

    } catch (error) {
        logger.error(`error uploading media ${error}`)
        res.status(500).json({
            success:false,
            messaage: "Error creating media"
        })
    }
}

const getAllMedias = async (req , res) => {
    try {
        const userId = req.user.userId;

        const result = await Media.find({});
        res.json(result)

        
    } catch (error) {
        logger.error(`error fetching all media ${error}`)
        res.status(500).json({
            success:false,
            messaage: "Error fetching all media"
        })
    }
}

module.exports = {uploadMedia , getAllMedias }