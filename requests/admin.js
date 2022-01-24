const {body, check} = require('express-validator')

exports.addProduct = () => {
    return [
        body("title")
            .notEmpty()
            .withMessage('title is required')
            .isString().isLength({min: 3}).trim(),
        body("price")
            .notEmpty()
            .withMessage('price is required')
            .isFloat(),
        body("description").isLength({min: 5, max: 400}).trim(),
    ]
}