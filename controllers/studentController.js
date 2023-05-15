const Student = require("../models/studentSchema");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/teacherSchema");
const Admin = require("../models/adminSchema");

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
      error: "Password and confirm password does not match",
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
        error: "Student already exists",
        isStudentExist: true,
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
        <a href="${process.env.FRONTEND_URL}/student/email-verification-status?token=${student.emailToken}">${process.env.FRONTEND_URL}/student/email-verification-status?token=${student.emailToken}</a>
        <p>Thank you</p>
        <p>Team</p>
        <p>QR Management System</p>
        `,
    });

    res.status(200).send({
      message: "Student created successfully",
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        university: student.university,
        department: student.department,
        srn: student.srn,
        role: student.role,
      },
    });
  } catch (err) {
    res.status(500).send({
      error: "Internal Server Error",
    });
  }
};

exports.listUniversities = async (req, res) => {
  try {
    const admin = await Admin.find().select("_id organization");

    return res.status(200).json({
      message: "Universities fetched successfully",
      data: {
        admin,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "Internal Server Error",
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
        error: "Invalid token",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        error: "Invalid email or password",
      });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });

    if (!student) {
      return res.status(400).send({
        error: "Invalid email or password",
      });
    }
    const isPasswordValid = await comparePassword(password, student.password);
    if (!isPasswordValid) {
      return res.status(400).send({
        error: "Invalid email or password",
      });
    }

    if (!student.verified) {
      return res.status(400).send({
        error: "Please verify your email address",
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
        id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        university: student.university,
        department: student.department,
        srn: student.srn,
        role: student.role,
      },
    });
  } catch (err) {
    res.status(500).send({
      error: "Internal Server Error",
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
          error: "Email is not verified",
        });

      const secret = process.env.JWT_SECRET;

      const payload = {
        email: user.email,
        id: user._id,
      };

      const token = jwt.sign(payload, secret, { expiresIn: "15m" });

      await sendEmail({
        email: user.email,
        subject: "Reset your password",
        html: `<p>Click on the link below link to reset your password</p>
        <a href="${process.env.FRONTEND_URL}/student/reset-password?token=${token}">
        ${process.env.FRONTEND_URL}/student/reset-password?token=${token}
        </a>,
        <p>This link will expire in 15 minutes</p>
        <p>If you did not request a password reset, please ignore this email</p>
        <p>Thank you</p>
        <p>Team Qr Attendance Engine</p>
        `,
      });

      return res.status(200).json({
        message: "Reset email sent successfully",
      });
    }

    return res.status(400).json({
      error: "Invalid email",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

//   const { email, password } = req.body;

//   try {
//     const user = await Student.findOne({ email });

//     if (!user) {
//       return res.status(400).json({
//         message: "Invalid email",
//       });
//     }

//     const secret = process.env.JWT_SECRET + user.password;
//     const { token } = req.query;

//     if (user) {
//       try {
//         const payload = jwt.verify(token, secret);

//         if (payload.email === user.email) {
//           const hash = await hashPassword(password);
//           user.password = hash;
//           await user.save();
//           res.status(200).json({
//             message: "Password reset successfully",
//           });
//         } else {
//           res.status(400).json({
//             message: "Invalid token",
//           });
//         }
//       } catch (err) {
//         console.log(err);
//         res.status(400).json({
//           message: "token expired",
//         });
//       }
//     }
//   } catch (err) {
//     res.status(500).json({
//       message: "Internal Server Error",
//     });
//   }
// };

exports.studentResetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.query;

    const secret = process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret);

    console.log(payload);

    const user = await Student.findById(payload.id);

    if (!user) {
      return res.status(400).json({
        error: "Invalid token",
      });
    } else {
      const hash = await hashPassword(password);
      user.password = hash;
      await user.save();

      return res.status(200).json({
        message: "Password reset successfully",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
    });
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
      error: "Internal Server Error",
    });
  }
};

exports.updateStudentProfile = async (req, res) => {
  try {
    const { name, phone, department } = req.body;
    const { id } = req.params;

    const student = await Student.findById(id).select("-password");

    if (!student) {
      return res.status(400).json({
        message: "Invalid student",
      });
    }

    student.name = name ? name : student.name;
    student.phone = phone ? phone : student.phone;
    student.department = department ? department : student.department;

    await student.save();

    res.status(200).json({
      message: "Profile updated successfully",
      data: student,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.getAllStudentClasses = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id).populate("classes.classId");
    res.status(200).json({
      message: "Classes fetched successfully",
      data: student.classes,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

exports.registerAttendance = async (req, res) => {
  const { qrCodes, classId } = req.body;

  const { id } = req.params;

  if (!qrCodes || !classId) {
    return res.status(400).json({
      error: "Invalid data",
    });
  }

  try {
    const student = await Student.findById(id);

    if (!student) {
      return res.status(400).json({
        error: "Invalid student",
      });
    }

    const studentClass = student.classes.find((c) => c.classId == classId);

    if (!studentClass) {
      return res.status(400).json({
        error: "Invalid class",
      });
    }

    const currentTime = new Date();

    if (qrCodes.length === 0) {
      return res.status(400).json({
        error: "No QR code scanned",
      });
    }

    const teacherId = studentClass.teacherId;

    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(400).json({
        error: "Invalid teacher",
      });
    }

    const teacherClass = teacher.classes.find((c) => c._id == classId);

    if (!teacherClass) {
      return res.status(400).json({
        error: "Invalid class",
      });
    }

    //Qr code validation
    const tempQrCode = teacherClass.tempQR;

    if (!tempQrCode || tempQrCode.length === 0) {
      return res.status(400).json({
        error: "Attendance not started",
      });
    }

    const checkTime = 2; //in minutes

    const recentQrCodes = teacherClass.tempQR
      .filter((qrObj) => qrObj.time > currentTime - checkTime * 60 * 1000)
      .map((qrObj) => qrObj.qr);

    const match = qrCodes.every((qrCode) => recentQrCodes.includes(qrCode));

    if (!match) {
      return res.status(400).json({
        error: "Invalid QR code",
      });
    }

    //IP verification
    const admin = await Admin.findById(student.university);

    if (admin.isIpVerification) {
      const { ip } = req.body;

      if (!ip) {
        return res.status(400).json({
          error: "Invalid data",
        });
      }

      if (ip !== admin.ipAddress) {
        return res.status(400).json({
          error: "Invalid IP address",
        });
      }
    }

    //Location verification

    function checkLocation(
      lat,
      long,
      leftTopCredential,
      rightBottomCredential
    ) {
      var userLatitude = lat;
      var userLongitude = long;
      var leftTop = { lat: leftTopCredential.lat, lng: leftTopCredential.long };
      var rightBottom = {
        lat: rightBottomCredential.lat,
        lng: rightBottomCredential.long,
      };

      if (
        userLatitude >= rightBottom.lat &&
        userLatitude <= leftTop.lat &&
        userLongitude >= leftTop.lng &&
        userLongitude <= rightBottom.lng
      ) {
        return true;
      } else {
        return false;
      }
    }

    if (admin.isLocationVerification) {
      const { lat, long } = req.body;

      const isLocation = checkLocation(
        lat,
        long,
        admin.location.leftTopCredential,
        admin.location.rightBottomCredential
      );

      if (!isLocation) {
        return res.status(400).json({
          error: "Invalid location",
        });
      }
    }

    //------------------

    const recentAttendance = teacherClass.recentAttendance.slice(-1)[0];

    if (!recentAttendance) {
      return res.status(400).json({
        error: "Attendance not started",
      });
    }

    const isStudentRegistered = recentAttendance.students.some((s) =>
      s.studentId.equals(student._id)
    );

    if (isStudentRegistered) {
      return res.status(400).json({
        error: "Attendance already registered",
      });
    }

    recentAttendance.students.push({
      studentId: id,
      date: new Date(),
    });

    await teacher.save();

    student.scannedQr.push({
      attendanceId: recentAttendance._id,
      className: studentClass.className,
      classId: classId,
      date: new Date(),
    });

    await student.save();

    res.status(200).json({
      message: "Attendance registered successfully",
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

exports.getAttendance = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findById(id);

    res.status(200).json({
      message: "Attendance fetched successfully",
      data: student.scannedQr,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.getAttendanceByClass = async (req, res) => {
  const { id, cid } = req.params;

  try {
    const student = await Student.findById(id);

    const attendance = student.scannedQr.filter((r) => r.classId === cid);

    if (!attendance) {
      return res.status(400).json({
        error: "Invalid data",
      });
    }

    res.status(200).json({
      message: "Attendance fetched successfully",
      data: attendance,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

exports.getAttendanceByDate = async (req, res) => {
  try {
    const { id } = req.params;

    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        message: "Invalid data",
      });
    }

    const student = await Student.findById(id);

    if (!student) {
      return res.status(400).json({
        message: "Invalid student",
      });
    }

    const attendance = student.scannedQr.filter(
      (r) =>
        r.date.toISOString().split("T")[0] ===
        new Date(date).toISOString().split("T")[0]
    );

    if (!attendance || attendance.length === 0) {
      return res.status(400).json({
        message: "No attendance found",
      });
    }

    res.status(200).json({
      message: "Attendance fetched successfully",
      data: attendance,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const { id } = req.params;

    const { classId, teacherId } = req.body;

    if (!classId || !teacherId) {
      return res.status(400).json({
        message: "Invalid data",
      });
    }

    const student = await Student.findById(id);

    if (!student) {
      return res.status(400).json({
        message: "Invalid student",
      });
    }

    const studentClass = student.classes.find((c) => c.classId == classId);

    if (!studentClass) {
      return res.status(400).json({
        message: "Invalid class",
      });
    }

    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(400).json({
        message: "Invalid teacher",
      });
    }

    const teacherClass = teacher.classes.find((c) => c._id == classId);

    if (!teacherClass) {
      return res.status(400).json({
        message: "Invalid class",
      });
    }

    const attendance = teacherClass.recentAttendance;

    const totalClasses = attendance.length;

    const attendedClasses = attendance.filter((a) =>
      a.students.find((s) => s == id)
    ).length;

    const percentage = (attendedClasses / totalClasses) * 100;

    res.status(200).json({
      message: "Attendance stats fetched successfully",
      data: {
        totalClasses,
        attendedClasses,
        percentage,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.getAllAttendancePercentage = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await Student.findById(id).select("classes scannedQr");

    const classes = student.classes;

    const teacher = await Teacher.find({
      "classes._id": { $in: classes.map((c) => c.classId) },
    });

    const teacherClasses = teacher.map((t) =>
      t.classes.filter((c) => {
        const matchingClass = classes.find(
          (cl) => cl.classId.toString() === c._id.toString()
        );
        return matchingClass !== undefined;
      })
    );

    //get total attendance of each class

    const totalAttendance = teacherClasses.map((c) =>
      c.map((cl) => cl.recentAttendance.length)
    );

    //add all the attendance of each class

    const totalAttendanceSum = totalAttendance.map((c) =>
      c.reduce((a, b) => a + b, 0)
    );

    //student total attendance

    const studentAttendance = student.scannedQr.length;

    const percentage = (
      (studentAttendance / parseInt(totalAttendanceSum)) *
      100
    ).toFixed(2);

    res.status(200).json({
      message: "Attendance percentage fetched successfully",
      data: {
        percentage: parseInt(percentage) ? percentage : 0,
        total: parseInt(totalAttendanceSum) ? parseInt(totalAttendanceSum) : 0,
        attended: studentAttendance,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

//Student Authenticated

exports.StudentAuthenticate = async (req, res) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "No token found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const student = await Student.findById(decoded.id);

    if (!student) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    res.status(200).json({
      message: "Student authenticated successfully",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};
