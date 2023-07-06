import RedisDatabase from './redisDatabase';

class CacheService {
    database: RedisDatabase;
  constructor(database: RedisDatabase) {
    this.database = database;
  }

  async get(key: string) {
    const cacheData = await this.database.get(key);
    return cacheData? JSON.parse(cacheData) : null;
  }

  async set(key: string, value: any, ttl: number = 86400) {  // TTL is in seconds, by default 1 day
    await this.database.set(key, JSON.stringify(value), ttl);
  }
}

export default new CacheService(new RedisDatabase());
