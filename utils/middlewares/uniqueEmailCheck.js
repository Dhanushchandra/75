const Admin = require("../../models/adminSchema");
const Teacher = require("../../models/teacherSchema");

exports.checkAdminDuplicateEmail = async (req, res, next) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email.toLowerCase() });

    if (admin) {
      res.status(400).send({ message: "Failed! Email is already in use!" });
      return;
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.checkTeacherDuplicateEmail = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({
      email: req.body.email.toLowerCase(),
    });

    if (teacher) {
      res.status(400).send({ message: "Failed! Email is already in use!" });
      return;
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
