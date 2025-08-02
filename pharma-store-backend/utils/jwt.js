const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');


const signToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN} 
  );
};


const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
};

// 3. Send token back to client
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id, user.role);

  // Optional: prevent password leak
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    }
  });
};

module.exports = {
  signToken,
  verifyToken,
  createSendToken
};
