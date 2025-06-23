const Joi = require('joi');

const createPostValidation = (data) => {
    
    const schema = Joi.object({
        title: Joi.string().min(4).max(16).required(),
        description: Joi.string().min(10).max(120).required(),
        mediaIds: Joi.array().items(Joi.string()).optional()
    });

    return schema.validate(data);
}

module.exports = {createPostValidation}