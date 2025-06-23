const mongoose = require('mongoose');


const searchSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    }
}, { timestamps: true})

searchSchema.index({ title: 'text' })
searchSchema.index({ description: 'text' })
searchSchema.index({ createdAt: -1 })

const Search = mongoose.model('Search' , searchSchema);

module.exports = Search