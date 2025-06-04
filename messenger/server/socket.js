// server/socket.js

const { Message } = require('./config/db'); // Message 모델 가져오기
// const { addEventToCalendar } = require('./services/calendarService'); // AI 시스템 연동 예시 (추후 구현)

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`새로운 소켓 연결: ${socket.id}`);

    // 클라이언트가 방에 참여할 때
    socket.on('join_room', async (roomName) => {
      socket.join(roomName);
      console.log(`${socket.id}가 방 "${roomName}"에 참여했습니다.`);
      io.to(roomName).emit('chat_message', `[SERVER] ${socket.id} 님이 "${roomName}" 방에 입장했습니다.`);

      // 방 참여 시 이전 메시지 불러오기
      try {
        const messages = await Message.find({ room: roomName })
                                     .sort({ timestamp: 1 }) // 시간순 정렬
                                     .limit(50); // 최근 50개 메시지만 불러오기
            
        console.log(messages);
        socket.emit('initial_messages', messages.map(msg => `[${msg.room}] ${msg.senderId}: ${msg.text}`)); // 클라이언트에 전송
      } catch (error) {
        console.error(`이전 메시지 불러오기 오류 (방: ${roomName}):`, error);
      }
    });

    // 클라이언트로부터 메시지를 받을 때
    socket.on('chat_message', async (msg) => {
      const { room, text } = msg;
      // TODO: 실제 앱에서는 socket.id 대신 JWT를 통해 인증된 senderId를 사용해야 합니다.
      const senderId = socket.id; // 임시로 소켓 ID 사용

      console.log(`메시지 수신 (${senderId}): [${room}] ${text}`);

      try {
        // MongoDB에 메시지 저장
        const newMessage = new Message({
          room,
          senderId,
          text
        });
        await newMessage.save(); // DB에 저장

        // 해당 방에 있는 모든 클라이언트에게 메시지 전송
        io.to(room).emit('chat_message', `[${room}] ${senderId}: ${text}`);

        // TODO: AI 시스템 연동
        // if (text.includes('약속') || text.includes('일정')) {
        //   await addEventToCalendar(senderId, { text, room, timestamp: newMessage.timestamp });
        // }

      } catch (error) {
        console.error('메시지 저장 또는 전송 오류:', error);
        // 클라이언트에게 에러 알림 (선택 사항)
        socket.emit('chat_error', '메시지 전송에 실패했습니다.');
      }
    });

    // 클라이언트 연결이 끊겼을 때
    socket.on('disconnect', () => {
      console.log(`소켓 연결 해제: ${socket.id}`);
    });

    // 추가적인 소켓 이벤트 핸들러
  });
};