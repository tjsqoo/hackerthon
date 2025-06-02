// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const path = require('path');

const app = express();
const server = http.createServer(app);

// --- Redis 클라이언트 설정 ---
// 개발 환경에서는 한 개의 Redis 서버를 사용하지만,
// 프로덕션 환경에서는 마스터-슬레이브 또는 클러스터 구성이 필요합니다.
// 여기서는 단일 Redis 인스턴스를 가정합니다.
const pubClient = createClient({ url: 'redis://localhost:6379' }); // 발행자 클라이언트
const subClient = pubClient.duplicate(); // 구독자 클라이언트는 발행자 클라이언트를 복제 (Socket.IO Redis 어댑터 요구사항)

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    console.log('Redis 클라이언트가 성공적으로 연결되었습니다.');

    // --- Socket.IO 서버 설정 ---
    const io = new Server(server, {
      cors: {
        origin: "*", // 모든 Origin 허용 (개발용, 실제 서비스에서는 특정 Origin만 허용 권장)
        methods: ["GET", "POST"]
      }
    });

    // Socket.IO Redis 어댑터 사용
    // 여러 Node.js 서버 인스턴스가 Redis를 통해 메시지를 공유할 수 있도록 합니다.
    io.adapter(createAdapter(pubClient, subClient));

    // --- 정적 파일 서비스 (클라이언트 UI) ---
    app.use(express.static(path.join(__dirname, 'public')));

    // --- Socket.IO 연결 이벤트 핸들러 ---
    io.on('connection', (socket) => {
      console.log(`새로운 소켓 연결: ${socket.id}`);

      // 'join_room' 이벤트: 클라이언트가 특정 방에 참여할 때
      socket.on('join_room', (roomName) => {
        socket.join(roomName);
        console.log(`${socket.id}가 방 "${roomName}"에 참여했습니다.`);
        // 방 참여 알림 메시지 (선택 사항)
        io.to(roomName).emit('chat_message', `[SERVER] ${socket.id} 님이 "${roomName}" 방에 입장했습니다.`);
      });

      // 'chat_message' 이벤트: 클라이언트로부터 메시지를 받을 때
      socket.on('chat_message', (msg) => {
        console.log(`메시지 수신 (${socket.id}): ${msg.room} - ${msg.text}`);
        // 해당 방에 있는 모든 클라이언트에게 메시지 전송
        io.to(msg.room).emit('chat_message', `[${msg.room}] ${socket.id}: ${msg.text}`);
      });

      // 'disconnect' 이벤트: 클라이언트 연결이 끊겼을 때
      socket.on('disconnect', () => {
        console.log(`소켓 연결 해제: ${socket.id}`);
        // 클라이언트가 떠났을 때 모든 방에서 나감 (Socket.IO가 자동으로 처리)
      });

      // 추가적인 소켓 이벤트 핸들러를 여기에 추가할 수 있습니다.
      // 예: 'typing', 'read_receipt', 'file_upload' 등
    });

    // --- 서버 시작 ---
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`채팅 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
      console.log('Redis 세션 클러스터링이 활성화되었습니다.');
    });

  })
  .catch((err) => {
    console.error('Redis 연결에 실패했습니다:', err);
    process.exit(1); // Redis 연결 실패 시 서버 종료
  });