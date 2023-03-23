require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const DBconnection = require("./config/DBconnection");
const adminRoute = require("./routes/adminRoute");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/admin", adminRoute);

//DB connection;
DBconnection();

app.listen(process.env.PORT, () =>
  console.log(`Server is running on port ${process.env.PORT}`)
);
