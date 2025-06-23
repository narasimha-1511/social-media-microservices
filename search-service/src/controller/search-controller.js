const Search = require("../models/Search");
const logger = require("../utils/logger")

const searchPostController = async (req , res) => {
    logger.info(`searching the Post`);
    try {
        if(!req?.query?.query){
            return res.status(400).json({
                success: false,
                message: 'query needed'
            })
        }

        const { query } = req.query;

        const cacheKey = `search:${query}`;
        const cachedResults = await req.redisClient.get(cacheKey);
        
        if(cachedResults){
            return res.json(JSON.parse(cachedResults));
        }

        const results = await Search.find(
        {
            $text: {$search: query}
        },{ 
            score: {$meta : 'textScore'}
        }).sort({score: {$meta: 'textScore'}}).limit(10); 

        await req.redisClient.setex(cacheKey , 900 , JSON.stringify(results));

        res.json(results)
        
    } catch (error) {
        logger.error(`error searching post ${error}`);
        res.status(500).json({
            success: false,
            message: "error searcing post"
        })
    }
}

module.exports = {searchPostController}