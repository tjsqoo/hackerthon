// client/pages/index.js

import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import Head from 'next/head';
import styles from '../styles/Home.module.css'; // Next.js 기본 스타일 파일 활용

// Next.js에서 SSR을 위해 getInitialProps 또는 getServerSideProps를 사용할 수 있습니다.
// 여기서는 SSR로 초기 데이터 로딩이 필요하지 않으므로 클라이언트 측에서 소켓 연결을 처리합니다.
// 만약 '초기 채팅 내역' 등을 SSR로 가져와야 한다면, 이 함수를 사용합니다.
/*
export async function getServerSideProps(context) {
  // 예시: 초기 채팅 내역을 API 서버에서 가져온다고 가정
  // const initialMessages = await fetch('http://your-api-server/messages').then(res => res.json());
  return {
    props: {
      // initialMessages,
      socketServerUrl: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL // 환경 변수 접근
    },
  };
}
*/

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [roomInput, setRoomInput] = useState('general');
  const [currentRoom, setCurrentRoom] = useState('');
  const chatContainerRef = useRef(null);

  // 컴포넌트 마운트 시 소켓 연결 및 이벤트 핸들러 설정
  useEffect(() => {
    // 이미 소켓이 연결되어 있다면 새로 연결하지 않음
    if (socket) return;

    // 환경 변수에서 소켓 서버 URL 가져오기
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';
    console.log('Connecting to Socket.IO server:', socketServerUrl);

    // Socket.IO 클라이언트 인스턴스 생성
    const newSocket = io(socketServerUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('서버에 연결되었습니다:', newSocket.id);
      addMessageToChat(`[SERVER] 서버에 연결되었습니다.`);
    });

    newSocket.on('chat_message', (msg) => {
      console.log('메시지 수신:', msg);
      addMessageToChat(msg);
    });

    // 초기 메시지 수신 (방 참여 시)
    newSocket.on('initial_messages', (initialMsgs) => {
      console.log('초기 메시지 수신:', initialMsgs);
      setMessages(initialMsgs); // 기존 메시지를 초기 메시지로 교체
      // 스크롤을 최하단으로 이동 (initial_messages 로드 후)
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 0);
    });

    newSocket.on('disconnect', () => {
      console.log('서버와의 연결이 끊어졌습니다.');
      addMessageToChat('[SERVER] 서버와의 연결이 끊어졌습니다.');
    });

    newSocket.on('connect_error', (err) => {
      console.error('연결 오류:', err.message);
      addMessageToChat(`[SERVER] 연결 오류 발생: ${err.message}`);
    });

    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      if (newSocket.connected) {
        newSocket.disconnect();
        console.log('소켓 연결이 해제되었습니다.');
      }
    };
  }, []); // 빈 배열: 컴포넌트가 처음 마운트될 때만 실행

  // 채팅 메시지 추가 및 스크롤 최하단으로 이동
  const addMessageToChat = (msg) => {
    setMessages((prevMessages) => [...prevMessages, msg]);
    // 다음 렌더링 사이클에 스크롤 적용
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 0);
  };

  const handleJoinRoom = () => {
    if (socket && roomInput.trim() !== '') {
      // 이전에 참여했던 방이 있다면 나가지 않고 단순히 새로운 방에 join
      // 실제 앱에서는 방 이동 시 이전 방에서 leave_room 이벤트를 보내는 로직 추가 필요
      socket.emit('join_room', roomInput.trim());
      setCurrentRoom(roomInput.trim());
      addMessageToChat(`[SERVER] 방 "${roomInput.trim()}"에 참여를 시도합니다.`);
    }
  };

  const handleSendMessage = () => {
    if (socket && messageInput.trim() !== '' && currentRoom !== '') {
      socket.emit('chat_message', { room: currentRoom, text: messageInput.trim() });
      setMessageInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Next.js 채팅 클라이언트</title>
        <meta name="description" content="Next.js Socket.IO 채팅" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Next.js 채팅</h1>

        <div className={styles.description}>
          <input
            type="text"
            placeholder="방 이름"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            className={styles.input}
          />
          <button onClick={handleJoinRoom} className={styles.button}>
            방 참여
          </button>
        </div>

        <div ref={chatContainerRef} className={styles.chatContainer}>
          {messages.map((msg, index) => (
            <p key={index} className={styles.message}>
              {msg}
            </p>
          ))}
        </div>

        <div className={styles.inputArea}>
          <input
            type="text"
            placeholder="메시지 입력..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!currentRoom}
            className={styles.input}
          />
          <button onClick={handleSendMessage} disabled={!currentRoom} className={styles.button}>
            보내기
          </button>
        </div>
      </main>
    </div>
  );
}