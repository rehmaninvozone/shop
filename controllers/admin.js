const fileHelper = require('../util/file');

const { validationResult } = require('express-validator');

const { Product } = require('../models/');

exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  if (!image) {
    const error = new Error('No image provided.');
    error.statusCode = 422;
    throw error;
  }
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error(errors.array()[0].msg);
    error.statusCode = 422;
    throw error;
  }

  const imageUrl = image.path;

  try {
    let product = await Product.create({
      title: title,
      price: price,
      description: description,
      imageUrl: imageUrl,
      userId: req.userId,
    });
    res
      .status(201)
      .json({ message: 'Product added successfully!', product: product });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postEditProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error(errors.array()[0].msg);
    error.statusCode = 422;
    throw error;
  }
  try {
    let product = await Product.findByPk(prodId);
    if (product.userId !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }
    product.title = updatedTitle;
    product.price = updatedPrice;
    product.description = updatedDesc;
    if (image) {
      fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = image.path;
    }
    let pro = await product.save();
    res
      .status(201)
      .json({ message: 'Product updated successfully!', product: pro });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    let products = await Product.findAll({ where: { userId: req.userId } });
    res.status(200).json({ products: products });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postDeleteProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  let pro;
  try {
    let product = await Product.findByPk(prodId);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    pro = product;
    fileHelper.deleteFile(product.imageUrl);
    await Product.destroy({ where: { id: prodId, userId: req.userId } });
    res.status(200).json({ product: pro });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
