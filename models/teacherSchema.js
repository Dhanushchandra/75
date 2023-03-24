const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
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
  trn: {
    type: String,
    required: true,
  },
  organization: {
    type: String,
    required: true,
  },
  department: {
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
    default: "teacher",
  },
  classes: [
    {
      name: {
        type: String,
        required: true,
      },
      students: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
      ],
      tempQR: [
        {
          qr: String,
          time: Date,
        },
      ],
      recentAttendance: [
        {
          date: Date,
          students: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Student",
            },
          ],
        },
      ],
    },
  ],
});

module.exports = mongoose.model("Teacher", teacherSchema);
