import { UserInfo } from '../types/user.js';
import {
  RedisStoreClient,
  redisStoreClient,
} from '../wrappers/RedisStoreClient.js';

export class UserInfoDAO {
  private client: RedisStoreClient;

  constructor() {
    this.client = redisStoreClient;
  }

  private generatorSaveUserInfoKey(userId: string) {
    return `user:${userId}`;
  }
  private generatorSaveUserInfoValue(userInfo: UserInfo) {
    return JSON.stringify(userInfo);
  }

  async saveUserInfo(userInfo: UserInfo) {
    try {
      const userInfoKey = this.generatorSaveUserInfoKey(userInfo.id);
      const userInfoValue = this.generatorSaveUserInfoValue(userInfo);
      await this.client.set(userInfoKey, userInfoValue);
      return { ok: true };
    } catch (error) {
      console.error('saveUserInfo error:', error);
      return { ok: false, errorMessage: 'saveUserInfo error' };
    }
  }
  async getUserInfo(
    userId: string
  ): Promise<{ ok: boolean; userInfo?: UserInfo; error?: string }> {
    try {
      const userInfoKey = this.generatorSaveUserInfoKey(userId);
      const userInfoValue = await this.client.get(userInfoKey);
      const userInfoJson = JSON.parse(userInfoValue);
      return userInfoValue
        ? { ok: true, userInfo: { ...userInfoJson, userId } }
        : { ok: false };
    } catch (error) {
      console.error('getUserInfo error:', error);
      return { ok: false, error: 'getUserInfo error' };
    }
  }
  async delUserInfo(userId: string) {
    try {
      const userInfoKey = this.generatorSaveUserInfoKey(userId);
      await this.client.del(userInfoKey);
      return { ok: true };
    } catch (error) {
      console.error('delUserInfo error:', error);
      return { ok: false, error: 'delUserInfo error' };
    }
  }
}
export const userInfoDAO = new UserInfoDAO();
