const Student = require("../models/studentSchema");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const {
  studentSchemaValidation,
} = require("../utils/helpers/validationSchema");

const {
  hashPassword,
  comparePassword,
} = require("../utils/helpers/hashPassword");
const { generateToken } = require("../utils/helpers/tokenGenerate");
const sendEmail = require("../utils/helpers/mailSender");

exports.studentSignUp = async (req, res) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    phone,
    university,
    department,
    srn,
  } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).send({
      message: "Password and confirm password does not match",
    });
  }

  const validation = await studentSchemaValidation.validate({
    name,
    email,
    password,
    phone,
    university,
    department,
    srn,
  });

  if (validation.error) {
    return res.status(400).send({
      message: "Invalid data",
      error: validation.error.details[0].message,
    });
  }

  try {
    const existStudent = await Student.findOne({ srn: srn.toUpperCase() });
    if (existStudent) {
      return res.status(400).send({
        message: "Student already exists",
      });
    }

    const hashedPassword = await hashPassword(password);

    const student = await Student({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      university,
      department,
      srn: srn.toUpperCase(),
      emailToken: crypto.randomBytes(64).toString("hex"),
    });

    await student.save();

    await sendEmail({
      email: student.email,
      subject: "Welcome to QR Attendance",
      text: "Welcome to QR Attendance",
      html: `<h1>Verify your email</h1>
        <p>Click the link below to verify your email</p>
        <a href="http://${req.headers.host}/api/student/verify-email?token=${student.emailToken}">http://${req.headers.host}/api/student/verify-email?token=${student.emailToken}</a>
        <p>Thank you</p>
        <p>Team</p>
        <p>QR Management System</p>
        `,
    });

    res.status(200).send({
      message: "Student created successfully",
      data: student,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Error while creating student",
      error: err,
    });
  }
};

exports.verifyStudentEmail = async (req, res) => {
  try {
    const token = req.query.token;
    const user = await Student.findOne({ emailToken: token });
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

exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        message: "Invalid email or password",
      });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });

    if (!student) {
      return res.status(400).send({
        message: "Invalid email or password",
      });
    }
    const isPasswordValid = await comparePassword(password, student.password);
    if (!isPasswordValid) {
      return res.status(400).send({
        message: "Invalid email or password",
      });
    }

    if (!student.verified) {
      return res.status(400).send({
        message: "Please verify your email address",
      });
    }

    const token = await generateToken({
      id: student._id,
      role: student.role,
      organization: student.organization,
      email: student.email,
    });

    res.status(200).send({
      message: "Login successful",
      data: {
        token,
        student,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Internal Server Error",
    });
  }
};

exports.studentForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Student.findOne({ email });

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
        html: `<p>Click on the link below to reset your password</p>
        <a href="http://${req.headers.host}/api/student/reset-password?token=${token}">
        http://${req.headers.host}/api/student/reset-password?token=${token}
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

exports.studentResetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Student.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }

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

exports.studentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select("-password");
    res.status(200).json({
      message: "Profile fetched successfully",
      data: student,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
