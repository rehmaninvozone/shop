const express = require('express');

const { addProduct } = require('../requests/admin');
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
  '/add-product',
  isAuth,
  addProduct(),
  adminController.postAddProduct
);

router.put(
  '/edit-product/:productId',
  isAuth,
  addProduct(),
  adminController.postEditProduct
);

router.delete(
  '/delete-product/:productId',
  isAuth,
  adminController.postDeleteProduct
);

module.exports = router;
