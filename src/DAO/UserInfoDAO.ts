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
  private generatorSaveUserInfoValue(password: string, role: string) {
    return JSON.stringify({ password, role });
  }

  async saveUserInfo(userId: string, password: string, role: string) {
    try {
      const userInfoKey = this.generatorSaveUserInfoKey(userId);
      const userInfoValue = this.generatorSaveUserInfoValue(password, role);
      await this.client.set(userInfoKey, userInfoValue);
      return { ok: true };
    } catch (error) {
      console.error('saveUserInfo error:', error);
      return { ok: false, errorMessage: 'saveUserInfo error' };
    }
  }
  async getUserInfo(userId: string) {
    try {
      const userInfoKey = this.generatorSaveUserInfoKey(userId);
      const userInfoValue = await this.client.get(userInfoKey);
      const userInfoJson = JSON.parse(userInfoValue);
      return userInfoValue
        ? { ok: true, data: { ...userInfoJson, userId } }
        : { ok: false };
    } catch (error) {
      console.error('getUserInfo error:', error);
      return { ok: false, errorMessage: 'getUserInfo error' };
    }
  }
  async delUserInfo(userId: string) {
    try {
      const userInfoKey = this.generatorSaveUserInfoKey(userId);
      await this.client.del(userInfoKey);
      return { ok: true };
    } catch (error) {
      console.error('delUserInfo error:', error);
      return { ok: false, errorMessage: 'delUserInfo error' };
    }
  }
}
export const userInfoDAO = new UserInfoDAO();
