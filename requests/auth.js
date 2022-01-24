const {body} = require('express-validator')

exports.registerValidator = () => {
    return [
        body("email")
            .notEmpty()
            .withMessage('email is required')
            .isEmail()
            .withMessage("Please enter a valid email.")
            .normalizeEmail(),
        body("password")
            .notEmpty()
            .withMessage('password is required')
            .isLength({min: 8})
            .withMessage('password must be at least 8 characters.')
            .trim(),
        body("confirmPassword")
            .notEmpty()
            .withMessage('confirm password is required.')
            .trim()
            .custom((value, {req}) => {
                if (value !== req.body.password) {
                    throw new Error("Passwords have to match with confirm password!");
                }
                return true;
            }),
    ]
}

exports.loginValidator = () => {
    return [
        body("email")
            .isEmail()
            .withMessage("Please enter a valid email address.")
            .normalizeEmail(),
        body("password", "Password has to be valid.").isLength({min: 8}).trim(),
    ];
}
