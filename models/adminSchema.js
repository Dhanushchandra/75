const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "teacher", "admin"],
    default: "admin",
  },
  organization: {
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
  teachers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
  ],
  isLocationVerification: {
    type: Boolean,
    default: false,
  },
  isIpVerification: {
    type: Boolean,
    default: false,
  },
  location: {
    actualCredential: {
      lat: {
        type: Number,
        default: null,
      },
      long: {
        type: Number,
        default: null,
      },
    },
    leftTopCredential: {
      lat: {
        type: Number,
        default: null,
      },
      long: {
        type: Number,
        default: null,
      },
    },
    rightBottomCredential: {
      lat: {
        type: Number,
        default: null,
      },
      long: {
        type: Number,
        default: null,
      },
    },
  },
  ipAddress: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("Admin", adminSchema);
