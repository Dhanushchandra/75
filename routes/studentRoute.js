const route = require("express").Router();
const {
  studentSignUp,
  verifyStudentEmail,
  studentLogin,
  studentForgotPassword,
  studentResetPassword,
  studentProfile,
  getAllStudentClasses,
  registerAttendance,
} = require("../controllers/studentController");
const {
  checkStudentDuplicateEmail,
} = require("../utils/middlewares/uniqueEmailCheck");

const { verifyToken } = require("../utils/middlewares/tokenVerification");
const { verifyStudent } = require("../utils/middlewares/userVerification");

route.post("/createstudent", checkStudentDuplicateEmail, studentSignUp);
route.get("/verify-email", verifyStudentEmail);
route.get("/signin", studentLogin);
route.get("/forgot-password", studentForgotPassword);
route.post("/reset-password", studentResetPassword);
route.get("/profile/:id", [verifyToken, verifyStudent], studentProfile);
route.get("/classes/:id", [verifyToken, verifyStudent], getAllStudentClasses);
route.post(
  "/register-attendance/:id",
  [verifyToken, verifyStudent],
  registerAttendance
);

module.exports = route;
