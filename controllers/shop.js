const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");

const { Product, Order, Cart } = require("../models/");

exports.getProducts = (req, res, next) => {
  Product.findAll()
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findByPk(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  Product.findAll()
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user.getCart().then((cart) => {
    if (!cart) {
      return res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: [],
      });
    }
    return cart
      .getProducts()
      .then((products) => {
        res.render("shop/cart", {
          products: products,
          pageTitle: "Your Cart",
          path: "/cart",
        });
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  let fetchedCart;
  let newQuantity = 1;
  req.user
    .getCart()
    .then((cart) => {
      if (!cart) {
        Product.findByPk(prodId)
          .then((product) => {
            return Cart.create({ userId: req.user.id })
              .then((cart) => {
                return cart.addProduct(product, {
                  through: { quantity: newQuantity },
                });
              })
              .catch((err) => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
              });
          })
          .catch((err) => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          });
      } else {
        fetchedCart = cart;
        return cart
          .getProducts({ where: { id: prodId } })
          .then((products) => {
            let product;
            if (products.length > 0) {
              product = products[0];
            }

            if (product) {
              const oldQuantity = product.CartItem.quantity;
              newQuantity = oldQuantity + 1;
              return product;
            }
            return Product.findByPk(prodId);
          })
          .then((product) => {
            return fetchedCart.addProduct(product, {
              through: { quantity: newQuantity },
            });
          });
      }
    })
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  let availableCart;
  req.user
    .getCart()
    .then((cart) => {
      availableCart = cart;
      return cart.getProducts({ where: { id: prodId } });
    })
    .then((products) => {
      const product = products[0];
      return product.CartItem.destroy();
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  let fetchedCart;
  req.user
    .getCart()
    .then((cart) => {
      fetchedCart = cart;
      return cart.getProducts();
    })
    .then((products) => {
        return req.user
        .createOrder()
        .then((order) => {
          return order.addProducts(
            products.map((product) => {
              product.OrderItem = { quantity: product.CartItem.quantity };
              return product;
            })
          );
        })
        .catch((err) => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
    })
    .then((result) => {
      return fetchedCart.setProducts(null);
    })
    .then((result) => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.findAll({ where: { userId: req.user.id }, include: ['products']})
    .then((orders) => {
       res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
     Order.findByPk(orderId,{ include: ['products']})
    .then((order) => {
      if (!order) {
        return next(new Error("No order found."));
      }
      if (order.userId !== req.user.id) {
        return next(new Error("Unauthorized"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      });
      pdfDoc.text("-----------------------");
      let totalPrice = 0;
        order.products.forEach((prod) => {
        totalPrice += prod.OrderItem.quantity * prod.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.title +
              " - " +
              prod.OrderItem.quantity +
              " x " +
              "$" +
              prod.price
          );
      });
      pdfDoc.text("---");
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice);

      pdfDoc.end();
    })
    .catch((err) => console.log(err));
};
