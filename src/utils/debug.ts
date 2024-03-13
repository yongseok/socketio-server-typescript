import { Server } from 'socket.io';
import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

export function printAdapterInfo(server: Server) {
  const io = server;
  return function (event: string) {
    if (process.env.LOG_REDIS_ADAPTER === 'true' && io) {
      console.log('event:', event);
      console.log('rooms:', io.of('/').adapter.rooms);
      console.log('sids:', io.of('/').adapter.sids);
    }
  };
}

export function printMsgInfo(
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
export function clientService(app: express.Application) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '..', 'client'))); // Express에서 정적 파일(예: HTML 파일, 이미지, CSS 파일 등)을 제공하기 위한 내장 미들웨어 등록
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'client.html'));
  });
}
