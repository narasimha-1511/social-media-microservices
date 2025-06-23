const Search = require("../models/Search");
const logger = require("../utils/logger");

const inValidateSearchCache = async (redisClient) => {
    const keys = await redisClient.keys('search:*');
    if(keys && keys.length > 0){
        await redisClient.del(keys);
    }
    return true;
}

const handleCreatedPost = (redisClient) => async (event) => {
    try {

        inValidateSearchCache(redisClient)
    
        const {userId , postId , title , description , createdAt} = event;
    
        const newSearch = new Search({
            title,
            description,
            userId,
            postId,
            createdAt
        });
    
        await newSearch.save();

        logger.info(`processed the handling of new Post : ${postId}`)

    } catch (error) {
        logger.error(`error handling the creating post: ${event?.postId} event ${error}`)
    }
}

const handleDeletePost = (redisClient) => async (event) => {
    try {

        inValidateSearchCache(redisClient)
    
        const {userId , postId} = event;
    
        await Search.findOneAndDelete({
            userId,
            postId
        });

        logger.info(`processed the handling of deleting post : ${postId}`)

    } catch (error) {
        logger.error(`error handling the deleting post: ${event?.postId} event ${error}`)
    }
}

module.exports = {handleCreatedPost , handleDeletePost}