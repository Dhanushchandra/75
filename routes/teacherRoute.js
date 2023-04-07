const {
  verifyTeacherEmail,
  teacherLogin,
  teacherForgotPassword,
  teacherResetPassword,
  teacherProfile,
  createClassName,
  updateClassName,
  deleteClass,
  getClass,
  getClasses,
  addStudentToClass,
  removeStudentFromClass,
  addStudentsAttendance,
  removeStudentsAttendance,
  getAllAttendance,
  getSpecificAttendance,
  deleteAttendance,
  getAttendanceByDate,
  getAttendanceStats,
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
route.get("/classes/:id", [verifyToken, verifyTeacher], getClasses);
route.get("/class/:id/:cid", [verifyToken, verifyTeacher], getClass);
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

route.put(
  "/update-attendance/:id/:cid",
  [verifyToken, verifyTeacher],
  addStudentsAttendance
);

route.put(
  "/remove-attendance/:id/:cid",
  [verifyToken, verifyTeacher],
  removeStudentsAttendance
);

route.get(
  "/attendance/:id/:cid",
  [verifyToken, verifyTeacher],
  getAllAttendance
);
route.get(
  "/attendance/:id/:cid/:attId",
  [verifyToken, verifyTeacher],
  getSpecificAttendance
);
route.delete(
  "/delete-attendance/:id/:cid/:attId",
  [verifyToken, verifyTeacher],
  deleteAttendance
);
route.get(
  "/attendance-by-date/:id/:cid",
  [verifyToken, verifyTeacher],
  getAttendanceByDate
);
route.get(
  "/attendance-stats/:id/:cid",
  [verifyToken, verifyTeacher],
  getAttendanceStats
);

module.exports = route;
