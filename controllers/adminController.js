const Admin = require("../models/adminSchema");
const Student = require("../models/studentSchema");
const Teacher = require("../models/teacherSchema");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  adminSchemaValidation,
  teacherSchemaValidation,
  teacherUpdateSchemaValidation,
} = require("../utils/helpers/validationSchema");

//helpers
const {
  hashPassword,
  comparePassword,
} = require("../utils/helpers/hashPassword");
const { generateToken } = require("../utils/helpers/tokenGenerate");
const sendEmail = require("../utils/helpers/mailSender");

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
      emailToken: crypto.randomBytes(64).toString("hex"),
    });

    const data = await admin.save();

    sendEmail({
      email: data.email,
      emailToken: data.emailToken,
      subject: "Email Verification",
      html: `<h1>Verify your email</h1>
        <p>Click the link below to verify your email</p>
        <a href="http://${req.headers.host}/api/admin/verify-email?token=${data.emailToken}">http://${req.headers.host}/api/admin/verify-email?token=${data.emailToken}</a>
        <p>Thank you</p>
        <p>Team</p>
        <p>QR Management System</p>
        `,
    });

    return res.status(200).json({
      message: "Admin Created Successfully",
      data: {
        id: data._id,
        username: data.username,
        email: data.email,
        organization: data.organization,
        role: data.role,
      },
    });
  } catch (err) {
    console.log(err);
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

      if (!admin.verified)
        return res.status(400).json({
          message: "Admin Login Failed",
          err: "Email is not verified",
        });

      if (isMatch) {
        const token = await generateToken({
          id: admin._id,
          role: admin.role,
          organization: admin.organization,
          email: admin.email,
        });

        return res.status(200).json({
          message: "Admin Login Successfully",
          data: {
            id: admin._id,
            username: admin.username,
            email: admin.email,
            organization: admin.organization,
            token: token,
          },
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

exports.verifyAdminEmail = async (req, res) => {
  try {
    const token = req.query.token;
    const user = await Admin.findOne({ emailToken: token });
    if (user) {
      user.emailToken = null;
      user.verified = true;
      await user.save();
      res.status(200).json({
        message: "Email verified successfully",
      });
    } else {
      res.status(400).json({
        message: "Invalid token",
      });
    }
  } catch (err) {
    console.log(err);
  }
};

exports.adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Admin.findOne({ email });

    if (user) {
      if (!user.verified)
        return res.status(400).json({
          message: "Email is not verified",
        });

      const secret = process.env.JWT_SECRET + user.password;

      const payload = {
        email: user.email,
        id: user._id,
      };

      const token = jwt.sign(payload, secret, { expiresIn: "5m" });

      await sendEmail({
        email: user.email,
        subject: "Reset your password",
        html: `<p>Click on the link below link to reset your password</p>
        <a href="http://${req.headers.host}/api/admin/reset-password?token=${token}">
        http://${req.headers.host}/api/admin/reset-password?token=${token}
        </a>,
        <p>This link will expire in 5 minutes</p>
        <p>If you did not request a password reset, please ignore this email</p>
        <p>Thank you</p>
        <p>Team Qr Management System</p>
        `,
      });

      return res.status(200).json({
        message: "Reset email sent successfully",
      });
    }

    return res.status(400).json({
      message: "Invalid email",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
};

exports.adminResetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Admin.findOne({ email });
    const secret = process.env.JWT_SECRET + user.password;
    const { token } = req.query;

    if (user) {
      try {
        const payload = jwt.verify(token, secret);

        if (payload.email === user.email) {
          const hash = await hashPassword(password);
          user.password = hash;
          await user.save();
          res.status(200).json({
            message: "Password reset successfully",
          });
        } else {
          res.status(400).json({
            message: "Invalid token",
          });
        }
      } catch (err) {
        console.log(err);
        res.status(400).json({
          message: "token expired",
        });
      }
    }
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
    console.log(err);
  }
};

exports.adminProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id).select("-password");

    if (!admin) {
      return res.status(404).json({
        message: "Admin Not Found",
      });
    }

    return res.status(200).json({
      message: "Admin Profile",
      data: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        organization: admin.organization,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

//Teacher Controller

exports.createTeacher = async (req, res) => {
  const validation = await teacherSchemaValidation.validate({
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    password: req.body.password,
    phone: req.body.phone,
    organization: req.params.id,
    trn: req.body.trn,
    department: req.body.department,
  });

  if (validation.error)
    return res
      .status(400)
      .json({ message: validation.error.details[0].message });

  try {
    const { name, email, password, confirmPassword, phone, trn, department } =
      req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Password and Confirm Password do not match",
      });
    }

    let teacher = await Teacher.findOne({ trn: trn });

    if (teacher) {
      return res.status(400).json({
        message: "Teacher already exists",
      });
    }

    const hashedPassword = await hashPassword(password);

    teacher = new Teacher({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      trn,
      organization: req.params.id,
      department,
      emailToken: crypto.randomBytes(64).toString("hex"),
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

    sendEmail({
      email: teacher.email,
      subject: "Welcome to the Teacher Portal",
      html: `<h1>Welcome to the Teacher Portal</h1>
          <p>Hi ${teacher.name},</p>
          <p>Verify your email address by clicking the link below.</p>
          <a href="http://${req.headers.host}/api/teacher/verify-email?token=${teacher.emailToken}">Verify Email</a>
          <p>or</p>
          <p>Copy and paste the following link in your browser:</p>
          <p>http://${req.headers.host}/api/teacher/verify-email?token=${teacher.emailToken}</p>

          <p>You can now login to your account and start using the Teacher Portal.</p>
          <p>Email: ${teacher.email}</p>
          <p>Password: ${password}</p>

          <p>Thank you for registering with us..</p>
          <p>Regards,</p>
          <p>QR management system.</p>
          `,
    });

    return res.status(200).json({
      message: "Teacher Created Successfully",
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        trn: teacher.trn,
        organization: teacher.organization,
        department: teacher.department,
        role: teacher.role,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      message: "Teacher Creation Failed",
      err,
    });
  }
};

exports.updateTeacher = async (req, res) => {
  const validation = await teacherUpdateSchemaValidation.validate(req.body);

  if (validation.error) {
    return res
      .status(400)
      .json({ message: validation.error.details[0].message });
  }

  try {
    const { id, tid } = req.params;
    const updateFields = req.body;

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (!admin.teachers.includes(tid)) {
      return res.status(403).json({
        message: "You are not authorized to update this teacher",
      });
    }

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
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        trn: teacher.trn,
        organization: teacher.organization,
        department: teacher.department,
        role: teacher.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
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

    if (!admin.teachers.includes(tid)) {
      return res.status(403).json({
        message: "You are not authorized to update this teacher",
      });
    }

    admin.teachers = admin.teachers.filter(
      (teacher) => teacher.toString() !== tid
    );

    await admin.save();

    return res.status(200).json({
      message: "Teacher deleted successfully",
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        trn: teacher.trn,
        organization: teacher.organization,
        department: teacher.department,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
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
      data: admin.teachers.map((teacher) => ({
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        trn: teacher.trn,
        organization: teacher.organization,
        department: teacher.department,
      })),
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
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
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        trn: teacher.trn,
        organization: teacher.organization,
        department: teacher.department,
        role: teacher.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

//IP Controller

exports.toggleIP = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    admin.isIpVerification = !admin.isIpVerification;

    if (admin.isIpVerification === false) {
      admin.ipAddress = null;
    }

    await admin.save();

    return res.status(200).json({
      message: "IP toggled successfully",
      data: {
        isIpVerification: admin.isIpVerification,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to toggle IP",
    });
  }
};

exports.addIP = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (admin.isIpVerification === false) {
      return res.status(400).json({
        message: "IP Verification is not enabled",
      });
    }

    if (!req.body.ipAddress) {
      return res.status(400).json({
        message: "IP Address not provided",
      });
    }

    admin.ipAddress = req.body.ipAddress;

    await admin.save();

    return res.status(200).json({
      message: "IP added successfully",
      data: {
        ipAddress: admin.ipAddress,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.getIP = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (admin.isIpVerification === false) {
      return res.status(400).json({
        message: "IP Verification is not enabled",
      });
    }

    return res.status(200).json({
      message: "IP fetched successfully",
      data: {
        ipAddress: admin.ipAddress,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

//Location Controller

exports.toggleLocation = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    admin.isLocationVerification = !admin.isLocationVerification;

    if (admin.isLocationVerification === false) {
      admin.location.actualCredential.lat = "";
      admin.location.actualCredential.long = "";
      admin.location.leftTopCredential.lat = "";
      admin.location.leftTopCredential.long = "";
      admin.location.rightBottomCredential.lat = "";
      admin.location.rightBottomCredential.long = "";
    }

    await admin.save();

    return res.status(200).json({
      message: "Location toggled successfully",
      data: {
        isLocationVerification: admin.isLocationVerification,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.addLocation = async (req, res) => {
  try {
    const { lat, long, meters } = req.body;

    const R = 6371; // Earth's radius in kilometers
    const d = meters ? meters / 1000 : 0.1;

    const lat1 = (Math.PI / 180) * lat;
    const lng1 = (Math.PI / 180) * long;

    // Calculate the latitude and longitude of the top-left and bottom-right coordinates
    const latTopLeft = (180 / Math.PI) * (lat1 + d / R);
    const lngTopLeft = (180 / Math.PI) * (lng1 - d / R / Math.cos(lat1));
    const latBottomRight = (180 / Math.PI) * (lat1 - d / R);
    const lngBottomRight = (180 / Math.PI) * (lng1 + d / R / Math.cos(lat1));

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (admin.isLocationVerification === false) {
      return res.status(400).json({
        message: "Location Verification is not enabled",
      });
    }

    admin.location.actualCredential.lat = lat;
    admin.location.actualCredential.long = long;
    admin.location.leftTopCredential.lat = latTopLeft;
    admin.location.leftTopCredential.long = lngTopLeft;
    admin.location.rightBottomCredential.lat = latBottomRight;
    admin.location.rightBottomCredential.long = lngBottomRight;

    await admin.save();

    return res.status(200).json({
      message: "Location added successfully",
      data: {
        actualCredential: admin.location.actualCredential,
        leftTopCredential: admin.location.leftTopCredential,
        rightBottomCredential: admin.location.rightBottomCredential,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.getLocation = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (admin.isLocationVerification === false) {
      return res.status(400).json({
        message: "Location Verification is not enabled",
      });
    }

    return res.status(200).json({
      message: "Location fetched successfully",
      data: {
        actualCredential: admin.location.actualCredential,
        leftTopCredential: admin.location.leftTopCredential,
        rightBottomCredential: admin.location.rightBottomCredential,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

//Students Controller

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({
      university: req.params.id,
    });

    return res.status(200).json({
      message: "Students fetched successfully",
      data: {
        students,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
