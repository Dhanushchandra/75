const Teacher = require("../models/teacherSchema");
const Student = require("../models/studentSchema");
const jwt = require("jsonwebtoken");

const {
  comparePassword,
  hashPassword,
} = require("../utils/helpers/hashPassword");
const { generateToken } = require("../utils/helpers/tokenGenerate");
const sendEmail = require("../utils/helpers/mailSender");
const {
  WebSockerGenerateQRCode,
  WebSockerAttendance,
} = require("../utils/helpers/webSocket");

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
    res.status(500).json({
      message: "Internal Server Error",
    });
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

    const teacher = await Teacher.findOne({
      email: email.toLowerCase(),
    });

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
      id: teacher._id,
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
        html: `<p>Click on the link below link to reset your password</p>
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
    return res.status(500).json({
      message: "Internal Server Error",
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
  }
};

exports.teacherProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      res.status(400).json({
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      message: "Teacher profile fetched successfully",
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        trn: teacher.trn,
        phone: teacher.phone,
        organization: teacher.organization,
        role: teacher.role,
        department: teacher.department,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.createClassName = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const newClass = { name, students: [], tempQR: [], recentAttendance: [] };

    teacher.classes.push(newClass);
    await teacher.save();

    return res.status(201).json(newClass);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server error!" });
  }
};

exports.updateClassName = async (req, res) => {
  const { name } = req.body;
  const { cid, id } = req.params;

  try {
    // Find the teacher and class by ID
    const teacher = await Teacher.findOne({ _id: id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));
    if (classIndex < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Update the class name
    teacher.classes[classIndex].name = name;
    await teacher.save();

    return res.status(200).json(teacher.classes[classIndex]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.deleteClass = async (req, res) => {
  const { cid, id } = req.params;

  try {
    // Find the teacher and class by ID
    const teacher = await Teacher.findOne({ _id: id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));
    if (classIndex < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Delete the class
    teacher.classes.splice(classIndex, 1);
    await teacher.save();

    return res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.getClasses = async (req, res) => {
  const { id } = req.params;

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    return res.status(200).json({
      message: "Classes fetched successfully",
      data: teacher.classes.map((c) => ({
        id: c._id,
        name: c.name,
        students: c.students,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.getClass = async (req, res) => {
  const { cid, id } = req.params;
  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));

    if (classIndex < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (!classIndex) {
      return res.status(404).json({ message: "Class not found" });
    }

    return res.status(200).json({
      message: "Class fetched successfully",
      data: {
        id: teacher.classes[classIndex]._id,
        name: teacher.classes[classIndex].name,
        students: teacher.classes[classIndex].students,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.addStudentToClass = async (req, res) => {
  const { studentId } = req.body;
  const { cid, id } = req.params;

  try {
    // Find the teacher and class by ID
    const teacher = await Teacher.findOne({ _id: id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));
    if (classIndex < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Find the student by ID
    const student = await Student.findOne({ srn: studentId.toUpperCase() });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.university !== teacher.organization) {
      return res
        .status(400)
        .json({ message: "Student does not belong to your university" });
    }

    // Check if student already exists in the class
    const studentExists = teacher.classes[classIndex].students.some((s) =>
      s._id.equals(student._id)
    );
    if (studentExists) {
      return res
        .status(400)
        .json({ message: "Student already exists in the class" });
    }

    // Add the student reference to the class
    teacher.classes[classIndex].students.push(student._id);
    await teacher.save();

    const classDetails = {
      className: teacher.classes[classIndex].name,
      classId: cid,
      teacherId: id,
      date: new Date(),
    };
    student.classes.push(classDetails);
    await student.save();

    return res.status(200).json({
      message: "Student added to class successfully",
      data: {
        id: teacher.classes[classIndex]._id,
        name: teacher.classes[classIndex].name,
        students: teacher.classes[classIndex].students,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.removeStudentFromClass = async (req, res) => {
  const { studentId } = req.body;
  const { cid, id } = req.params;

  try {
    // Find the teacher and class by ID
    const teacher = await Teacher.findOne({ _id: id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));
    if (classIndex < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Find the student by ID
    const student = await Student.findOne({ srn: studentId });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if the student is in the class
    const studentIndex = teacher.classes[classIndex].students.findIndex((s) =>
      s._id.equals(student._id)
    );
    if (studentIndex < 0) {
      return res.status(404).json({ message: "Student is not in the class" });
    }

    // Remove the student reference from the class
    teacher.classes[classIndex].students.splice(studentIndex, 1);
    await teacher.save();

    return res.status(200).json({
      message: "Student removed from class successfully",
      data: {
        id: teacher.classes[classIndex]._id,
        name: teacher.classes[classIndex].name,
        students: teacher.classes[classIndex].students,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.addStudentsAttendance = async (req, res) => {
  const { id, cid } = req.params;

  const { studentId } = req.body;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const student = await Student.findOne({ srn: studentId.toUpperCase() });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.slice(-1)[0];

    if (!recentAttendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    const isStudentRegistered = recentAttendance.students.some((s) =>
      s.studentId.equals(student._id)
    );

    if (isStudentRegistered) {
      return res.status(404).json({ message: "Student already registered" });
    }

    recentAttendance.students.push({
      studentId: student._id,
      date: new Date(),
    });

    await teacher.save();

    student.scannedQr.push({
      attendanceId: recentAttendance._id,
      className: classRecent.name,
      date: new Date(),
    });

    await student.save();

    return res.status(200).json({
      message: "Student registered successfully",
      data: recentAttendance,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.removeStudentsAttendance = async (req, res) => {
  const { id, cid } = req.params;

  const { studentId } = req.body;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    const student = await Student.findOne({ srn: studentId.toUpperCase() });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const recentAttendance = classRecent.recentAttendance.slice(-1)[0];

    if (!recentAttendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    // Remove the student reference from the class

    const isStudentRegistered = recentAttendance.students.some((s) =>
      s.studentId.equals(student._id)
    );

    if (!isStudentRegistered) {
      return res.status(404).json({ message: "Student not registered" });
    }

    recentAttendance.students = recentAttendance.students.filter(
      (s) => s.studentId.toString() !== student._id.toString()
    );

    await teacher.save();

    if (student.scannedQr.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.scannedQr = student.scannedQr.filter(
      (s) => s.attendanceId.toString() !== recentAttendance._id.toString()
    );

    await student.save();

    return res.status(200).json({
      message: "Student removed successfully",
      data: recentAttendance,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.getAllAttendance = async (req, res) => {
  const { id, cid } = req.params;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    return res.status(200).json({
      message: "Attendance fetched successfully",
      data: classRecent.recentAttendance,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.getSpecificAttendance = async (req, res) => {
  const { id, cid, attId } = req.params;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.find((r) =>
      r._id.equals(attId)
    );

    if (!recentAttendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    await teacher.populate({
      path: "classes.recentAttendance.students",
      select: "name srn",
    });

    return res.status(200).json({
      message: "Attendance fetched successfully",
      data: recentAttendance,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.deleteAttendance = async (req, res) => {
  const { id, cid, attId } = req.params;
  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.find((r) =>
      r._id.equals(attId)
    );

    if (!recentAttendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    const attendanceIndex = classRecent.recentAttendance.findIndex((r) =>
      r._id.equals(attId)
    );

    classRecent.recentAttendance.splice(attendanceIndex, 1);

    await teacher.save();

    return res.status(200).json({
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.getAttendanceByDate = async (req, res) => {
  try {
    const { id, cid } = req.params;
    const { date } = req.body; //yyyy-mm-dd

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.find(
      (r) =>
        r.date.toISOString().split("T")[0] ===
        new Date(date).toISOString().split("T")[0]
    );

    if (!recentAttendance || recentAttendance.length === 0) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    return res.status(200).json({
      message: "Attendance fetched successfully",
      data: recentAttendance,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server error" });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const { id, cid } = req.params;

    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance;

    if (!recentAttendance || recentAttendance.length === 0) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    const attendanceStats = recentAttendance.map((r) => ({
      date: r.date.toISOString().split("T")[0],
      present: r.students.length,
      absent: classRecent.students.length - r.students.length,
    }));

    return res.status(200).json({
      message: "Attendance stats fetched successfully",
      data: attendanceStats,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server error" });
  }
};
