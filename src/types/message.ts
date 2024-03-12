export type MsgType = 'text' | 'image' | 'video' | 'file';

export type MessageType = {
  chatRoomName: string;
  userId: string;
  msgType: MsgType;
  msg: string;
};
