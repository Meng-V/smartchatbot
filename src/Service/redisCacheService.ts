import Redis from 'ioredis';

class RedisCacheService {
  private redisClient: Redis;

  constructor() {
    // Connect to Redis. Update this with your actual Redis connection details
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD
    });
  }

  // Store data to Redis. Data is stored as a string
  async set(key: string, value: any) {
    try {
      await this.redisClient.set(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting value in Redis: ${error}`);
    }
  }

  // Get data from Redis. Retrieved data is parsed back into its original form
  async get(key: string): Promise<any> {
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting value from Redis: ${error}`);
    }

    return null;
  }
}

export default RedisCacheService;
