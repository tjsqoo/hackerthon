// server/index.js

const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const app = require('./app'); // Express 앱을 모듈로 가져옴
const configureSocketIO = require('./socket'); // Socket.IO 설정 모듈

const PORT = process.env.PORT || 4000; // Next.js와 포트 충돌 방지

const server = http.createServer(app); // Express 앱을 HTTP 서버에 연결

// --- Redis 클라이언트 설정 및 연결 ---
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    console.log('Redis 클라이언트가 성공적으로 연결되었습니다.');

    // --- Socket.IO 설정 및 Redis 어댑터 연결 ---
    const io = new Server(server, {
      cors: {
        origin: "*", // Next.js 클라이언트 Origin
        methods: ["GET", "POST"]
      }
    });
    io.adapter(createAdapter(pubClient, subClient));

    // Socket.IO 이벤트 핸들러를 별도 모듈로 분리
    configureSocketIO(io);

    // --- 서버 시작 ---
    server.listen(PORT, () => {
      console.log(`Express & Socket.IO 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
      console.log('Redis 세션 클러스터링이 활성화되었습니다.');
    });

  })
  .catch((err) => {
    console.error('Redis 연결에 실패했습니다:', err);
    process.exit(1);
  });