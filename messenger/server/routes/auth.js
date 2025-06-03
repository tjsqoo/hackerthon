// server/routes/auth.js

const express = require('express');
const router = express.Router();
// const authService = require('../services/authService'); // 인증 관련 비즈니스 로직 모듈

/**
 * @route POST /api/auth/register
 * @desc 새 사용자 등록
 */
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // TODO: authService.registerUser({ username, email, password });
    // 실제 사용자 등록 로직 (DB 저장, 비밀번호 해싱 등)
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Failed to register user.' });
  }
});

/**
 * @route POST /api/auth/login
 * @desc 사용자 로그인 및 JWT 토큰 발급
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // TODO: const token = await authService.loginUser(email, password);
    // 실제 로그인 로직 (비밀번호 검증, JWT 생성 등)
    const token = 'your_generated_jwt_token'; // 예시 JWT
    res.status(200).json({ message: 'Login successful', token: token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: 'Invalid credentials.' });
  }
});

// TODO: 다른 인증 관련 라우트 (예: 비밀번호 재설정, 토큰 갱신 등)

module.exports = router;