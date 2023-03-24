const route = require("express").Router();
const {
  AdminSignUp,
  AdminLogin,
  verifyAdminEmail,
  adminForgotPassword,
  adminResetPassword,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAllTeachers,
  getTeacher,
  toggleIP,
  addIP,
  getIP,
  toggleLocation,
  addLocation,
  getLocation,
  listUniversities,
  getAllStudents,
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

route.get("/verify-email", verifyAdminEmail);
route.get("/forgot-password", adminForgotPassword);
route.get("/reset-password", adminResetPassword);

//Teacher
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

//IP

route.post("/toggleip/:id", [verifyToken, verifyAdmin], toggleIP);
route.post("/addip/:id", [verifyToken, verifyAdmin], addIP);
route.get("/getip/:id", [verifyToken, verifyAdmin], getIP);

//Location

route.post("/togglelocation/:id", [verifyToken, verifyAdmin], toggleLocation);
route.post("/addlocation/:id", [verifyToken, verifyAdmin], addLocation);
route.get("/getlocation/:id", [verifyToken, verifyAdmin], getLocation);

//Student

route.get("/university-list", listUniversities);
route.get("/getallstudents/:id", [verifyToken, verifyAdmin], getAllStudents);

module.exports = route;
