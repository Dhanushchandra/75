exports.verifyAdmin = async (req, res, next) => {
  if (req.id !== req.params.id || req.role !== "admin") {
    return res.status(401).send({
      auth: false,
      error: "You are not authorized to access this data.",
    });
  }
  next();
};

exports.verifyStudent = async (req, res, next) => {
  if (req.id !== req.params.id || req.role !== "student") {
    return res.status(401).send({
      auth: false,
      error: "You are not authorized to access this data.",
    });
  }
  next();
};

exports.verifyTeacher = async (req, res, next) => {
  if (req.id !== req.params.id || req.role !== "teacher") {
    return res.status(401).send({
      auth: false,
      error: "You are not authorized to access this data.",
    });
  }
  next();
};
