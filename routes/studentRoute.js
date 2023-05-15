const route = require("express").Router();
const {
  studentSignUp,
  listUniversities,
  verifyStudentEmail,
  studentLogin,
  studentForgotPassword,
  studentResetPassword,
  studentProfile,
  getAllStudentClasses,
  registerAttendance,
  updateStudentProfile,
  getAttendance,
  getAttendanceByClass,
  getAttendanceByDate,
  getAttendanceStats,
  getAllAttendancePercentage,
  StudentAuthenticate,
} = require("../controllers/studentController");
const {
  checkStudentDuplicateEmail,
} = require("../utils/middlewares/uniqueEmailCheck");

const { verifyToken } = require("../utils/middlewares/tokenVerification");
const { verifyStudent } = require("../utils/middlewares/userVerification");

route.post("/createstudent", checkStudentDuplicateEmail, studentSignUp);
route.get("/universities", listUniversities);
route.get("/verify-email", verifyStudentEmail);
route.post("/signin", studentLogin);
route.post("/forgot-password", studentForgotPassword);
route.post("/reset-password", studentResetPassword);
route.get("/profile/:id", [verifyToken, verifyStudent], studentProfile);
route.get("/classes/:id", [verifyToken, verifyStudent], getAllStudentClasses);
route.post(
  "/register-attendance/:id",
  [verifyToken, verifyStudent],
  registerAttendance
);
route.put(
  "/update-profile/:id",
  [verifyToken, verifyStudent],
  updateStudentProfile
);
route.get("/get-attendance/:id", [verifyToken, verifyStudent], getAttendance);

route.get(
  "/get-attendance/:id/:cid",
  [verifyToken, verifyStudent],
  getAttendanceByClass
);

route.get(
  "/get-attendance-by-date/:id",
  [verifyToken, verifyStudent],
  getAttendanceByDate
);
route.get(
  "/get-attendance-stats/:id",
  [verifyToken, verifyStudent],
  getAttendanceStats
);
route.get(
  "/get-attendance-percentage/:id",
  [verifyToken, verifyStudent],
  getAllAttendancePercentage
);
route.get("/authenticate", verifyToken, StudentAuthenticate);

module.exports = route;
