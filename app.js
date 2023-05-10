require("dotenv").config();
const express = require("express");
const http = require("http");
const ws = require("ws");
const url = require("url");
const cors = require("cors");

const app = express();

const bodyParser = require("body-parser");

const server = http.createServer(app);

//web socket
const qrCodeWss = new ws.Server({
  noServer: true,
  path: "/teacher/generate-qr",
});
const attendanceWss = new ws.Server({
  noServer: true,
  path: "/teacher/attendance",
});

server.on("upgrade", (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;

  if (pathname === "/teacher/generate-qr") {
    qrCodeWss.handleUpgrade(request, socket, head, (ws) => {
      qrCodeWss.emit("connection", ws, request);
    });
  } else if (pathname === "/teacher/attendance") {
    attendanceWss.handleUpgrade(request, socket, head, (ws) => {
      attendanceWss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

exports.socketModule = { qrCodeWss, attendanceWss };

const DBconnection = require("./config/DBconnection");

const generalRoute = require("./routes/generalRoute");
const adminRoute = require("./routes/adminRoute");
const studentRoute = require("./routes/studentRoute");
const teacherRoute = require("./routes/teacherRoute");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

//Routes
app.use("/api/admin", adminRoute);
app.use("/api/student", studentRoute);
app.use("/api/teacher", teacherRoute);
app.use("/", generalRoute);

//DB connection;
DBconnection();

server.listen(process.env.PORT, () =>
  console.log(`Server is running on port ${process.env.PORT}`)
);
