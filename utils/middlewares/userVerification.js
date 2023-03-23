exports.verifyAdmin = async (req, res, next) => {
  if (req.id !== req.params.id && req.role !== "admin") {
    return res.status(401).send({
      auth: false,
      message: "You are not authorized to access this data.",
    });
  }
  next();
};
