require("dotenv").config();
const express = require("express");
const http = require("http");
const ws = require("ws");

const app = express();
const bodyParser = require("body-parser");

const server = http.createServer(app);

//web socket
const wss = new ws.Server({ server, path: "/api/teacher/generate-qr" });

exports.socketModule = { wss };

const DBconnection = require("./config/DBconnection");

const generalRoute = require("./routes/generalRoute");
const adminRoute = require("./routes/adminRoute");
const studentRoute = require("./routes/studentRoute");
const teacherRoute = require("./routes/teacherRoute");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
