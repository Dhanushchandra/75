const jsonwebtoken = require("jsonwebtoken");

async function generateToken(payload) {
  const token = jsonwebtoken.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "999d",
  });
  return token;
}

module.exports = { generateToken };
