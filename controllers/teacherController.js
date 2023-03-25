const Teacher = require("../models/teacherSchema");
const jwt = require("jsonwebtoken");

const {
  comparePassword,
  hashPassword,
} = require("../utils/helpers/hashPassword");
const { generateToken } = require("../utils/helpers/tokenGenerate");
const sendEmail = require("../utils/helpers/mailSender");

exports.verifyTeacherEmail = async (req, res) => {
  try {
    const token = req.query.token;
    const user = await Teacher.findOne({ emailToken: token });
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

exports.teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        message: "Invalid email or password",
      });
    }

    const teacher = await Teacher.findOne({ email: email.toLowerCase() });

    if (!teacher) {
      return res.status(400).send({
        message: "Invalid email or password",
      });
    }

    if (!teacher.verified) {
      return res.status(400).send({
        message: "Please verify your email address",
      });
    }

    const isPasswordValid = await comparePassword(password, teacher.password);

    if (!isPasswordValid) {
      return res.status(400).send({
        message: "Invalid email or password",
      });
    }

    const token = await generateToken({
      id: teacher._id,
      role: teacher.role,
      organization: teacher.organization,
      email: teacher.email,
    });

    res.status(200).send({
      message: "Login successful",
      token,
    });
  } catch (error) {
    res.status(500).send({
      message: "Internal server error",
    });
  }
};

exports.teacherForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Teacher.findOne({ email });

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
            <a href="http://${req.headers.host}/api/teacher/reset-password?token=${token}">
            http://${req.headers.host}/api/teacher/reset-password?token=${token}
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

exports.teacherResetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Teacher.findOne({ email });

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

exports.teacherProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).select("-password");

    if (!teacher) {
      res.status(400).json({
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      message: "Teacher profile fetched successfully",
      teacher,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
