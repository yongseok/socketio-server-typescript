import { RedisClientType } from 'redis';

class RedisWrapper {
  private client: RedisClientType;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  async sadd(key: string, value: string): Promise<number> {
    try {
      return this.client.sAdd(key, value);
    } catch (error) {
      console.error('Error occurred while adding value in Redis:', error);
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return this.client.sMembers(key);
    } catch (error) {
      console.error('Error occurred while getting value in Redis:', error);
      throw error;
    }
  }

  async srem(key: string, value: string): Promise<number> {
    try {
      return this.client.sRem(key, value);
    } catch (error) {
      console.error('Error occurred while deleting value in Redis:', error);
      throw error;
    }
  }

  async zadd(key: string, score: number, value: string): Promise<number> {
    try {
      return this.client.zAdd(key, { score, value });
    } catch (error) {
      console.error('Error occurred while adding value in Redis:', error);
      throw error;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return this.client.zRange(key, start, stop);
    } catch (error) {
      console.error('Error occurred while getting value in Redis:', error);
      throw error;
    }
  }

  async zrem(key: string, value: string): Promise<number> {
    try {
      return this.client.zRem(key, value);
    } catch (error) {
      console.error('Error occurred while deleting value in Redis:', error);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return this.client.del(key);
    } catch (error) {
      console.error('Error occurred while deleting value in Redis:', error);
      throw error;
    }
  }
}

export { RedisWrapper };
