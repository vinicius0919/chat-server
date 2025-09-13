const User = require('../models/User');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

const authGuard = async (req, res, next) => {
    console.log('Authenticating request...');
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
                console.log('No token provided');

        return res.status(401).json({ errorMessage: 'Token não fornecido' });
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        console.log(token, decoded);
        const user = await User.findById(decoded.userId).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ errorMessage: 'Usuário não encontrado' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ errorMessage: 'Token expirado' });
    }
}

module.exports = authGuard;
