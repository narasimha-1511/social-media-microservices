const Post = require("../models/Post");
const logger = require("../utils/logger");
const { createPostValidation } = require("../utils/validation");
const { publishEvent } = require("../utils/rabbitmq")

async function invalidatePostCache(req , postId){
    logger.info(`cache invalidated`)
    let keys = await req.redisClient.keys("posts:*");
    keys.push(`post:${postId}`);
    if(keys && keys.length > 0){
        await req.redisClient.del(keys);
    }
    return true;
}

const createPost = async (req , res) => {
    logger.info(`creating post`)
    try {

        const { error } = createPostValidation(req.body);

        if(error){
            logger.warn(`Validation Error creating post`, {error: error.details[0].message });
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { title , description , mediaIds } = req.body;

        const newPost = new Post({
            user: req.user.userId,
            title,
            description,
            mediaIds
        });

        await newPost.save();
        await invalidatePostCache(req , newPost._id.toString());

        //publishing the event
        await publishEvent('post.created' , {
            postId: newPost._id,
            userId: req.user.userId,
            title: newPost.title,
            description: newPost.description,
            createdAt: newPost.createdAt
        })
        logger.info(`published event post.created for post ${newPost._id}`);

        logger.info(`Post created` , {
            post : newPost
        })
        return res.status(201).json({
            success: true ,
            message: 'Post created successfully'
        })

        
    } catch (error) {
        logger.error(`Error creating post ${error}`);
        res.status(500).json({
            success: false,
            message: "Internal Server error"
        })
    }
}

const getAllPosts = async (req , res) => {
    logger.info(`fetching all posts`)
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1 )* limit;
        // const userId = req.headers["x-user-id"]

        const cacheKey = `posts:${page}:${limit}`;
        const cachedPosts = await req.redisClient.get(cacheKey);

        if(cachedPosts){
            logger.info(`hit cache for getAllposts`)
           return res.json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find().sort({ createdAt : -1 }).skip(startIndex).limit(limit);

        const total = await Post.countDocuments();

        const result = {
            posts,
            currentPage: page,
            limit,
            totalPages: Math.ceil(total/limit),
            totalPosts: total
        }

        //save posts in redis cache
        await req.redisClient.setex(cacheKey , 300 , JSON.stringify(result));

        return res.json(result)
        
    } catch (error) {
        logger.error(`Error fetching all post ${error}`);
        res.status(500).json({
            success: false,
            message: "Error fetching all posts"
        })
    }
}

const getPost = async (req , res) => {
    logger.info(`fetching post`)
    try {
        const postId = req.params.id;
        const cacheKey = `post:${postId}`
        const cachePost = await req.redisClient.get(cacheKey);

        if(cachePost){
            return res.json(JSON.parse(cachePost));
        }

        const post = await Post.findById(postId);

        if(!post){
            return res.status(404).json({
                success: false,
                message: 'post not found'
            })
        }

        await req.redisClient.setex(cacheKey , 3600 , JSON.stringify(post));

        return res.json(post);

    } catch (error) {
        logger.error(`Error fetching post ${error}`);
        res.status(500).json({
            success: false,
            message: "Error fetching post"
        })
    }
}

const deletePost = async (req , res) => {
    logger.info(`Deleting post`)
    try {
        const userId =  req.user.userId;
        const postId = req.params.id;
        
        const post = await Post.findOneAndDelete({
            _id: postId,
            user: userId
        });

        if(!post){
            return res.status(404).json({
                success: false,
                message: "Post not found"
            })
        }

        //publish post delete event
        await publishEvent('post.deleted', {
            postId: post._id,
            userId: userId,
            mediaIds: post.mediaIds
        })

        await invalidatePostCache(req , postId);

        return res.json({
            success: true,
            message: "post deleted!"
        })
        
    } catch (error) {
        logger.error(`Error Deleting post ${error}`);
        res.status(500).json({
            success: false,
            message: "Error Deleting post"
        })
    }
}

module.exports = {createPost , getAllPosts ,  getPost , deletePost}