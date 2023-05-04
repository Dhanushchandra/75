const Admin = require("../../models/adminSchema");
const Teacher = require("../../models/teacherSchema");
const Student = require("../../models/studentSchema");

exports.checkAdminDuplicateEmail = async (req, res, next) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email.toLowerCase() });

    if (admin) {
      res.status(400).send({
        data: { error: "Failed! Email is already in use!", isExist: true },
      });
      return;
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.checkTeacherDuplicateEmail = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({
      email: req.body.email.toLowerCase(),
    });

    if (teacher) {
      res
        .status(400)
        .send({ error: "Failed! Email is already in use!", isExist: true });
      return;
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.checkStudentDuplicateEmail = async (req, res, next) => {
  try {
    const student = await Student.findOne({
      email: req.body.email.toLowerCase(),
    });

    if (student) {
      res
        .status(400)
        .send({ error: "Failed! Email is already in use!", isExist: true });
      return;
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
