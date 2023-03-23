const Joi = require("joi");

const adminSchemaValidation = Joi.object({
  username: Joi.string().required().min(3),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().valid("student", "teacher", "admin").default("admin"),
  organization: Joi.string().required(),
  emailToken: Joi.string().allow(null),
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

module.exports = { adminSchemaValidation };
