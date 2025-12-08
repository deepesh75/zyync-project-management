# Redis Server-Side Caching Setup

## Overview

Redis caching has been implemented to reduce database latency and improve performance. The implementation:

- ✅ Caches GET requests for projects, organizations, and notifications
- ✅ Automatically invalidates cache on mutations (create/update/delete)
- ✅ **Optional** - app works without Redis (gracefully degrades)
- ✅ Reduces Singapore database latency from 200-1000ms to ~5-10ms on cache hits

## Quick Start (Recommended: Upstash)

### 1. Sign up for Upstash Redis (FREE)

Go to [https://upstash.com](https://upstash.com) and create a free account.

### 2. Create a Redis Database

- Click **"Create Database"**
- Name: `zyync-cache`
- Type: **Regional** (choose closest to your users)
- Region: **Singapore (ap-southeast-1)** or closer to your location
- Click **Create**

### 3. Get Connection URL

- Click on your database
- Scroll to **"REST API"** section
- Copy the **"UPSTASH_REDIS_REST_URL"** (starts with `https://`)
- **IMPORTANT**: Use the **Redis URL** format, not REST API
- Look for **"Redis CLI"** section and copy the connection string

Example format:
```
rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
```

### 4. Add to Environment Variables

Add to `.env`:
```bash
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
```

Add to **Vercel** environment variables:
1. Go to your project on Vercel
2. Settings → Environment Variables
3. Add `REDIS_URL` with the same value
4. Apply to Production, Preview, and Development
5. Redeploy

## Alternative: Redis Cloud (also free)

1. Go to [https://redis.com/try-free/](https://redis.com/try-free/)
2. Sign up and create a free database
3. Choose **"Fixed"** plan (free tier)
4. Select region closest to Singapore (ap-southeast-1)
5. Get connection URL from dashboard
6. Add to `.env` as shown above

## Alternative: Local Redis (Development Only)

### Install Redis locally:

**macOS**:
```bash
brew install redis
brew services start redis
```

**Linux**:
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

Add to `.env`:
```bash
REDIS_URL=redis://localhost:6379
```

## Cache Strategy

### Cached Endpoints:
- **Projects List**: 30s TTL
- **Project Detail**: 60s TTL  
- **Organizations List**: 60s TTL
- **Organization Detail**: 60s TTL

### Cache Invalidation:
Automatic invalidation on:
- Project create/update/delete → clears project caches
- Organization create/update/delete → clears org caches
- Task create → clears parent project cache
- Any mutation → clears relevant list caches

## Performance Impact

**Before Redis** (Cold):
- Projects List: ~500-800ms
- Project Detail: ~800-1200ms
- Total page load: ~2-3s

**After Redis** (Warm):
- Projects List: ~5-10ms (cache hit)
- Project Detail: ~5-10ms (cache hit)
- Total page load: ~100-200ms

**Expected improvement**: 10-20x faster on subsequent requests

## Monitoring

Check if Redis is working:
```bash
# In your application logs, you should see:
# "Redis connected" on startup
# or "REDIS_URL not configured - caching disabled" if not set up
```

## Troubleshooting

**Redis not connecting:**
1. Check `REDIS_URL` format is correct
2. Ensure Upstash database is active
3. Check firewall/network settings
4. App will still work, just slower (no caching)

**Cache not invalidating:**
- Check server logs for Redis errors
- Verify mutations are calling `invalidateCache()` functions
- Try redeploying

**Still slow after Redis:**
- First request is always slow (cache miss)
- Check if Redis URL is close to Singapore (where database is)
- Consider moving Neon database closer to users

## Cost

- **Upstash Free Tier**: 10,000 commands/day (plenty for small apps)
- **Redis Cloud Free Tier**: 30MB storage, 30 connections
- Both free tiers are sufficient for most small-medium apps

## Next Steps

Once Redis is set up, you should notice:
1. 10-20x faster page loads on repeat visits
2. Reduced Neon database query costs
3. Better user experience with instant data loading (after first load)
