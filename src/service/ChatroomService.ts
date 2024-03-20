import { chatroomDAO, ChatroomDAO } from '../DAO/ChatroomDAO.js';
import { Message } from './types.js';
import { RedisClientType } from 'redis';
import { ChatroomDetails } from '../types/chatroom.js';

class ChatroomService {
  private chatroomManager: ChatroomDAO;

  constructor() {
    this.chatroomManager = chatroomDAO;
  }

  async addChatroom(
    namespaceName: string,
    chatroomName: string,
    message: Message,
    userId: string
  ) {
    const date = Math.floor(new Date().getTime() / 1000); // unix timestamp
    return this.chatroomManager.addChatroom({
      userId,
      namespace: namespaceName,
      chatRoomName: chatroomName,
      lastMessageTime: date,
      messageType: message.type,
      lastMessage: message.content,
      unreadCount: 0,
    });
  }
  async getChatroomList(userId: string, namespaceName: string) {
    return await this.chatroomManager.getChatroomList({
      userId,
      namespace: namespaceName,
    });
  }
  async printRoomList(userRoomList: ChatroomDetails[]) {
    return this.chatroomManager.printRoomList(userRoomList);
  }

  async leaveRoom(userId: string, namespaceName: string, chatRoomName: string) {
    return this.chatroomManager.leaveRoom({
      userId,
      namespace: namespaceName,
      chatRoomName,
    });
  }
}
export const chatroomService = new ChatroomService();
