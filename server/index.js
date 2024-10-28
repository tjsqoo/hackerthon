import express from 'express';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import pg from 'pg'
const { Client } = pg

import { createRequire } from 'module';

// 추후 require가 필요한 경우 사용
const require = createRequire(import.meta.url);

// Express 애플리케이션 생성
const app = express();
// 나중에 post방식으로 통신을 할 때 body값을 파싱하는데 사용할 예정
app.use(express.json());
const port = 80;

// 기본 라우트 설정
app.get('/', async (req, res) => {
    await client.set('testkey', '거기에 들어가는 값');
    const value = await client.get('testkey');
    res.send(`결과 : ${value}`);
});

app.get('/login', async (req, res) => {
    try {
        try {
            if (!req.query.userid) throw 'error';
            if (!req.query.userpwd) throw 'error';
        } catch (error) {
            throw 'invalidate error';            
        }
        
        let userInfo = {};
        let sessionId;

        try {
            const res = await pgClient.query(`select * from users where userid = '${req.query.userid}';`);
            console.log('user info:', res.rows[0]);
            userInfo = res.rows[0];
        } catch (error) {
            console.error('오류 발생:', error);
            throw 'database(postgres) error';
        } 

        try {
            sessionId = uuidv4(); 
            await client.set(sessionId, JSON.stringify(userInfo), 'EX', 1800);
        } catch (error) {
            console.error('Redis 저장 실패:', error);
            throw 'database(redis) error';
        } 

        res.status(200).json({ sessionId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 에러' });
    }
});

app.get('/score', async (req, res) => {
    try {
        try {
            if (!req.query.sessionid) throw 'error';
        } catch (error) {
            throw 'invalidate error';            
        }
        
        let userInfo = {};
        let scoreInfo = {};
        const sessionId = req.query.sessionid;

        try {
            userInfo = JSON.parse(await client.get(sessionId));
        } catch (error) {
            console.error('Redis 로드 실패:', error);
            throw 'database(redis) error';
        } 

        try {
            const res = await pgClient.query(`select * from scores where userid = '${userInfo.userid}';`);
            console.log('score info:', res.rows[0]);
            scoreInfo = res.rows[0];
        } catch (error) {
            console.error('오류 발생:', error);
            throw 'database(postgres) error';
        } 

        res.status(200).json(scoreInfo.score);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 에러' });
    }
});

app.get('/test', async (req, res) => {
    let userInfo = {
        userid: 'testid',
        level: 1,
        nickname: '사대천왕',
        email: 'scjeglobal@gmail.com',
        phone: '01055671285'
    }
    await client.set(userInfo.userid, JSON.stringify(userInfo));

    userInfo = {
        userid: 'testid1',
        level: 10,
        nickname: '사대천왕111111',
        email: 'scjegloba111l@gmail.com',
        phone: '01055671285'
    }
    await client.set(userInfo.userid, JSON.stringify(userInfo));

    userInfo = {
        userid: 'testid2',
        level: 22,
        nickname: '사대천왕22222',
        email: 'scjegloba222l@gmail.com',
        phone: '01055671285'
    }
    await client.set(userInfo.userid, JSON.stringify(userInfo));

    userInfo = {
        userid: 'testid3',
        level: 1312,
        nickname: '사대천왕3333333',
        email: 'scjegl333obal@gmail.com',
        phone: '01055671285'
    }
    await client.set(userInfo.userid, JSON.stringify(userInfo));
});

app.get('/userinfo', async (req, res) => {
    const userInfo = {
        userid: 'testid',
        level: 1,
        nickname: '사대천왕',
        email: 'scjeglobal@gmail.com',
        phone: '01055671285'
    }
    await client.set('testid', JSON.stringify(userInfo));
    const value = await client.get('testid');
    res.send(`사용자 정보 : ${value}`);
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port}에서 실행 중입니다.`);
});

// await -> 기다려라 -> 동기
const client = await createClient()
  .on('error', err => console.log('Redis Client Error', err))
  .connect();

const pgClient = new Client({
    host: '127.0.0.1',       // 데이터베이스 호스트
    port: 5432,              // PostgreSQL 포트 (기본값: 5432)
    user: 'postgres',          // 데이터베이스 사용자
    password: '123qwe1@qW', // 사용자 비밀번호
    database: 'postgres',  // 데이터베이스 이름
})
await pgClient.connect()

// 서버 종료 시 Redis 연결 종료
process.on('SIGINT', async () => {
  await client.quit();
  await pgClient.end();

  console.log('Redis 연결 종료.');
  process.exit(0);
});