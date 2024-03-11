export type MsgType = 'text' | 'image' | 'video' | 'file';

export type MessageType = {
  userId: string;
  msgType: MsgType;
  msg: string;
};
