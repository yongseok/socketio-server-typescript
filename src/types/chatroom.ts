import { MessageType } from './message.js';

export type ChatroomIdentifiers = {
  userId: string;
  namespace: string;
  chatRoomName: string;
};
export type ChatroomDetails = ChatroomIdentifiers & {
  messageType: MessageType;
  lastMessageTime: number; // unix timestamp
  lastMessage: string;
  unreadCount: number;
};

export type ChatroomCollectionKeyProps = Omit<
  ChatroomIdentifiers,
  'chatRoomName'
>;

export type ChatroomSortingOrder = 'asc' | 'desc';

export type ChatroomListQuery = {
  userId: string;
  namespace: string;
};
