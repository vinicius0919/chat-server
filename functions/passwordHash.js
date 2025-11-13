const bcrypt = require("bcrypt");
const generatePasswordHash = async (password) => {
  const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10;
  return await bcrypt.hash(password, saltRounds);
};
const verifyPassword = async (password, hash) => {
  console.log("Verifying password:", password, hash);
  return await bcrypt.compare(password, hash);
};

module.exports = {
  generatePasswordHash,
  verifyPassword
};
