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
        error: "Invalid token",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

exports.teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        error: "Invalid email or password",
      });
    }

    const teacher = await Teacher.findOne({
      email: email.toLowerCase(),
    });

    if (!teacher) {
      return res.status(400).send({
        error: "Invalid email or password",
      });
    }

    if (!teacher.verified) {
      return res.status(400).send({
        error: "Please verify your email address",
      });
    }

    const isPasswordValid = await comparePassword(password, teacher.password);

    if (!isPasswordValid) {
      return res.status(400).send({
        error: "Invalid email or password",
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
      data: {
        id: teacher._id,
        username: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        organization: teacher.organization,
        department: teacher.department,
        role: teacher.role,
        token: token,
      },
    });
  } catch (error) {
    res.status(500).send({
      error: "Internal server error",
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
        <a href="${process.env.FRONTEND_URL}/teacher/reset-password?token=${token}"> 
        ${process.env.FRONTEND_URL}/teacher/reset-password?token=${token}   </a>
            <p>This link will expire in 15 minutes</p>
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
      error: "Invalid email",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

exports.teacherResetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.query;

    const secret = process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret);

    const user = await Teacher.findById(payload.id);

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
      return res.status(404).json({ error: "Teacher not found" });
    }

    const newClass = { name, students: [], tempQR: [], recentAttendance: [] };

    teacher.classes.push(newClass);
    await teacher.save();

    return res.status(201).json({
      message: "Class created successfully",
      data: {
        id: teacher.classes[teacher.classes.length - 1]._id,
        name: teacher.classes[teacher.classes.length - 1].name,
        recentAttendance: [],
        students: teacher.classes[teacher.classes.length - 1].students,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error!" });
  }
};

exports.updateClassName = async (req, res) => {
  const { name } = req.body;
  const { cid, id } = req.params;

  try {
    // Find the teacher and class by ID
    const teacher = await Teacher.findOne({ _id: id }).populate({
      path: "classes.students",
      model: "Student",
    });
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));
    if (classIndex < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Update the class name
    teacher.classes[classIndex].name = name;

    //Update the class name in the students array
    teacher.classes[classIndex].students.forEach(async (student) => {
      student.classes.forEach((c) => {
        console.log(c.className);
        if (c.classId == cid) {
          c.className = name;
        }
      });
      await student.save();
    });

    await teacher.save();

    return res.status(200).json(teacher.classes[classIndex]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.deleteClass = async (req, res) => {
  const { cid, id } = req.params;

  try {
    // Find the teacher and class by ID
    const teacher = await Teacher.findOne({ _id: id }).populate({
      path: "classes.students",
      model: "Student",
    });
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));
    if (classIndex < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Delete the class from the students array
    teacher.classes[classIndex].students.forEach(async (student) => {
      student.classes = student.classes.filter((c) => c.classId != cid);
      await student.save();
    });

    // Delete the class
    teacher.classes.splice(classIndex, 1);

    await teacher.save();

    return res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.getClasses = async (req, res) => {
  const { id } = req.params;

  try {
    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    return res.status(200).json({
      message: "Classes fetched successfully",
      data: teacher.classes.map((c) => ({
        id: c._id,
        name: c.name,
        recentAttendance: c.recentAttendance,
        students: c.students,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
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
    const teacher = await Teacher.findOne({ _id: id }).populate({
      path: "classes.students",
      model: "Student",
      select: "name srn _id email phone department",
    });
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));
    if (classIndex < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Find the student by ID
    const student = await Student.findOne({
      srn: studentId.toUpperCase(),
    }).select(
      "_id name srn email phone department university classes scannedQr"
    );
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.university !== teacher.organization) {
      return res
        .status(400)
        .json({ error: "Student does not belong to your university" });
    }

    // Check if student already exists in the class
    const studentExists = teacher.classes[classIndex].students.some((s) =>
      s._id.equals(student._id)
    );
    if (studentExists) {
      return res
        .status(400)
        .json({ error: "Student already exists in the class" });
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
        // students: teacher.classes[classIndex].students,
        student: {
          id: student._id,
          name: student.name,
          srn: student.srn,
          email: student.email,
          phone: student.phone,
          department: student.department,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
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

    // Remove the class reference from the student
    const classIndexInStudent = student.classes.findIndex(
      (c) => c.classId === cid
    );
    student.classes.splice(classIndexInStudent, 1);

    await teacher.save();
    await student.save();

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

exports.getStudentsForClass = async (req, res) => {
  const { cid, id } = req.params;

  try {
    // Find the teacher and class by ID
    const teacher = await Teacher.findOne({ _id: id }).populate({
      path: "classes",
      populate: {
        path: "students",
        select: "name srn email phone department",
      },
    });
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classIndex = teacher.classes.findIndex((c) => c._id.equals(cid));
    if (classIndex < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    const students = teacher.classes[classIndex].students;

    return res.status(200).json({
      message: "Students fetched successfully",
      data: {
        students,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.addStudentsAttendance = async (req, res) => {
  const { id, cid } = req.params;

  const { studentId } = req.body;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const student = await Student.findOne({ srn: studentId.toUpperCase() });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentClass = student.classes.find((c) => c.classId === cid);

    if (!studentClass) {
      return res
        .status(404)
        .json({ error: "Student does not belong to this class." });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.slice(-1)[0];

    if (!recentAttendance) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    const isStudentRegistered = recentAttendance.students.some((s) =>
      s.studentId.equals(student._id)
    );

    if (isStudentRegistered) {
      return res.status(404).json({ error: "Student already registered" });
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
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.addStudentsAttendanceByAttendanceId = async (req, res) => {
  const { id, cid, aid } = req.params;

  const { studentId } = req.body;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const student = await Student.findOne({ srn: studentId.toUpperCase() });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentClass = student.classes.find((c) => c.classId === cid);

    if (!studentClass) {
      return res
        .status(404)
        .json({ error: "Student does not belong to this class." });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.find((a) =>
      a._id.equals(aid)
    );

    if (!recentAttendance) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    const isStudentRegistered = recentAttendance.students.some((s) =>
      s.studentId.equals(student._id)
    );

    if (isStudentRegistered) {
      return res.status(404).json({ error: "Student already registered" });
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
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.removeStudentsAttendanceByAttendanceId = async (req, res) => {
  const { id, cid, aid } = req.params;

  const { studentId } = req.body;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const student = await Student.findOne({ srn: studentId.toUpperCase() });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentClass = student.classes.find((c) => c.classId === cid);

    if (!studentClass) {
      return res
        .status(404)
        .json({ error: "Student does not belong to this class." });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.find((a) =>
      a._id.equals(aid)
    );

    if (!recentAttendance) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    const isStudentRegistered = recentAttendance.students.some((s) =>
      s.studentId.equals(student._id)
    );

    if (!isStudentRegistered) {
      return res.status(404).json({ error: "Student not registered" });
    }

    recentAttendance.students = recentAttendance.students.filter(
      (s) => !s.studentId.equals(student._id)
    );

    await teacher.save();

    // student.scannedQr = student.scannedQr.filter(
    //   (s) => !s.attendanceId.equals(recentAttendance._id)
    // );

    student.scannedQr = student.scannedQr.filter(
      (s) => s.attendanceId.toString() !== recentAttendance._id.toString()
    );

    await student.save();

    return res.status(200).json({
      message: "Student removed successfully",
      data: recentAttendance,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.removeStudentsAttendance = async (req, res) => {
  const { id, cid } = req.params;

  const { studentId } = req.body;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    const student = await Student.findOne({ srn: studentId.toUpperCase() });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const recentAttendance = classRecent.recentAttendance.slice(-1)[0];

    if (!recentAttendance) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    // Remove the student reference from the class

    const isStudentRegistered = recentAttendance.students.some((s) =>
      s.studentId.equals(student._id)
    );

    if (!isStudentRegistered) {
      return res.status(404).json({ error: "Student not registered" });
    }

    recentAttendance.students = recentAttendance.students.filter(
      (s) => s.studentId.toString() !== student._id.toString()
    );

    await teacher.save();

    if (student.scannedQr.length === 0) {
      return res.status(404).json({ error: "Student not found" });
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
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.getStudentsInRecentAttendance = async (req, res) => {
  const { id, cid } = req.params;

  try {
    const teacher = await Teacher.findOne({ _id: id }).populate({
      path: "classes",
      match: { _id: cid },
      select: "recentAttendance",
      populate: {
        path: "recentAttendance.students.studentId",
        model: "Student",
        select: "name srn email phone department",
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.slice(-1)[0];

    if (!recentAttendance) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    const students = recentAttendance.students;

    return res.status(200).json({
      message: "Students fetched successfully",
      data: students.map((s) => s.studentId),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.getAllAttendance = async (req, res) => {
  const { id, cid } = req.params;

  try {
    const teacher = await Teacher.findOne({ _id: id });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    return res.status(200).json({
      message: "Attendance fetched successfully",
      data: classRecent.recentAttendance,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.getSpecificAttendance = async (req, res) => {
  const { id, cid, attId } = req.params;

  try {
    const teacher = await Teacher.findOne({ _id: id }).populate({
      path: "classes",
      match: { _id: cid },
      select: "recentAttendance",
      populate: {
        path: "recentAttendance.students.studentId",
        model: "Student",
        select: "name srn email phone department",
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.find((r) =>
      r._id.equals(attId)
    );

    if (!recentAttendance) {
      return res.status(404).json({ error: "Attendance not found" });
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
    return res.status(500).json({ error: "Internal Server error" });
  }
};

exports.deleteAttendance = async (req, res) => {
  const { id, cid, attId } = req.params;
  try {
    const teacher = await Teacher.findOne({ _id: id }).populate({
      path: "classes",
      match: { _id: cid },
      select: "recentAttendance",
      populate: {
        path: "recentAttendance.students.studentId",
        model: "Student",
        select: "name srn email phone department scannedQr",
      },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    const classRecent = teacher.classes.find((c) => c._id.equals(cid));

    if (!classRecent) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classRecent < 0) {
      return res.status(404).json({ error: "Class not found" });
    }

    const recentAttendance = classRecent.recentAttendance.find((r) =>
      r._id.equals(attId)
    );

    if (!recentAttendance) {
      return res.status(404).json({ error: "Attendance not found" });
    }

    const attendanceIndex = classRecent.recentAttendance.findIndex((r) =>
      r._id.equals(attId)
    );

    //remove attendance from students
    const students = recentAttendance.students;
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const studentIndex = student.studentId.scannedQr.findIndex((a) =>
        a._id.equals(attId)
      );

      student.studentId.scannedQr.splice(studentIndex, 1);
      await student.studentId.save();
    }

    classRecent.recentAttendance.splice(attendanceIndex, 1);

    await teacher.save();

    return res.status(200).json({
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server error" });
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

//Teacher Authenticated

exports.TeacherAuthenticate = async (req, res) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "No token found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Teacher.findById(decoded.id);

    if (!admin) {
      return res.status(404).json({
        error: "Admin not found",
      });
    }

    res.status(200).json({
      message: "Admin authenticated successfully",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};
