import { RedisWrapper } from '../wrappers/RedisWrapper.js';
import { RedisClientType } from 'redis';
import {
  ChatroomCollectionKeyProps,
  ChatroomIdentifiers,
  ChatroomDetails,
  ChatroomSortingOrder,
  ChatroomListQuery,
} from '../types/index.js';

// 대화방 리스트 저장에 두 개의 키를 사용하는 이유:
// - 대화방 리스트를 마지막 대화 시간 순으로 정렬하기 위함
// - 대화방 리스트를 가져올 때는 sorted set을 사용, 대화방에 대한 데이터를 가져올 때는 set을 사용
// - 두가지의 데이터를 하나의 키로 저장하면, 대화방 이름으로 특정 대화방을 삭제할때 모든 데이터를 가져와 비교하여 삭제해야 하기 때문에 성능이 떨어지고, 코드가 복잡해진다.

class ChatroomManager {
  private client: RedisWrapper;

  constructor(client: RedisClientType) {
    this.client = new RedisWrapper(client);
  }

  // 대화방 리스트 조회를 위한 키(마지막 대화 시간 순으로 오름차순 정렬)
  // 자료구조: sorted set
  // 키: user_chatrooms:collection:${userId}:${namespace}
  // value: chatRoomName
  private generateChatroomCollectionKey({
    userId,
    namespace,
  }: ChatroomCollectionKeyProps) {
    return `user_chatrooms:collection:${userId}:${namespace}`;
  }
  private generateChatroomCollectionValue(chatroomName: string) {
    return chatroomName;
  }
  private generateChatroomCollectionScore(
    lastMessageTime: number /*unix timestamp */
  ) {
    const sorder: ChatroomSortingOrder = 'desc';
    return sorder === 'desc' ? -lastMessageTime : lastMessageTime;
  }

  // 대화방 각 항목의 데이터를 저장하기 위한 키
  // 자료구조: set
  // 키: user_chatrooms:data:${userId}:${namespace}:${chatRoomName}
  // value: userId, namespace, chatRoomName, lastMsgTime, lastMsg, unreadCount
  private generateChatroomDataKey({
    userId,
    namespace,
    chatRoomName,
  }: ChatroomIdentifiers) {
    return `user_chatrooms:data:${userId}:${namespace}:${chatRoomName}`;
  }
  private generateChatroomDataValue(chatRoomData: ChatroomDetails) {
    try {
      const encodedValue =
        process.env.REDIS_IS_ENCODING === 'true'
          ? Buffer.from(JSON.stringify(chatRoomData), 'utf-8').toString(
              'base64'
            )
          : JSON.stringify(chatRoomData);
      return encodedValue;
    } catch (error) {
      console.error('Error occurred while generating chatroom value:', error);
      throw error;
    }
  }

  private decodeChatroomDataValue(value: string) {
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

  async addChatroom(chatRoomData: ChatroomDetails) {
    try {
      await this.addChatRoomData(chatRoomData);
      await this.addChatroomCollection(chatRoomData);
    } catch (error) {
      console.error('Error occurred while adding chatroom:', error);
      throw error;
    }
  }

  async removeChatroom(chatRoomData: ChatroomIdentifiers) {
    try {
      await this.removeChatRoomData(chatRoomData);
      await this.removeChatroomCollection(chatRoomData);
    } catch (error) {
      console.error('Error occurred while removing chatroom:', error);
      throw error;
    }
  }

  private async addChatRoomData(chatRoomData: ChatroomDetails) {
    const dataKey = this.generateChatroomDataKey({
      userId: chatRoomData.userId,
      namespace: chatRoomData.namespace,
      chatRoomName: chatRoomData.chatRoomName,
    });
    const dataValue = this.generateChatroomDataValue(chatRoomData);

    return this.client.sadd(dataKey, dataValue);
  }

  private async removeChatRoomData(chatRoomData: ChatroomIdentifiers) {
    const dataKey = this.generateChatroomDataKey({
      userId: chatRoomData.userId,
      namespace: chatRoomData.namespace,
      chatRoomName: chatRoomData.chatRoomName,
    });

    return this.client.del(dataKey);
  }

  private async addChatroomCollection(chatRoomData: ChatroomDetails) {
    const collectionKey = this.generateChatroomCollectionKey({
      userId: chatRoomData.userId,
      namespace: chatRoomData.namespace,
    });
    const collectionValue = this.generateChatroomCollectionValue(
      chatRoomData.chatRoomName
    );
    const score = this.generateChatroomCollectionScore(
      chatRoomData.lastMessageTime
    );
    await this.client.zadd(collectionKey, score, collectionValue);
  }

  private async removeChatroomCollection(chatRoomData: ChatroomIdentifiers) {
    const collectionKey = this.generateChatroomCollectionKey({
      userId: chatRoomData.userId,
      namespace: chatRoomData.namespace,
    });
    const collectionValue = this.generateChatroomCollectionValue(
      chatRoomData.chatRoomName
    );
    return this.client.zrem(collectionKey, collectionValue);
  }

  async leaveRoom(chatRoomData: ChatroomIdentifiers) {
    try {
      await this.removeChatroom(chatRoomData);
    } catch (error) {
      console.error('Error occurred while leaving room:', error);
      throw error;
    }
  }

  async getChatroomList(getChatroomListProps: ChatroomListQuery) {
    try {
      const collectionKey =
        this.generateChatroomCollectionKey(getChatroomListProps);
      const start = 0;
      const stop = -1;
      const chatroomList = await this.client.zrange(collectionKey, start, stop);
      const decodedList: ChatroomDetails[] = [];
      for (let i = 0; i < chatroomList.length; i++) {
        const chatRoomData = await this.client.smembers(
          this.generateChatroomDataKey({
            userId: getChatroomListProps.userId,
            namespace: getChatroomListProps.namespace,
            chatRoomName: chatroomList[i],
          })
        );
        decodedList[i] = this.decodeChatroomDataValue(chatRoomData[0]);
      }
      return decodedList;
    } catch (error) {
      console.error('Error occurred while getting chatroom list:', error);
      throw error;
    }
  }

  async printRoomList(list: ChatroomDetails[]) {
    const decodedList = list.map((item) => {
      return {
        ...item,
        lastMessageTimeStr: new Date(item.lastMessageTime * 1000),
      };
    });
    console.log('🚀 | printRoomList | decodedList:', decodedList);
  }
}

export { ChatroomManager };
