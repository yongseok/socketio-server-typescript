export type UserPermissionType = 'guest' | 'user' | 'admin';
export type UserRegistrationType = 'local' | 'goole' | 'naver';
export type UserInfo = {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  permissions: UserPermissionType;
  verifiedEmail: boolean;
  registratioType: UserRegistrationType;
  picture?: string;
};
export type AuthState = 'login' | 'signup';