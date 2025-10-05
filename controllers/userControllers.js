const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  generatePasswordHash,
  verifyPassword,
} = require("../functions/passwordHash");

const refreshTokens= [];

const registerUser = async (username, password) => {
  if (!username || !password) {
    throw new Error("Usuário e senha são obrigatórios");
  }
  const passwordHash = await generatePasswordHash(password);
  const user = new User({ username, passwordHash });
  return await user.save();
};

const loginUser = async (username, password) => {
  if (!username || !password) {
    throw new Error("Usuário e senha são obrigatórios");
  }
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error("Usuário não encontrado");
  }
  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Senha inválida");
  }
  const accessToken = jwt.sign(
    { id: user.id, username: user.username },
    process.env.ACCESS_SECRET,
    { expiresIn: "20s" }
  );
  const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });
  refreshTokens.push(refreshToken);
  return {accessToken, refreshToken, userId: user._id, profileImage: user.profileImage };
};

const updateUser = async (id, updates) => {
  if (!id || !updates) {
    throw new Error("ID do usuário e atualizações são obrigatórios");
  }
  console.log("Atualizando usuário:", id, updates);
  const user = await User.findById(id).select("-passwordHash");
  if (!user) {
    throw new Error("Usuário não encontrado");
  }
  user.set(updates);
  const updatedUser = await user.save();
  return updatedUser;
};

// verify if refresh token is in the array

const refreshTokenExists = (token) => {
  return refreshTokens.includes(token);
}

const logoutUser = (refreshToken) => {
  refreshTokens = refreshTokens.filter(t => t !== refreshToken);
};



module.exports = {
  registerUser,
  loginUser,
  updateUser,
  logoutUser,
  refreshTokenExists
};
