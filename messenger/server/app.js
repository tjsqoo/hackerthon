// server/app.js

const express = require('express');
const path = require('path');
const cors = require('cors'); // CORS 미들웨어 추가

const app = express();

// --- 미들웨어 설정 ---
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱
app.use(cors({
  origin: 'http://localhost:3000', // Next.js 클라이언트 Origin
  credentials: true // 쿠키 등 자격 증명 허용
}));

// 정적 파일 서비스 (선택 사항, Next.js 클라이언트가 주가 됨)
app.use(express.static(path.join(__dirname, 'public')));

// --- 라우트 연결 ---
// 각 기능별 라우터 모듈을 가져와 연결
// const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users');
// const messageRoutes = require('./routes/messages');
// const calendarRoutes = require('./routes/calendar');

// app.use('/api/auth', authRoutes); // /api/auth/login, /api/auth/register 등
// app.use('/api/users', userRoutes); // /api/users/profile, /api/users/{id} 등
// app.use('/api/messages', messageRoutes); // /api/messages/history, /api/messages/send (비실시간) 등
// app.use('/api/calendar', calendarRoutes); // /api/calendar/events, /api/calendar/add-event 등

// 기본 라우트 (선택 사항)
app.get('/', (req, res) => {
  res.send('Messenger Server API is running!');
});

// 404 에러 핸들링 (모든 라우트 뒤에 배치)
app.use((req, res, next) => {
  res.status(404).send('Not Found');
});

// 에러 핸들링 미들웨어 (선택 사항, 개발 시 유용)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


module.exports = app;