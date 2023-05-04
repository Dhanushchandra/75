const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).send({ auth: false, error: "No token provided." });
  }

  const [scheme, tokenValue] = token.split(" ");
  if (scheme !== "Bearer") {
    return res
      .status(401)
      .send({ auth: false, error: "Invalid token format." });
  }

  jwt.verify(tokenValue, process.env.JWT_SECRET, function (err, decoded) {
    if (err) {
      return res
        .status(500)
        .send({ auth: false, error: "Failed to authenticate token.", err });
    }

    // save decoded token to request object
    req.id = decoded.id;
    req.role = decoded.role;
    next();
  });
}

module.exports = { verifyToken };
