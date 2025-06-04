// server/routes/messages.js

const express = require('express');
const router = express.Router();
const { Message } = require('../config/db'); // Message 모델 가져오기
// const authMiddleware = require('../middlewares/authMiddleware'); // 인증 미들웨어 (필요 시)

/**
 * @route GET /api/messages/:roomName
 * @desc 특정 방의 메시지 기록 조회
 * @access Public (or Private with authMiddleware)
 */
router.get('/:roomName', async (req, res) => {
  const roomName = req.params.roomName;
  const limit = parseInt(req.query.limit) || 50; // 기본 50개
  const skip = parseInt(req.query.skip) || 0; // 페이지네이션

  try {
    const messages = await Message.find({ room: roomName })
                                 .sort({ timestamp: 1 }) // 시간순 정렬
                                 .skip(skip)
                                 .limit(limit);
    res.status(200).json(messages);
  } catch (error) {
    console.error(`방 ${roomName} 메시지 조회 오류:`, error);
    res.status(500).json({ message: 'Failed to retrieve messages.' });
  }
});

module.exports = router;