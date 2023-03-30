const { v4: uuidv4 } = require("uuid");
const { socketModule } = require("../../app.js");
const Teacher = require("../../models/teacherSchema.js");

exports.WebSockerGenerateQRCode = async (id, cid, req, res) => {
  try {
    const { wss } = socketModule;
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

      wss.clients.forEach((client) => {
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

    wss.on("connection", (ws, req) => {
      classObj.recentAttendance.push({
        date: Date.now(),
        students: [],
      });

      teacher.save();

      intervalId = setInterval(() => {
        generateQR(ws);
      }, 1000);
      ws.on("close", () => {
        clearInterval(intervalId);
        classObj.tempQR = [];
        teacher.save();
      });
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
