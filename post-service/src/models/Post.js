const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true
    },
    title : {
        type: String,
        required: true,
    },
    description : {
        type : String,
        required: true
    },
    mediaIds : [
        {
            type: String
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
} , { timestamps : true })

// this will be having for different service of search
postSchema.index({ title : 'text' })

const Post = mongoose.model('Post' , postSchema)

module.exports = Post;