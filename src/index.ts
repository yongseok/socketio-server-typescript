import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import inquirer from 'inquirer';
import http from 'http';
import express from 'express';
import 'dotenv/config';
import { chatroomService } from './types/ChatroomService.js';
import { SocketController } from './controllers/SocketController.js';

if (process.env.RUN_MODE === 'prompt') {
  // 터미널에서 포트 번호 입력
  inquirer
    .prompt([
      {
        type: 'number',
        name: 'port',
        message: 'Input Server port number:',
      },
    ])
    .then((answers) => {
      const port: number = answers['port'];
      // 서버 시작 함수 호출
      startServer(port);
    })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
        console.error('😭 현재 환경에서 프롬프트를 렌더링할 수 없습니다.');
      } else {
        // Something else went wrong
        console.error('😭 다른 문제가 발생했습니다.', error);
      }
    });
} else {
  startServer(3000);
}

function startServer(port: number) {
  const app = express();

  // 클라이언트 서비스 함수 호출
  // clientService(app);

  // socket.io 서버 생성
  const server = http.createServer(app);
  const origin = [
    'http://127.0.0.1:5501',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  const io = new Server(server, {
    // transports: ['websocket'],
    cors: {
      origin,
      methods: ['GET', 'POST'],
      credentials: false,
    },
  });

  // Redis Adapter 생성
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  const storeClient = pubClient.duplicate();

  // Redis 서버 연결
  Promise.all([pubClient.connect(), subClient.connect(), storeClient.connect()])
    .then(() => {
      console.log(`Redis Server is running on [${process.env.REDIS_URL}]`);

      // ChatroomService에 Redis 클라이언트 설정
      chatroomService.setRedisClient(storeClient);

      // Redis Adapter 연결
      io.adapter(createAdapter(pubClient, subClient));

      // 네임스페이스 별로 소켓 이벤트 핸들러 생성
      new SocketController(io.of('/'));
      new SocketController(io.of('/chat'));
      new SocketController(io.of('/user'));
      new SocketController(io.of('/admin'));

      server.listen(port, () => {
        console.log(`Socket.io Server is listening on port ${port}`);
      });
    })
    .catch((error) => {
      console.error('Redis Server connection error:', error);
    });
}
