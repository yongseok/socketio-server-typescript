import { RedisClientType } from 'redis';
import { UserInfoDAO, userInfoDAO } from '../DAO/UserInfoDAO.js';
import { jwtService } from '../auth/JwtService.js';

export class WebService {
  private userInfoDAO: UserInfoDAO;

  constructor() {
    this.userInfoDAO = userInfoDAO;
  }

  async register(
    userid: string,
    password: string,
    role: string
  ): Promise<{ ok: boolean; errorMessage?: string }> {
    try {
      // 1. 이미 사용자 있음
      const user = await this.userInfoDAO.getUserInfo(userid);
      if (user.ok) {
        return { ok: false, errorMessage: 'user already exists' };
      }

      // 2. 사용자 등록
      return this.userInfoDAO.saveUserInfo(userid, password, role);
    } catch (error) {
      console.error('register error:', error);
      return { ok: false, errorMessage: 'register error' };
    }
  }

  async login(
    userId: string,
    password: string,
    role: string
  ): Promise<{ ok: boolean; errorMessage?: string; token?: string }> {
    try {
      // 1. 사용자 정보 확인
      const user = await this.userInfoDAO.getUserInfo(userId);
      console.log('🚀 | WebService | login | user:', user);
      if (!user.ok) {
        return { ok: false, errorMessage: 'user not found' };
      }
      if (user.data.password !== password) {
        return { ok: false, errorMessage: 'password not matching' };
      }

      // 2. 토큰 발급
      return this.userInfoDAO.getUserInfo(userId).then(async (userInfo) => {
        if (userInfo.ok) {
          if (
            userInfo.data.userId === userId &&
            userInfo.data.password === password &&
            userInfo.data.role === role
          ) {
            return {
              ok: true,
              token: await jwtService.generateToken({ userId, role }),
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
