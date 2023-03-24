const Admin = require("../models/adminSchema");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/helpers/mailSender");
const { hashPassword } = require("../utils/helpers/hashPassword");

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
        url: `http://${req.headers.host}/admin/reset-password?token=${token}`,
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
