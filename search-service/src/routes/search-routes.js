const express = require('express');
const authenticate = require('../middleware/auth-middleware');
const { searchPostController } = require('../controller/search-controller');

const router = express.Router();

router.use(authenticate)

router.get('/posts', searchPostController);

module.exports = router