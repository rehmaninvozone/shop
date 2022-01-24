const { Product, Order, Cart } = require('../models/');

exports.getProducts = async (req, res, next) => {
  try {
    let products = await Product.findAll();
    res.status(200).json({
      products: products,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  try {
    let product = await Product.findByPk(prodId);
    res.status(200).json({ product: product });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ where: { userId: req.userId } });
    if (!cart) {
      res.status(200).json({ cart: [] });
    }
    let products = await cart.getProducts();
    res.status(200).json({ products: products });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postCart = async (req, res, next) => {
  const prodId = req.body.productId;
  let fetchedCart;
  let newQuantity = 1;
  try {
    let cart = Cart.findOne({ where: { userId: req.userId } });
    if (!cart) {
      let product = await Product.findByPk(prodId);
      let cart = await Cart.create({ userId: req.userId });
      await cart.addProduct(product, {
        through: { quantity: newQuantity },
      });
    } else {
      fetchedCart = cart;
      let products = await cart.getProducts({ where: { id: prodId } });
      let product;
      if (products.length > 0) {
        product = products[0];
      }
      if (product) {
        return product;
      }
      product = await Product.findByPk(prodId);
      fetchedCart.addProduct(product, {
        through: { quantity: newQuantity },
      });
    }
    res.status(200).json({ cart: cart });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postCartDeleteProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  try {
    let cart = await Cart.findOne({ where: { userId: req.userId } });
    let products = await cart.getProducts({ where: { id: prodId } });
    const product = products[0];
    await product.CartItem.destroy();
    res.status(200).json({ cart: cart });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postOrder = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ where: { userId: req.userId } });
    let products = await cart.getProducts();
    let order = await Order.create({ userId: req.userId });
    await order.addProducts(
      products.map((product) => {
        product.OrderItem = { quantity: product.CartItem.quantity };
        return product;
      })
    );
    let odr = await cart.setProducts(null);
    res.status(201).json({ order: odr });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    let orders = await Order.findAll({
      where: { userId: req.userId },
      include: ['products'],
    });
    res.status(200).json({ orders: orders });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
