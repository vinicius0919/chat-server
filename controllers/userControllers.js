const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generatePasswordHash, verifyPassword } = require('../functions/passwordHash');

const registerUser = async (username, password) => {
    if (!username || !password) {
        throw new Error("Usuário e senha são obrigatórios");
    }
    const passwordHash = await generatePasswordHash(password);
    const user = new User({ username, passwordHash });
    return await user.save();
}

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
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { token, userId: user._id };
}

module.exports = {
    registerUser,
    loginUser
}