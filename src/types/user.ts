export type UserPermissionType = 'guest' | 'user' | 'admin';

export type UserInfoType = {
  userId: string;
  permissions: UserPermissionType;
  sid: string[];
};

export type ChatRoomUserType = {
  userId: string;
  namespace: string;
  chatRoomName: string;
};