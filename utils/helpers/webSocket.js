const { v4: uuidv4 } = require("uuid");
const { socketModule } = require("../../app.js");
const Teacher = require("../../models/teacherSchema.js");
const Student = require("../../models/studentSchema.js");

function attendance_Polling_WS() {
  const { attendanceWss } = socketModule;

  attendanceWss.on("connection", (ws) => {
    ws.on("message", async (message) => {
      try {
        const { id, cid } = JSON.parse(message);

        const teacher = await Teacher.findById(id);

        if (!teacher) {
          ws.send(JSON.stringify({ error: "Invalid teacher", status: 400 }));
          ws.close(400, "Invalid teacher");
          return;
        }

        const classObj = teacher.classes.find((c) => c._id.toString() === cid);

        if (!classObj) {
          ws.send(JSON.stringify({ error: "Invalid class", status: 400 }));
          ws.close(400, "Invalid class");
          return;
        }

        // Define a function to poll for changes to the teacher document
        let prevLength = 0;
        const pollTeacherChanges = async (ws) => {
          const teacher = await Teacher.findById(id);
          const classRecent = teacher.classes.find(
            (c) => c._id.toString() === cid
          );
          const recentAttendance = classRecent.recentAttendance.slice(-1)[0];
          if (!recentAttendance) return;
          else {
            const students = await Promise.all(
              recentAttendance.students.map(async (student) => {
                const studentObj = await Student.findById(student.studentId);
                return {
                  studentId: studentObj._id,
                  name: studentObj.name,
                  srn: studentObj.srn,
                };
              })
            );

            if (prevLength !== students.length) {
              attendanceWss.clients.forEach((client) => {
                if (client.readyState === ws.OPEN) {
                  client.send(JSON.stringify(students));
                }
              });
            }

            prevLength = students.length;
          }
        };

        const pollInterval = setInterval(() => pollTeacherChanges(ws), 2000);

        ws.on("close", () => {
          clearInterval(pollInterval);
        });
      } catch (err) {
        ws.send(JSON.stringify({ error: "Invalid data", status: 400 }));
        ws.close(400, "Invalid data");
        return;
      }
    });
  });
}

function generateQR_WS() {
  const { qrCodeWss } = socketModule;

  let intervalId = null;

  // Declare a flag to track if save is currently in progress
  let isSaving = false;

  // Declare a queue to store pending save operations
  const saveQueue = [];

  qrCodeWss.on("connection", (ws, req) => {
    ws.send("connected");

    ws.on("message", async (message) => {
      try {
        const { id, cid } = JSON.parse(message);

        const teacher = await Teacher.findById(id);

        if (!teacher) {
          ws.send(JSON.stringify({ error: "Invalid teacher", status: 400 }));
          ws.close(400, "Invalid teacher");
          return;
        }

        const classObj = teacher.classes.find((c) => c._id.toString() === cid);

        if (!classObj) {
          ws.send(JSON.stringify({ error: "Invalid class", status: 400 }));
          ws.close(400, "Invalid class");
          return;
        }

        classObj.recentAttendance.push({
          date: Date.now(),
          students: [],
        });

        await teacher.save();

        async function generateQR(ws) {
          if (isSaving) {
            saveQueue.push(ws); // If save is already in progress, add ws to the queue
            return;
          }

          isSaving = true; // Set the flag to indicate that save is in progress

          try {
            qrCodeWss.clients.forEach((client) => {
              if (client.readyState === ws.OPEN) {
                const QrCode = uuidv4();
                client.send(QrCode);
                classObj.tempQR.push({
                  qr: QrCode,
                  time: Date.now(),
                });
              }
            });

            await teacher.save();

            // Call save() for any pending items in the queue
            if (saveQueue.length > 0) {
              await Promise.all(
                saveQueue.map((ws) => ws.send("Qr generation starts!"))
              );
              saveQueue.length = 0;
            }
          } catch (error) {
            // Handle save error
          } finally {
            isSaving = false; // Reset the flag after save is completed
          }
        }

        ws.send("Qr generation starts!");

        intervalId = setInterval(() => {
          generateQR(ws);
        }, 1000);

        ws.on("close", async () => {
          clearInterval(intervalId);
          classObj.tempQR = [];
          await teacher.save();
          isSaving = false; // Reset the flag after WebSocket connection is closed
        });
      } catch (error) {
        ws.send(JSON.stringify({ error: "Invalid data", status: 400 }));
        ws.close(400, "Invalid data");
        return;
      }
    });
  });
}

generateQR_WS();
attendance_Polling_WS();
