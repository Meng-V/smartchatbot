import {createClient} from 'redis';
import { promisify } from 'util';

class RedisDatabase {
  client: any;
  getAsync: (key: string) => Promise<string | null>;
  setAsync: (key: string, value: string) => Promise<void>;

  constructor() {
    this.client = createClient();
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
  }

  async get(key: string): Promise<string | null> {
    return this.getAsync(key);
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    this.client.expires(ttl);
    await this.setAsync(key, value);
  }
}

export default RedisDatabase;
