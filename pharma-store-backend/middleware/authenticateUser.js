const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errorHandler');

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('You are not logged in!', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

module.exports = authenticateUser;
