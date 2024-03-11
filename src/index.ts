import { Namespace, Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import inquirer from 'inquirer';
import http from 'http';
import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Socket } from 'socket.io';
import { userManager } from './userManager.js';
import { roomManager } from './roomManager.js';
import 'dotenv/config';
import { getSocketInfo } from './utils/getSocketInfo.js';

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
  const pubClient = createClient({ url: 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();

  // Redis 서버 연결
  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      console.log('Redis Server is running on port 6379');

      // Redis Adapter 연결
      io.adapter(createAdapter(pubClient, subClient));
      server.listen(port, () => {
        console.log(`Socket.io Server is listening on port ${port}`);
      });
    })
    .catch((error) => {
      console.error('Redis Server connection error:', error);
    });

  {
    // 발신한 클라이언트를 *포함한* 연결된 모든 클라이언트에게 메시지 발송
    // io.emit('message', 'send from server1');
    // 발신한 클라이언트를 *제외한* 연결된 모든 클라이언트에게 메시지 발송
    // socket.broadcast.emit('message', 'send from server1');
  }

  io.of('/').adapter.on('create-room', (room) => {
    console.log(`room ${room} was created`);
    io.to(room).emit(`room ${room} was created`);
  });

  // io.of('/').adapter.on('join-room', (room, id) => {
  //   console.log(`socket ${id} has joined room ${room}`);

  //   io.to(room).emit(`socket ${id} has joined room ${room}`);
  // });

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
    userManager.handleSocketEvent('connection', socket);

    const { userId } = getSocketInfo(socket);
    printAdapterDetails('connection');

    // 사용자가 속한 모든 방에 대해 join 후에 'connectionComplete' 이벤트를 발생시킵니다.
    const userRooms = roomManager.getUserRooms(socket);
    console.log('🚀 | userRooms:', userRooms);
    userRooms && userRooms.forEach((roomName) => {
      socket.join(roomName);
      namespace.emit('join-room', roomName);
    });

    socket.emit('connectionComplete', { userId });

    socket.on('disconnect', () => {
      userManager.handleSocketEvent('disconnect', socket);
      printAdapterDetails('disconnect');
    });
    socket.on('roomList', () => {
      const userRooms = roomManager.getUserRooms(socket);
      console.log('🚀 | socket.on | userRooms:', userRooms);
      // socket.emit('roomList', Array.from(userRooms));
    }),
    socket.on('message', (roomName, msg) => {
      socket.broadcast.to(roomName).emit('message', msg);

      console.log(`[${roomName}]message: ${JSON.stringify(msg, null, 2)}`);
    });

    socket.on('joinRoom', (roomName) => {
      socket.join(roomName);
      // 방이 생성된 후에 'create-room' 이벤트를 발생시킵니다.
      namespace.emit('join-room', roomName);
      
      roomManager.joinRoom(socket, roomName);
      printAdapterDetails('joinRoom');
    });
    socket.on('leaveRoom', (roomName) => {
      socket.leave(roomName);
      namespace.to(roomName).emit('message', `유저가 ${roomName} 방을 떠났습니다.`);

      roomManager.leaveRoom(socket, roomName);
      printAdapterDetails('leaveRoom');
    });    
  });
}


function printAdapterInfo(server: Server) {
  const io = server;
  return function(event: string) {
    if (io) {
      console.log('event:', event);
      console.log('rooms:', io.of('/').adapter.rooms);
      console.log('sids:', io.of('/').adapter.sids);
    }
  }
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

// INFO: client.html 페이지 서비스
function clientService(app: express.Application) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '..', 'client'))); // Express에서 정적 파일(예: HTML 파일, 이미지, CSS 파일 등)을 제공하기 위한 내장 미들웨어 등록
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'client.html'));
  });
}