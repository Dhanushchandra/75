const { v4: uuidv4 } = require("uuid");
const { socketModule } = require("../../app.js");
const Teacher = require("../../models/teacherSchema.js");

exports.WebSockerGenerateQRCode = async (id, cid, req, res) => {
  try {
    const { qrCodeWss } = socketModule;
    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(400).json({
        message: "Invalid teacher",
      });
    }

    const classObj = teacher.classes.find((c) => c._id.toString() === cid);

    if (!classObj) {
      return res.status(400).json({
        message: "Invalid class",
      });
    }

    res.status(200).json({
      message: "Qr generation starts!",
    });

    function generateQR(ws) {
      const QrCode = uuidv4();

      qrCodeWss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(QrCode);
          classObj.tempQR.push({
            qr: QrCode,
            time: Date.now(),
          });

          teacher.save();
        }
      });
    }

    let intervalId = null;

    qrCodeWss.on("connection", async (ws, req) => {
      classObj.recentAttendance.push({
        date: Date.now(),
        students: [],
      });

      await teacher.save();

      intervalId = setInterval(() => {
        generateQR(ws);
      }, 1000);
      ws.on("close", async () => {
        clearInterval(intervalId);
        classObj.tempQR = [];
        await teacher.save();
      });
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.WebSockerAttendance = async (id, cid, req, res) => {
  try {
    const { attendanceWss } = socketModule;
    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(400).json({
        message: "Invalid teacher",
      });
    }

    const classObj = teacher.classes.find((c) => c._id.toString() === cid);

    if (!classObj) {
      return res.status(400).json({
        message: "Invalid class",
      });
    }

    // Define a function to poll for changes to the teacher document
    let prevLength = 0;
    const pollTeacherChanges = async (ws) => {
      const teacher = await Teacher.findById(id);
      const classRecent = teacher.classes.find((c) => c._id.toString() === cid);
      const recentAttendance = classRecent.recentAttendance.slice(-1)[0];
      if (!recentAttendance) return;
      else {
        const currentLength = recentAttendance.students.length;

        if (prevLength !== currentLength) {
          attendanceWss.clients.forEach((client) => {
            if (client.readyState === ws.OPEN) {
              client.send(JSON.stringify(recentAttendance.students));
            }
          });
        }

        prevLength = currentLength;
      }
    };

    attendanceWss.on("connection", (ws, req) => {
      ws.send("connected");
      const pollInterval = setInterval(() => pollTeacherChanges(ws), 2000);

      ws.on("close", () => {
        clearInterval(pollInterval);
      });
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
