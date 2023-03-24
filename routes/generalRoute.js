const route = require("express").Router();
const {
  verifyAdminEmail,
  adminForgotPassword,
  adminResetPassword,
} = require("../controllers/generalController");

route.get("/verify-email", verifyAdminEmail);
route.get("/admin/forgot-password", adminForgotPassword);
route.get("/admin/reset-password", adminResetPassword);

module.exports = route;
