const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    university: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    srn: {
      type: String,
      required: true,
    },
    emailToken: {
      type: String,
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    classes: [
      {
        className: String,
        classId: String,
        teacherId: String,
        date: Date,
      },
    ],
    scannedQr: [
      {
        attendanceId: String,
        className: String,
        classId: String,
        date: Date,
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Student", studentSchema);
