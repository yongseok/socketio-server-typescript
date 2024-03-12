import { Namespace, Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import inquirer from 'inquirer';
import http from 'http';
import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Socket } from 'socket.io';
import 'dotenv/config';
import { getSocketInfo } from './utils/getSocketInfo.js';
import { chatroomManager } from './ChatManager.js';
import { ChatRoomUserType } from './types/index.js';

let printAdapterDetails;

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
      printAdapterDetails = startServer(port);
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
  printAdapterDetails = startServer(3000);
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
      console.log('Redis Server is running on port 6379');

      // Redis Store 연결
      chatroomManager.setRedisClient(storeClient);

      // Redis Adapter 연결
      io.adapter(createAdapter(pubClient, subClient));
      server.listen(port, () => {
        console.log(`Socket.io Server is listening on port ${port}`);
      });
    })
    .catch((error) => {
      console.error('Redis Server connection error:', error);
    });

  // '/' 네임스페이스
  setupNamespace(io.of('/'));
  // '/chat' 네임스페이스
  setupNamespace(io.of('/chat'));
  // '/user' 네임스페이스
  setupNamespace(io.of('/user'));
  // '/admin' 네임스페이스
  setupNamespace(io.of('/admin'));

  // Adapter 정보 출력 함수 생성
  return printAdapterInfo(io);
}

function setupNamespace(namespace: Namespace) {
  namespace.use((socket, next) => {
    checkUserPermission(socket, next);
  });

  namespace.on('connection', async (socket) => {
    const { userId } = getSocketInfo(socket);
    printAdapterDetails('connection');

    // 사용자가 속한 모든 방에 대해 join 후에 'connectionComplete' 이벤트를 발생시킵니다.
    const userRoomList = await chatroomManager.getRoomList(
      namespace.name,
      userId
    );
    console.log(
      '🚀 | 로그인 시 네임스페이스에 기존 대화방에 입장:',
      userRoomList
    );
    userRoomList &&
      userRoomList.forEach((chatRoom: ChatRoomUserType) => {
        socket.join(chatRoom.chatRoomName);
        namespace.emit('join-room', chatRoom.chatRoomName);
      });

    socket.emit('connectionComplete', { userId });

    socket.on('disconnect', () => {
      printAdapterDetails('disconnect');
    });

    socket.on('message', (chatRoomName, msg) => {
      socket.broadcast
        .to(chatRoomName)
        .emit('message', { ...msg, chatRoomName });

      printMsgInfo(namespace.name, msg, chatRoomName);
    });

    socket.on('joinRoom', (chatRoomName) => {
      socket.join(chatRoomName);
      // 방이 생성된 후에 'create-room' 이벤트를 발생시킵니다.
      socket.emit('join-room', chatRoomName);

      chatroomManager.joinRoom({
        userId,
        namespace: namespace.name,
        chatRoomName,
      });
      chatroomManager.printRoomList();
      printAdapterDetails('joinRoom');
    });

    socket.on('leaveRoom', (chatRoomName) => {
      socket.leave(chatRoomName);
      namespace
        .to(chatRoomName)
        .emit('message', `유저가 ${chatRoomName} 방을 떠났습니다.`);

      chatroomManager.leaveRoom({
        userId,
        namespace: namespace.name,
        chatRoomName,
      });
      chatroomManager.printRoomList();
      printAdapterDetails('leaveRoom');
    });
  });
}

// 미들웨어 함수: 사용자 권한 확인
function checkUserPermission(socket: Socket, next: (error?: any) => void) {
  // 클라이언트에서 전송한 권한 정보 확인
  const userPermissions = socket.handshake.auth.permission;

  // 실제 권한 확인 로직을 수행 (예시로 무조건 true 반환)
  const userHasPermission = userPermissions === 'admin';

  if (userHasPermission) {
    console.log(`Authentication passed: ${userPermissions}`);
    next();
  } else {
    console.log(`Authentication failed: ${userPermissions}`);
    next(new Error(`'admin'등급만 접근 가능합니다. [현재등급: ${userPermissions}]`));
  }
}

function printAdapterInfo(server: Server) {
  const io = server;
  return function (event: string) {
    if (process.env.LOG_REDIS_ADAPTER === 'true' && io) {
      console.log('event:', event);
      console.log('rooms:', io.of('/').adapter.rooms);
      console.log('sids:', io.of('/').adapter.sids);
    }
  };
}

function printMsgInfo(
  namespaceName: string,
  msg: string,
  chatRoomName: string
) {
  if (process.env.LOG_MSG_INFO === 'true') {
    console.log(
      `[${namespaceName}:${chatRoomName}]message: ${JSON.stringify(
        msg,
        null,
        2
      )}`
    );
  }
}

// INFO: client.html 페이지 서비스
function clientService(app: express.Application) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '..', 'client'))); // Express에서 정적 파일(예: HTML 파일, 이미지, CSS 파일 등)을 제공하기 위한 내장 미들웨어 등록
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'client.html'));
  });
}