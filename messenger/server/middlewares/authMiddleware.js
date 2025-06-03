// server/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken'); // jwt 라이브러리 설치 필요 (npm install jsonwebtoken)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key'; // 실제 서비스에서는 환경 변수로 관리

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token not provided or malformed.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // 요청 객체에 사용자 정보 주입
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;