import { ChatRoomUserType } from './types/index.js';

class ChatroomManager {
  private client: any;

  constructor() {
    this.client = null;
  }

  setRedisClient(client: any) {
    this.client = client;
  }

  private generateChatroomKey(userId: string, namespace: string) {
    return `user_chatrooms:${userId}:${namespace}`;
  }

  private generateChatroomValue(chatRoomUser: ChatRoomUserType) {
    try {
      const encodedValue =
        process.env.REDIS_IS_ENCODING === 'true'
          ? Buffer.from(JSON.stringify(chatRoomUser), 'utf-8').toString(
              'base64'
            )
          : JSON.stringify(chatRoomUser);
      return encodedValue;
    } catch (error) {
      console.error('Error occurred while generating chatroom value:', error);
      throw error;
    }
  }

  private decodeChatroomValue(value: string) {
    try {
      const decodedValue =
        process.env.REDIS_IS_ENCODING === 'true'
          ? JSON.parse(Buffer.from(value, 'base64').toString('utf-8'))
          : JSON.parse(value);
      return decodedValue;
    } catch (error) {
      console.error('Error occurred while decoding chatroom value:', error);
      throw error;
    }
  }

  async sadd(key: string, value: string): Promise<number> {
    try {
      return this.client.sAdd(key, value);
    } catch (error) {
      console.error('Error occurred while adding value in Redis:', error);
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return this.client.sMembers(key);
    } catch (error) {
      console.error('Error occurred while getting value in Redis:', error);
      throw error;
    }
  }

  async srem(key: string, value: string): Promise<number> {
    try {
      return this.client.sRem(key, value);
    } catch (error) {
      console.error('Error occurred while deleting value in Redis:', error);
      throw error;
    }
  }

  async joinRoom(chatRoomUser: ChatRoomUserType): Promise<number> {
    const key = this.generateChatroomKey(
      chatRoomUser.userId,
      chatRoomUser.namespace
    );
    const value = this.generateChatroomValue(chatRoomUser);
    this.printInputValue(key, value);

    return this.sadd(key, value);
  }

  async leaveRoom(chatRoomUser: ChatRoomUserType) {
    const key = this.generateChatroomKey(
      chatRoomUser.userId,
      chatRoomUser.namespace
    );
    const value = this.generateChatroomValue(chatRoomUser);
    this.printInputValue(key, value);

    return this.srem(key, value);
  }

  async getRoomList(
    namespace: string,
    userId: string
  ): Promise<ChatRoomUserType[] | null> {
    const key = this.generateChatroomKey(userId, namespace);
    const result = await this.smembers(key);
    if (result.length === 0) {
      return null;
    }
    return result.map((item) => {
      return this.decodeChatroomValue(item);
    });
  }

  printInputValue(key: string, value: string) {
    console.log(`key: ${key}, value: ${value}`);
  }
  async printRoomList() {
    const allKeys = await this.client.keys('user_chatrooms:*');
    console.log('allKeys:', allKeys);
    allKeys.forEach(async (key: string) => {
      const roomList = await this.smembers(key);
      console.log('key:', key, 'roomList:', roomList);
    });
  }
}

export const chatroomManager = new ChatroomManager();
