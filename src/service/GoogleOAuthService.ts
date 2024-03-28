import { userInfoDAO } from '../DAO/UserInfoDAO.js';
import { GoogleOAuth2Client } from '../auth/GoogleOAuth2.js';
import { AuthState, UserInfo } from '../types/index.js';

export class GoogleOAuthService {
  private googleOAuth2Client: GoogleOAuth2Client;

  constructor(redirectPath: string) {
    this.googleOAuth2Client = new GoogleOAuth2Client(redirectPath);
  }

  generateAuthUrl(state: AuthState) {
    const authUrl = this.googleOAuth2Client.generateAuthUrl(state);
    return authUrl;
  }

  private async getUserInfo(
    code: string
  ): Promise<{ ok: boolean; userInfo?: UserInfo; error?: string }> {
    try {
      await this.googleOAuth2Client.getAccessToken(code);
      const userInfo = await this.googleOAuth2Client.getUserInfo();
      return userInfo;
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async login(
    code: string
  ): Promise<{ ok: boolean; userInfo?: UserInfo; error?: string }> {
    try {
      const {
        ok: getUserInfoOk,
        userInfo,
        error,
      } = await this.getUserInfo(code);
      if (!getUserInfoOk) {
        throw new Error(error);
      }

      const { ok, error: errorMessage } = await userInfoDAO.getUserInfo(
        userInfo.id
      );

      if (!ok) {
        throw new Error(errorMessage);
      }

      return { ok: true, userInfo };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async register(
    code: string
  ): Promise<{ ok: boolean; userInfo?: UserInfo; error?: string }> {
    try {
      const {
        ok: okGetUserInfo,
        userInfo,
        error,
      } = await this.getUserInfo(code);
      const { ok, userInfo: userInfoFromDB } = await userInfoDAO.getUserInfo(
        userInfo.id
      );

      if (ok) {
        return { ok: true, error: '사용자가 이미 존재 -> 로그인 처리' };
      }

      // 사용자 등록/업데이트
      userInfoDAO.saveUserInfo({
        ...userInfoFromDB,
        ...userInfo,
      });

      return { ok: true, userInfo };
    } catch (error) {
      console.log(error);
      return { ok: false, error: error.message };
    }
  }
}
