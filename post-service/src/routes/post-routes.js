const express = require('express');
const authenticate = require('../middleware/auth-middleware');
const { createPost, getAllPosts, getPost, deletePost } = require('../controller/post-controller');


const router = express.Router();

router.use(authenticate);
router.post('/create-post' , createPost);
router.get('/posts', getAllPosts)
router.get('/:id', getPost);
router.delete('/:id', deletePost);



module.exports = router