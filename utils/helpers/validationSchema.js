const Joi = require("joi");

const adminSchemaValidation = Joi.object({
  username: Joi.string().required().min(3),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().valid("student", "teacher", "admin").default("admin"),
  organization: Joi.string().required(),
  emailToken: Joi.string().allow(null),
  verified: Joi.boolean().default(false),
  teachers: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
  isLocationVerification: Joi.boolean().default(false),
  isIpVerification: Joi.boolean().default(false),
  location: Joi.object({
    actualCredential: Joi.object({
      lat: Joi.number().default(null),
      long: Joi.number().default(null),
    }),
    leftTopCredential: Joi.object({
      lat: Joi.number().default(null),
      long: Joi.number().default(null),
    }),
    rightBottomCredential: Joi.object({
      lat: Joi.number().default(null),
      long: Joi.number().default(null),
    }),
  }),
  ip: Joi.string().allow(null),
});

const teacherSchemaValidation = Joi.object({
  name: Joi.string().required().min(3),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  phone: Joi.number().required(),
  trn: Joi.string().required(),
  organization: Joi.string().required(),
  department: Joi.string().required(),
  emailToken: Joi.string().allow(null),
  verified: Joi.boolean().default(false),
  role: Joi.string().valid("student", "teacher", "admin").default("teacher"),
  classes: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      students: Joi.array()
        .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
        .required(),
      tempQR: Joi.array().items(
        Joi.object({
          qr: Joi.string().required(),
          time: Joi.date().required(),
        })
      ),
      recentAttendance: Joi.array().items(
        Joi.object({
          date: Joi.date().required(),
          students: Joi.array()
            .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
            .required(),
        })
      ),
    })
  ),
});

const teacherUpdateSchemaValidation = Joi.object({
  name: Joi.string().min(3),
  email: Joi.string().email(),
  password: Joi.string(),
  phone: Joi.number(),
  trn: Joi.string(),
  organization: Joi.string(),
  department: Joi.string(),
  emailToken: Joi.string().allow(null),
  role: Joi.string().valid("student", "teacher", "admin").default("teacher"),
});

module.exports = {
  adminSchemaValidation,
  teacherSchemaValidation,
  teacherUpdateSchemaValidation,
};
