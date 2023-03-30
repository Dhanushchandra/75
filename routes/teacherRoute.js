const {
  verifyTeacherEmail,
  teacherLogin,
  teacherForgotPassword,
  teacherResetPassword,
  teacherProfile,
  createClassName,
  updateClassName,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  generateQRCode,
} = require("../controllers/teacherController");
const { verifyToken } = require("../utils/middlewares/tokenVerification");
const { verifyTeacher } = require("../utils/middlewares/userVerification");

const route = require("express").Router();

route.post("/verify-email", verifyTeacherEmail);
route.get("/signin", teacherLogin);
route.get("/forgot-password", teacherForgotPassword);
route.post("/reset-password", teacherResetPassword);
route.get("/profile/:id", [verifyToken, verifyTeacher], teacherProfile);
route.post("/create-class/:id", [verifyToken, verifyTeacher], createClassName);
route.put(
  "/update-class/:id/:cid",
  [verifyToken, verifyTeacher],
  updateClassName
);
route.delete(
  "/delete-class/:id/:cid",
  [verifyToken, verifyTeacher],
  deleteClass
);
route.put(
  "/add-student/:id/:cid",
  [verifyToken, verifyTeacher],
  addStudentToClass
);
route.put(
  "/remove-student/:id/:cid",
  [verifyToken, verifyTeacher],
  removeStudentFromClass
);

route.post(
  "/generate-qr/:id/:cid",
  [verifyToken, verifyTeacher],
  generateQRCode
);

module.exports = route;
