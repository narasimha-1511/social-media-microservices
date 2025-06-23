const logger = require('../utils/logger')
const Media = require('../models/Media')
const { deleteMediaFromCloudinary }  = require('../utils/cloudinary')

const handlePostDeleted = async (event) => {
    try {
        const {postId , userId , mediaIds} = event;

        const mediaToDelete = await Media.find({
            _id: { $in: mediaIds }
        });

        for(const media of mediaToDelete){
            await deleteMediaFromCloudinary(media.publicId);
            await Media.findByIdAndDelete(media._id);
            logger.info(`deleted media ${media._id} associated with post: ${postId}`)
        }
        
        logger.info(`processed deletion of media of post: ${postId}`)
    } catch (error) {
        logger.error(`error occured while media deletion ${error}`)
    }
}

module.exports = {handlePostDeleted}