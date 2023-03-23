const Admin = require("../models/adminSchema");
const Teacher = require("../models/teacherSchema");
const { adminSchemaValidation } = require("../utils/helpers/validationSchema");

//helpers
const {
  hashPassword,
  comparePassword,
} = require("../utils/helpers/hashPassword");
const { generateToken } = require("../utils/helpers/tokenGenerate");

exports.AdminSignUp = async (req, res) => {
  const { username, email, password, confirmPassword, organization } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({
      message: "Password and Confirm Password does not match",
    });
  }

  const hashedPassword = await hashPassword(password);

  const validation = await adminSchemaValidation.validate({
    username,
    email: email.toLowerCase(),
    password: hashedPassword,
    organization,
  });

  if (validation.error)
    return res
      .status(400)
      .json({ message: validation.error.details[0].message });

  try {
    const admin = new Admin({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      organization,
    });

    const data = await admin.save();

    return res.status(200).json({
      message: "Admin Created Successfully",
      data,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Admin Creation Failed",
      err,
    });
  }
};

exports.AdminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (admin) {
      const isMatch = await comparePassword(password, admin.password);

      if (isMatch) {
        const token = await generateToken({
          id: admin._id,
          role: admin.role,
          organization: admin.organization,
          email: admin.email,
        });

        return res.status(200).json({
          message: "Admin Login Successfully",
          data: admin,
          token,
        });
      } else {
        return res.status(400).json({
          message: "Admin Login Failed",
          err: "Email or Password does not match",
        });
      }
    } else {
      return res.status(400).json({
        message: "Admin Login Failed",
        err: "Email or Password does not match",
      });
    }
  } catch (err) {
    return res.status(400).json({
      message: "Admin Login Failed",
      err,
    });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      trn,
      organization,
      department,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Password and Confirm Password do not match",
      });
    }

    console.log(req.body);

    const hashedPassword = await hashPassword(password);

    const teacher = new Teacher({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      trn,
      organization: req.params.id,
      department,
    });

    // Check for validation errors on the Teacher model
    const errors = await teacher.validateSync();
    if (errors) {
      return res.status(400).json({
        message: "Teacher Creation Failed",
        errors,
      });
    }

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    admin.teachers.push(teacher._id);

    await admin.save();
    await teacher.save();

    return res.status(200).json({
      message: "Teacher Created Successfully",
      data: teacher,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Teacher Creation Failed",
      err,
    });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { tid } = req.params;
    const updateFields = req.body;

    const teacher = await Teacher.findByIdAndUpdate(tid, updateFields, {
      new: true,
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    return res.status(200).json({
      message: "Teacher updated successfully",
      data: teacher,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Failed to update teacher",
      err,
    });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { tid, id } = req.params;

    const teacher = await Teacher.findByIdAndDelete(tid);

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    admin.teachers = admin.teachers.filter(
      (teacher) => teacher.toString() !== tid
    );

    await admin.save();

    return res.status(200).json({
      message: "Teacher deleted successfully",
      data: teacher,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Failed to delete teacher",
      err,
    });
  }
};

exports.getAllTeachers = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).populate("teachers");

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (admin.teachers.length === 0) {
      return res.status(404).json({
        message: "No teachers found",
      });
    }

    return res.status(200).json({
      message: "Teachers fetched successfully",
      data: admin.teachers,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Failed to fetch teachers",
      err,
    });
  }
};

exports.getTeacher = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).populate("teachers");

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    const teacher = admin.teachers.find(
      (teacher) => teacher._id.toString() === req.params.tid
    );

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    return res.status(200).json({
      message: "Teacher fetched successfully",
      data: teacher,
    });
  } catch (err) {
    return res.status(400).json({
      message: "Failed to fetch teacher",
      err,
    });
  }
};
