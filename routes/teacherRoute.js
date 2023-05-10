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
  getStudentsForClass,
  addStudentsAttendance,
  addStudentsAttendanceByAttendanceId,
  removeStudentsAttendanceByAttendanceId,
  removeStudentsAttendance,
  getStudentsInRecentAttendance,
  getAllAttendance,
  getSpecificAttendance,
  deleteAttendance,
  getAttendanceByDate,
  getAttendanceStats,
  TeacherAuthenticate,
} = require("../controllers/teacherController");
const { verifyToken } = require("../utils/middlewares/tokenVerification");
const { verifyTeacher } = require("../utils/middlewares/userVerification");

const route = require("express").Router();

route.post("/verify-email", verifyTeacherEmail);
route.post("/signin", teacherLogin);
route.post("/forgot-password", teacherForgotPassword);
route.post("/reset-password", teacherResetPassword);
route.get("/profile/:id", [verifyToken, verifyTeacher], teacherProfile);
route.post("/create-class/:id", [verifyToken, verifyTeacher], createClassName);
route.post("/authenticate", verifyToken, TeacherAuthenticate);

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

route.get(
  "/students/:id/:cid",
  [verifyToken, verifyTeacher],
  getStudentsForClass
);

route.put(
  "/update-attendance/:id/:cid",
  [verifyToken, verifyTeacher],
  addStudentsAttendance
);

route.put(
  "/update-attendance-by-attendance-id/:id/:cid/:aid",
  [verifyToken, verifyTeacher],
  addStudentsAttendanceByAttendanceId
);

route.put(
  "/remove-attendance-by-attendance-id/:id/:cid/:aid",
  [verifyToken, verifyTeacher],
  removeStudentsAttendanceByAttendanceId
);

route.put(
  "/remove-attendance/:id/:cid",
  [verifyToken, verifyTeacher],
  removeStudentsAttendance
);

route.get(
  "/recent-attendance-students/:id/:cid",
  [verifyToken, verifyTeacher],
  getStudentsInRecentAttendance
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
