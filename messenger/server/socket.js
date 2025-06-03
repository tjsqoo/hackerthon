// server/socket.js

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`새로운 소켓 연결: ${socket.id}`);

    // 'join_room' 이벤트: 클라이언트가 특정 방에 참여할 때
    socket.on('join_room', (roomName) => {
      // 클라이언트가 이미 참여한 방이 있다면 나가는 로직 추가 (선택 사항)
      // Object.keys(socket.rooms).filter(room => room !== socket.id).forEach(room => socket.leave(room));
      socket.join(roomName);
      console.log(`${socket.id}가 방 "${roomName}"에 참여했습니다.`);
      io.to(roomName).emit('chat_message', `[SERVER] ${socket.id} 님이 "${roomName}" 방에 입장했습니다.`);
    });

    // 'chat_message' 이벤트: 클라이언트로부터 메시지를 받을 때
    socket.on('chat_message', (msg) => {
      // msg 객체에 room, text, senderId 등이 포함될 것임
      console.log(`메시지 수신 (${socket.id}): [${msg.room}] ${msg.text}`);
      // 해당 방에 있는 모든 클라이언트에게 메시지 전송
      io.to(msg.room).emit('chat_message', `[${msg.room}] ${socket.id}: ${msg.text}`);

      // TODO: AI 시스템 연동 (메시지 분석 및 캘린더 연동) 로직 호출
      // 예: aiService.processMessage(msg.text, socket.id);
    });

    // 'disconnect' 이벤트: 클라이언트 연결이 끊겼을 때
    socket.on('disconnect', () => {
      console.log(`소켓 연결 해제: ${socket.id}`);
      // 모든 방에서 자동으로 나감
    });

    // 추가적인 소켓 이벤트 핸들러를 여기에 추가할 수 있습니다.
  });
};