// server/config/db.js

const mongoose = require('mongoose');

// MongoDB 연결 함수
const connectDB = async () => {
    console.log('MongoDB connect');
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/messenger_chat';
    await mongoose.connect(mongoUri, {
      // useNewUrlParser: true, // Deprecated in Mongoose 6.0+
      // useUnifiedTopology: true, // Deprecated in Mongoose 6.0+
    });
    console.log('MongoDB에 성공적으로 연결되었습니다.');
  } catch (error) {
    console.error('MongoDB 연결 오류:', error.message);
    process.exit(1); // 연결 실패 시 프로세스 종료
  }
};

// --- 메시지 스키마 정의 ---
const MessageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    index: true // 방별 조회 효율을 위해 인덱스 추가
  },
  senderId: { // 소켓 ID 대신 실제 사용자 ID (향후 JWT와 연동 시)
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // 시간순 조회 효율을 위해 인덱스 추가
  },
  // 향후 확장 가능 필드 (예: type: 'text', 'image', 'file', 'system' 등)
  // type: {
  //   type: String,
  //   enum: ['text', 'image', 'file', 'system'],
  //   default: 'text'
  // },
  // imageUrl: String,
  // fileUrl: String,
  // fileName: String
});

// 메시지 모델 생성
const Message = mongoose.model('Message', MessageSchema);

module.exports = {
  connectDB,
  Message
};