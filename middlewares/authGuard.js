const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const jwtSecret = process.env.JWT_SECRET;

const authGuard = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {

    return res.status(401).json({ errorMessage: "Token não fornecido" });
  }
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ errorMessage: "Usuário não encontrado" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ errorMessage: "Token expirado" });
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { authGuard, verifyToken };
