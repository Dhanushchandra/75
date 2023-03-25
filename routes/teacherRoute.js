const {
  verifyTeacherEmail,
  teacherLogin,
  teacherForgotPassword,
  teacherResetPassword,
  teacherProfile,
} = require("../controllers/teacherController");
const { verifyToken } = require("../utils/middlewares/tokenVerification");
const { verifyTeacher } = require("../utils/middlewares/userVerification");

const route = require("express").Router();

route.post("/verify-email", verifyTeacherEmail);
route.get("/signin", teacherLogin);
route.get("/forgot-password", teacherForgotPassword);
route.post("/reset-password", teacherResetPassword);
route.get("/profile/:id", [verifyToken, verifyTeacher], teacherProfile);

module.exports = route;
