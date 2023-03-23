const Admin = require("../../models/adminSchema");
const Teacher = require("../../models/teacherSchema");

exports.checkAdminDuplicateEmail = async (req, res, next) => {
  const admin = await Admin({ email: req.body.email });

  if (admin) {
    res.status(400).send({ message: "Failed! Email is already in use!" });
    return;
  }

  next();
};

exports.checkTeacherDuplicateEmail = async (req, res, next) => {
  const teacher = await Teacher({ email: req.body.email });

  if (teacher) {
    res.status(400).send({ message: "Failed! Email is already in use!" });
    return;
  }

  next();
};
