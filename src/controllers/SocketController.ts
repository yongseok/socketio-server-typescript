import { Namespace, Socket } from 'socket.io';
import { chatroomService } from '../types/ChatroomService.js';
import { ChatroomDetails } from '../types/chatroom.js';
import { getSocketInfo } from '../utils/getSocketInfo.js';
import { printAdapterInfo, printMsgInfo } from '../utils/debug.js';

class SocketController {
  private namespace: Namespace;
  private printAdapterDetails: (event: string) => void;

  constructor(namespace: Namespace) {
    this.namespace = namespace;
    this.printAdapterDetails = printAdapterInfo(namespace.server);
    this.setupNamespace();
  }

  private setupNamespace() {
    this.namespace.use((socket, next) => {
      this.checkUserPermission(socket, next);
    });

    this.namespace.on('connection', async (socket) => {
      const { userId } = getSocketInfo(socket);
      this.printAdapterDetails('connection');

      // 사용자 connection 시 실행되야 할 메서드들을 실행
      await this.handleUserConnection(socket, userId);

      socket.on('disconnect', () => {
        this.printAdapterDetails('disconnect');
      });

      socket.on('message', (chatroomName, message) => {
        console.log('🚀 | socket.on | message:', message);

        socket.broadcast
          .to(chatroomName)
          .emit('message', { ...message, roomName: chatroomName });

        printMsgInfo(this.namespace.name, message, chatroomName);

        chatroomService.addChatroom(
          this.namespace.name,
          chatroomName,
          message,
          userId
        );
      });

      socket.on('joinRoom', (chatRoomName) => {
        socket.join(chatRoomName);
        // 방이 생성된 후에 'create-room' 이벤트를 발생시킵니다.
        socket.emit('join-room', chatRoomName);
        this.printAdapterDetails('joinRoom');
      });

      socket.on('leaveRoom', (chatRoomName) => {
        socket.leave(chatRoomName);
        socket.broadcast
          .to(chatRoomName)
          .emit('message', `유저가 ${chatRoomName} 방을 떠났습니다.`);

        chatroomService.leaveRoom(userId, this.namespace.name, chatRoomName);
        this.printAdapterDetails('leaveRoom');
      });
    });
  }

  private checkUserPermission(socket: Socket, next: (error?: any) => void) {
    // 클라이언트에서 전송한 권한 정보 확인
    const userPermissions = socket.handshake.auth.permission;

    // 실제 권한 확인 로직을 수행 (예시로 무조건 true 반환)
    const userHasPermission = userPermissions === 'admin';

    if (userHasPermission) {
      console.log(`Authentication passed: ${userPermissions}`);
      next();
    } else {
      console.log(`Authentication failed: ${userPermissions}`);
      next(
        new Error(
          `'admin'등급만 접근 가능합니다. [현재등급: ${userPermissions}]`
        )
      );
    }
  }

  // 사용자 connection 시 실행되야 할 메서드들을 모아둔 메서드
  private async handleUserConnection(socket: Socket, userId: string) {
    // 사용자가 속한 모든 방에 대해 join 후에 'connectionComplete' 이벤트를 발생시킵니다.
    const userRoomList = await chatroomService.getChatroomList(
      userId,
      this.namespace.name
    );

    console.log('🚀 | 로그인 시 네임스페이스에 기존 대화방에 입장:');
    await chatroomService.printRoomList(userRoomList);

    socket.emit('connectionComplete', { userId });
    await this.joinChatroomsAndEmitEvent(socket, userRoomList);
    await this.sendChatroomList(socket, userRoomList);
  }

  private async joinChatroomsAndEmitEvent(
    socket: Socket,
    userRoomList: ChatroomDetails[]
  ) {
    if (userRoomList) {
      await Promise.all(
        userRoomList.map(async (chatRoom: ChatroomDetails) => {
          socket.join(chatRoom.chatRoomName);
          socket.emit('join-room', chatRoom.chatRoomName);
        })
      );
    }
  }
  private async sendChatroomList(
    socket: Socket,
    userRoomList: ChatroomDetails[]
  ) {
    await chatroomService.printRoomList(userRoomList);
    socket.emit('chatroomList', userRoomList);
  }
}
export { SocketController };
