export type MessageType = 'text' | 'image' | 'video' | 'file';

export type Message = {
  chatRoomName: string;
  userId: string;
  msgType: MessageType;
  msg: string;
};
