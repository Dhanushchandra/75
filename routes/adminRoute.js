const route = require("express").Router();
const {
  AdminSignUp,
  AdminLogin,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAllTeachers,
  getTeacher,
} = require("../controllers/adminController");

//Middlewares
const { verifyToken } = require("../utils/middlewares/tokenVerification");
const { verifyAdmin } = require("../utils/middlewares/userVerification");
const {
  checkAdminDuplicateEmail,
  checkTeacherDuplicateEmail,
} = require("../utils/middlewares/uniqueEmailCheck");

route.post("/signup", checkAdminDuplicateEmail, AdminSignUp);
route.get("/signin", AdminLogin);
route.post(
  "/createteacher/:id",
  [verifyToken, verifyAdmin, checkTeacherDuplicateEmail],
  createTeacher
);
route.post(
  "/updateteacher/:id/:tid",
  [verifyToken, verifyAdmin],
  updateTeacher
);
route.delete(
  "/deleteteacher/:id/:tid",
  [verifyToken, verifyAdmin],
  deleteTeacher
);
route.get("/getallteachers/:id", [verifyToken, verifyAdmin], getAllTeachers);
route.get("/getteacher/:id/:tid", [verifyToken, verifyAdmin], getTeacher);

module.exports = route;
