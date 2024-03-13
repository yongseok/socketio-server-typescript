export type UserPermissionType = 'guest' | 'user' | 'admin';

export type UserInfo = {
  userId: string;
  permissions: UserPermissionType;
  sid: string[];
};