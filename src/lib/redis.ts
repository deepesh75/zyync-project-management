import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  // Return null if no Redis URL is configured (optional Redis)
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not configured - caching disabled');
    return null;
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  return redis;
}

// Cache helper functions
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const cached = await client.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCached(
  key: string,
  value: any,
  ttlSeconds: number = 60
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Redis invalidate error:', error);
  }
}

export async function invalidateCacheKeys(keys: string[]): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Redis invalidate keys error:', error);
  }
}
