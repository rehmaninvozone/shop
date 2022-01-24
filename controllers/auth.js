const crypto = require("crypto");

const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");

const {validationResult} = require("express-validator");

const {User} = require("../models/");

const transporter = nodemailer.createTransport(
    sendgridTransport({
        auth: {
            api_key:
                "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",
        },
    })
);

exports.postLogin = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error(errors.array()[0].msg);
        error.statusCode = 422;
        throw error;
    }

    try {
        let user = await User.findOne({where: {email: email}});
        if (!user) {
            const error = new Error('User Not Found');
            error.statusCode = 404;
            throw error;
        }
        loadedUser = user;
        let doMatch = await bcrypt.compare(password, user.password);
        if (doMatch) {
            const token = jwt.sign(
                {
                    email: loadedUser.email,
                    userId: loadedUser.id
                },
                'somesupersecretsecret',
                {expiresIn: '1h'}
            );
            res.status(200).json({token: token, userId: loadedUser.id});
        } else {
            const error = new Error('Invalid email or password.');
            error.statusCode = 422;
            throw error;
        }
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postSignup = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error(errors.array()[0].msg);
        error.statusCode = 422;
        throw error;
    }
    try {
        let hashedPassword = bcrypt.hash(password, 12);
        let user = await User.create({
            name: "test User",
            email: email,
            password: hashedPassword,
        });
        const token = jwt.sign(
            {
                email: user.email,
                userId: user.id
            },
            'somesupersecretsecret',
            {expiresIn: '1h'}
        );
        res.status(201).json({message: 'User created!', userId: user.id, token: token});
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.postLogout = (req, res, next) => {
    req.headers.authorization = '';
    res.status(200).json();
};

exports.postReset = async (req, res, next) => {
    crypto.randomBytes(32, async (err, buffer) => {
        const token = buffer.toString("hex");
        try {
            let user = await User.findOne({where: {email: req.body.email}});
            if (!user) {
                const error = new Error('User Not Found');
                error.statusCode = 404;
                throw error;
            }
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000;
            await user.save();

            await transporter.sendMail({
                to: req.body.email,
                from: "abdulrehmandar2234@gmail.com",
                subject: "Password reset",
                html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `,
            });
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    });
};

exports.postNewPassword = async (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    try {
        resetUser = await User.findOne({
            where: {
                resetToken: passwordToken,
                resetTokenExpiration: {$gt: Date.now()},
                id: userId,
            },
        });
        resetUser.password = await bcrypt.hash(newPassword, 12);
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        let result = await resetUser.save();
        res.status(201).json({
            result: result,
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
