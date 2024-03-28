import { RedisClientType } from 'redis';
import { UserInfoDAO, userInfoDAO } from '../DAO/UserInfoDAO.js';
import { jwtService } from '../auth/JwtService.js';
import { UserInfo, UserPermissionType } from '../types/user.js';

export class WebService {
  private userInfoDAO: UserInfoDAO;

  constructor() {
    this.userInfoDAO = userInfoDAO;
  }

  async register(
    userInfo: UserInfo
  ): Promise<{ ok: boolean; errorMessage?: string }> {
    try {
      // 1. 이미 사용자 있음
      const user = await this.userInfoDAO.getUserInfo(userInfo.id);
      if (user.ok) {
        return { ok: false, errorMessage: 'user already exists' };
      }

      // 2. 사용자 등록
      return this.userInfoDAO.saveUserInfo(userInfo);
    } catch (error) {
      console.error('register error:', error);
      return { ok: false, errorMessage: 'register error' };
    }
  }

  async login(
    userId: string,
    password: string,
    permissions: string
  ): Promise<{ ok: boolean; errorMessage?: string; token?: string }> {
    try {
      // 1. 사용자 정보 확인
      const {ok, userInfo, error} = await this.userInfoDAO.getUserInfo(userId);
      console.log('🚀 | WebService | login | user:', userInfo);
      if (!ok) {
        return { ok: false, errorMessage: `user not found: ${error}` };
      }
      if (userInfo.password !== password) {
        return { ok: false, errorMessage: 'password not matching' };
      }

      // 2. 토큰 발급
      return this.userInfoDAO.getUserInfo(userId).then(async ({ok, userInfo, error }) => {
        if (ok) {
          if (
            userInfo.id === userId &&
            userInfo.password === password &&
            userInfo.permissions === permissions
          ) {
            return {
              ok: true,
              token: await jwtService.generateToken({ userId, role: permissions }),
            };
          } else {
            return { ok: false, errorMessage: 'login error' };
          }
        } else {
          return { ok: false, errorMessage: 'login error' };
        }
      });
    } catch (error) {
      console.error('login error:', error);
      return { ok: false, errorMessage: error.message };
    }
  }
}

export const webService = new WebService();
